# Database Design

## Tables

### students
- id
- student_code
- name
- class_id
- created_at

### classes
- id
- class_name

### sessions
- id
- class_id
- start_time
- end_time
- status

### attendance
- id
- session_id
- student_id
- checkin_time

### face_embeddings
- id
- student_id
- embedding (vector)
- created_at

## Relationships

Class → Students
Class → Sessions
Session → Attendance
Student → Face Embeddings