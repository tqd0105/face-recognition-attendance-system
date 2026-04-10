# Backend <-> AI API Contract

Status: Draft v1 (implementation-ready)

This document freezes the request and response contract for:
1. Frontend -> Backend APIs used by enrollment and realtime attendance.
2. Backend -> AI Service internal APIs.

Scope rules:
1. Frontend never calls AI Service directly.
2. Backend is responsible for business rules and DB writes.
3. AI Service is responsible for face processing only.

## 1. Common Conventions

Base paths:
1. Backend public API: /api
2. AI Service internal API: /ai

Authentication:
1. Frontend -> Backend: Authorization: Bearer <jwt>
2. Backend -> AI: X-Service-Token: <AI_SERVICE_TOKEN>

Content types:
1. JSON endpoints: application/json
2. Face image upload endpoint: multipart/form-data

Standard success envelope (Backend public APIs):
```json
{
  "success": true,
  "message": "Optional human readable message",
  "data": {}
}
```

Standard error envelope (Backend and AI):
```json
{
  "success": false,
  "error_code": "MACHINE_READABLE_CODE",
  "message": "Human readable message",
  "details": {}
}
```

Recommended HTTP mapping:
1. 400: invalid input
2. 401: auth failure
3. 403: permission denied
4. 404: not found
5. 409: duplicate/conflict
6. 422: semantic validation (image has no face, multiple faces)
7. 500: unexpected server error

## 2. Frontend -> Backend Contract

### 2.1 POST /api/biometrics/enroll

Purpose:
1. Register or add a face embedding for one student.

Request (multipart/form-data):
1. student_id: number (required)
2. image: file (required, jpeg/png)
3. source: string (optional, default "webcam")

Backend behavior:
1. Validate student exists and active.
2. Call AI POST /ai/encode.
3. Save embedding into Face_embeddings(student_id, embedding, quality_score).

Success 201:
```json
{
  "success": true,
  "message": "Face enrolled successfully",
  "data": {
    "student_id": 12,
    "embedding_id": 91,
    "quality_score": 0.97,
    "face_bbox": [110, 80, 260, 240]
  }
}
```

Error codes:
1. STUDENT_NOT_FOUND (404)
2. INVALID_IMAGE (400)
3. NO_FACE_DETECTED (422)
4. MULTIPLE_FACES (422)
5. AI_UNAUTHORIZED (502 mapped from AI 401)
6. AI_TIMEOUT (504)

### 2.2 GET /api/biometrics/student/:student_id

Purpose:
1. Check whether student has at least one embedding.

Success 200:
```json
{
  "success": true,
  "data": {
    "student_id": 12,
    "has_biometrics": true,
    "embedding_count": 3,
    "latest_quality_score": 0.93,
    "last_enrolled_at": "2026-03-31T10:15:10.000Z"
  }
}
```

### 2.3 PATCH /api/sessions/:id/start

Purpose:
1. Start session and warm AI cache.

Backend behavior:
1. Validate session exists and is scheduled.
2. Query enrolled students and embeddings for that course_class.
3. Build items array: [{ student_id: "12", embedding: [..512 floats..] }].
4. Call AI POST /ai/load-embeddings.
5. Update Session.status = active.

Success 200:
```json
{
  "success": true,
  "message": "Session started",
  "data": {
    "session_id": 1001,
    "status": "active",
    "loaded_count": 37,
    "embedding_dim": 512
  }
}
```

Error codes:
1. SESSION_NOT_FOUND (404)
2. INVALID_SESSION_STATE (409)
3. NO_ENROLLED_STUDENTS (400)
4. NO_FACE_EMBEDDINGS (400)
5. AI_LOAD_FAILED (502)

### 2.4 PATCH /api/sessions/:id/stop

Purpose:
1. Stop session and release AI cache.

Backend behavior:
1. Validate session exists and is active.
2. Call AI POST /ai/unload-embeddings.
3. Update Session.status = completed.

Success 200:
```json
{
  "success": true,
  "message": "Session stopped",
  "data": {
    "session_id": 1001,
    "status": "completed",
    "released": true
  }
}
```

### 2.5 POST /api/attendance/recognize

Purpose:
1. Recognize faces from a frame and mark attendance automatically.

Request JSON:
```json
{
  "session_id": 1001,
  "image_base64": "data:image/jpeg;base64,/9j/4AAQSk...",
  "min_similarity": 0.6,
  "top_k": 1
}
```

Backend behavior:
1. Validate session is active.
2. Call AI POST /ai/recognize.
3. For each recognized student_id with status=matched:
4. Apply anti-duplicate rule by UNIQUE(session_id, student_id).
5. Compute status present/late from grace window.
6. Insert or upsert attendance.

Success 200:
```json
{
  "success": true,
  "data": {
    "session_id": 1001,
    "recognized": [
      {
        "student_id": 12,
        "similarity": 0.81,
        "attendance_status": "present",
        "inserted": true
      }
    ],
    "unknown": [
      {
        "bbox": [34, 56, 120, 160],
        "similarity": 0.41
      }
    ]
  }
}
```

Error codes:
1. SESSION_NOT_FOUND (404)
2. SESSION_NOT_ACTIVE (409)
3. INVALID_IMAGE (400)
4. SESSION_NOT_LOADED (409 from AI 404)
5. AI_RECOGNIZE_FAILED (502)

## 3. Backend -> AI Service Contract

AI requires header: X-Service-Token.

### 3.1 POST /ai/encode

Request (multipart/form-data):
1. student_id: string (required)
2. image: file (required)

Success 200:
```json
{
  "success": true,
  "student_id": "12",
  "embedding": [0.01, -0.03, 0.07],
  "dim": 512,
  "quality_score": 0.97,
  "face_bbox": [110, 80, 260, 240]
}
```

Known errors:
1. UNAUTHORIZED (401)
2. INVALID_IMAGE (400)
3. NO_FACE_DETECTED (422)
4. MULTIPLE_FACES (422)

### 3.2 POST /ai/load-embeddings

Request JSON:
```json
{
  "session_id": "1001",
  "items": [
    {
      "student_id": "12",
      "embedding": [0.1, 0.2, 0.3]
    }
  ]
}
```

Success 200:
```json
{
  "success": true,
  "session_id": "1001",
  "loaded_count": 37,
  "dim": 512
}
```

Known errors:
1. EMPTY_ITEMS (400)
2. UNAUTHORIZED (401)

### 3.3 POST /ai/recognize

Request JSON:
```json
{
  "session_id": "1001",
  "image_base64": "data:image/jpeg;base64,/9j/4AAQSk...",
  "top_k": 1,
  "min_similarity": 0.6
}
```

Success 200:
```json
{
  "success": true,
  "session_id": "1001",
  "results": [
    {
      "student_id": "12",
      "similarity": 0.81,
      "bbox": [110, 80, 260, 240],
      "status": "matched"
    },
    {
      "student_id": null,
      "similarity": 0.41,
      "bbox": [34, 56, 120, 160],
      "status": "unknown"
    }
  ]
}
```

Known errors:
1. SESSION_NOT_LOADED (404)
2. INVALID_IMAGE (400)
3. UNAUTHORIZED (401)

### 3.4 POST /ai/unload-embeddings

Request JSON:
```json
{
  "session_id": "1001"
}
```

Success 200:
```json
{
  "success": true,
  "session_id": "1001",
  "released": true
}
```

## 4. Data Validation Rules

Enrollment image:
1. Exactly one face required.
2. Reject images larger than team-agreed max size.
3. Accept jpeg/png only.

Recognition frame:
1. image_base64 must include valid data payload.
2. session_id must reference active session.

Embedding:
1. embedding dimension must be consistent with DB schema vector(512).
2. If AI returns non-512, backend rejects and logs AI_DIMENSION_MISMATCH.

## 5. Logging and Traceability

Required backend logs per request:
1. request_id
2. teacher_id
3. session_id (if any)
4. ai_endpoint
5. ai_latency_ms
6. ai_status_code

Recommended response header:
1. X-Request-Id for cross-service tracing.

## 6. Minimal Acceptance Tests

1. Enroll valid face image -> 201 and one Face_embeddings row created.
2. Enroll image with no face -> 422 NO_FACE_DETECTED.
3. Start session with embeddings -> active + loaded_count > 0.
4. Recognize known student in active session -> attendance created.
5. Recognize on stopped session -> 409 SESSION_NOT_ACTIVE.
6. Stop session -> completed + released=true.
7. Recognize after stop -> 409 SESSION_NOT_LOADED.
