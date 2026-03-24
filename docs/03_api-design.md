# API Design

## Authentication (Lecturer/Admin)
The system must be secure; lecturers must log in to access their classes.
- POST /auth/login: Lecturer/Admin login (accepts email/password, returns a JWT token).
- GET /auth/me: Retrieve the profile of the currently logged-in user based on the token.

## Academic Management
- GET /home-classes: Retrieve the list of home classes (supports pagination and filtering by faculty/major).
- POST /home-classes: Create a new home class.
- GET /course-classes: Retrieve the list of course classes (supports filtering by teacher_id so lecturers only see their own classes).
- GET /course-classes/:id: Get details of a specific course class.
- POST /course-classes: Create a new course class.

## Student & Enrollment Management
- GET /students: Retrieve the list of all students.
- POST /students: Create a new student (stored in the students table).
- PUT /students/:id: Update student information.
- DELETE /students/:id: Delete a student (soft delete).
- POST /course-classes/:id/enroll: Add a list of students to a course class (stored in the enrollments table).
- GET /course-classes/:id/students: Retrieve the list of students enrolled in a specific course class.

## Biometrics (Face Registration)
- POST /biometrics/enroll: Upload a student's face image.
(Backend receives the image, calls /ai/encode to extract the vector, then stores it in the face_embeddings table).
- GET /biometrics/student/:student_id: Check whether a student has face data in the system (returns true/false for UI warnings).

## Session Management
- GET /sessions: Retrieve the list of sessions (filter by course_class_id).
- POST /sessions: Schedule a new session in advance.
- PATCH /sessions/:id/start: (Critical) Start a session.
- This API updates status = active, retrieves all student vectors for the class, and sends them to the AI Service to load into RAM.
- PATCH /sessions/:id/stop: End a session (status = completed) and notify the AI Service to release RAM.

## Attendance
- GET /attendance/session/:session_id: Retrieve the attendance report for a specific session (shows present, late, and absent students).
- GET /attendance/student/:student_id: View attendance history of a student (used for warning or exam eligibility).
- POST /attendance/manual: Manual attendance by lecturer (used when AI cannot recognize due to poor lighting or camera issues).
- PUT /attendance/:id: Update attendance status (e.g., change from "Absent" to "Excused").

## AI Service APIs (Internal APIs - NodeJS ↔ Python Communication)
These APIs are NOT accessible by the Frontend (NextJS). They are used internally by the NodeJS backend to communicate with the FastAPI AI service.

- POST /ai/encode: Accept an image file (Base64/Multipart) → Returns a float array (128 or 512-dimensional vector).
- POST /ai/load-embeddings: NodeJS sends a JSON array [ { student_id, vector }, ... ] for the AI service to temporarily store in RAM when a session starts.
- POST /ai/recognize: NodeJS sends an image frame (may contain multiple people) + session_id → AI scans against loaded data in RAM and returns a list of recognized student_ids.
