# API Design

## Student APIs
GET /students
POST /students
PUT /students/:id
DELETE /students/:id

## Enrollment
POST /enroll
Upload face images and generate embeddings

## Session APIs
POST /sessions
POST /sessions/start
POST /sessions/stop
GET /sessions

## Attendance
POST /attendance/recognize
GET /attendance/session/:id

## AI Service APIs
POST /ai/encode
POST /ai/recognize