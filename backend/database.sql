DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

CREATE TYPE session_status AS ENUM ('scheduled', 'active', 'completed', 'canceled');

CREATE TABLE IF NOT EXISTS Teacher (
    id SERIAL PRIMARY KEY,
    teacher_code VARCHAR(50) UNIQUE NOT NULL,
    teacher_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'teacher',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT teacher_role_check CHECK (role IN ('teacher', 'admin'))
);

CREATE TABLE IF NOT EXISTS Home_class (
    id SERIAL PRIMARY KEY,
    class_code VARCHAR(50) UNIQUE NOT NULL,
    major VARCHAR(100) NOT NULL,
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Student (
    id SERIAL PRIMARY KEY,
    student_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    parent_email VARCHAR(100),
    password_hash VARCHAR(255),
    home_class_id INTEGER REFERENCES Home_class(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Face_embeddings (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES Student(id) ON DELETE CASCADE,
    embedding vector(512), 
    quality_score FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ON Face_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE IF NOT EXISTS Course_classes (
    id SERIAL PRIMARY KEY,
    course_code VARCHAR(50) UNIQUE NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    home_class_id INTEGER REFERENCES Home_class(id) ON DELETE SET NULL,
    teacher_id INTEGER REFERENCES Teacher(id) ON DELETE SET NULL,
    semester VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Enrollments (
    id SERIAL PRIMARY KEY,                          -- ① Thêm ID riêng
    student_id INTEGER REFERENCES Student(id) ON DELETE CASCADE,
    course_class_id INTEGER REFERENCES Course_classes(id) ON DELETE CASCADE,
    enrolled_by INTEGER REFERENCES Teacher(id) ON DELETE SET NULL,  -- ② Ai đăng ký?
    status VARCHAR(20) DEFAULT 'active',            -- ③ Soft delete: 'active' hoặc 'inactive'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- ④ Khi nào đăng ký
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- ⑤ Sửa lần cuối
    UNIQUE(student_id, course_class_id, status)     -- Tránh: Cùng sinh viên, cùng lớp, cùng status
);

CREATE OR REPLACE FUNCTION set_enrolled_by_from_course_class()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.enrolled_by IS NULL THEN
        SELECT teacher_id INTO NEW.enrolled_by
        FROM Course_classes
        WHERE id = NEW.course_class_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enrollments_set_enrolled_by
BEFORE INSERT ON Enrollments
FOR EACH ROW
EXECUTE FUNCTION set_enrolled_by_from_course_class();

CREATE INDEX IF NOT EXISTS idx_enrollments_course_class_id ON Enrollments(course_class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON Enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON Enrollments(status);

CREATE TABLE IF NOT EXISTS Session (
    id SERIAL PRIMARY KEY,
    course_class_id INTEGER REFERENCES Course_classes(id) ON DELETE CASCADE,
    session_name VARCHAR(150),
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status session_status DEFAULT 'scheduled', 
    created_by INTEGER REFERENCES Teacher(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (start_time < end_time)
);

CREATE TABLE IF NOT EXISTS Attendance (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES Session(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES Student(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status attendance_status DEFAULT 'present',
    confidence_score FLOAT,
    UNIQUE(session_id, student_id) 
);

CREATE TABLE IF NOT EXISTS Notification_log (
    id SERIAL PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL,
    session_id INTEGER REFERENCES Session(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES Student(id) ON DELETE CASCADE,
    recipient_email VARCHAR(150) NOT NULL,
    recipient_role VARCHAR(20) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notification_log_status_check CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
    CONSTRAINT notification_log_recipient_role_check CHECK (recipient_role IN ('student', 'parent'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_log_unique_delivery
ON Notification_log(notification_type, session_id, student_id, recipient_email);

CREATE INDEX IF NOT EXISTS idx_notification_log_session_id ON Notification_log(session_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_student_id ON Notification_log(student_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON Notification_log(created_at);
