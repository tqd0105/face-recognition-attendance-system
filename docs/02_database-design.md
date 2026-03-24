# Database Design

## Tables

### home_classes
- id(PK)
- class_code
- major
- department

### students
- id(PK)
- student_code
- name
- home_class_id
- created_at

### teachers
- id(PK)
- teacher_code
- teacher_name
- email
- password_hash

### course_classes
- id(PK)
- course_code
- course_name
- semester
- teacher_id

### enrollments
- student_id(FK)
- course_class_id(FK)

### sessions
- id(PK)
- course_class_id
- start_time
- end_time
- status(pending, active, completed)

### attendance
- id(PK)
- session_id
- student_id
- checkin_time
- status(present, late)
- confidence_score

### face_embeddings
- id(PK)
- student_id(FK)
- embedding (vector)

## Relationships
### One-to-Many Relationships (1:N)
- home_classes (1) -> (N) students: One home class contains many students. Each student belongs to exactly one home class.
- teachers (1) -> (N) course_classes: One teacher can be assigned to teach multiple course classes.
- course_classes (1) → (N) sessions: A course class consists of multiple sessions throughout the semester.
- sessions (1) → (N) attendance: Each session has multiple attendance records (corresponding to the number of participating students).
- students (1) → (N) attendance: A student has multiple attendance records across different sessions.
- students (1) → (N) face_embeddings: A student can have one or more face embedding vectors (to improve accuracy under different angles and lighting conditions).
### Many-to-Many Relationships (N:N)
- students (N) ↔ (N) course_classes: A student can enroll in multiple course classes, and each course class can have multiple students.

This relationship is resolved through a junction table called enrollments.

(students 1 → N enrollments N ← 1 course_classes)