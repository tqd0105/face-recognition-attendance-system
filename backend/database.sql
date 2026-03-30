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
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    teacher_id INTEGER REFERENCES Teacher(id) ON DELETE SET NULL,
    semester VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Enrollments (
    student_id INTEGER REFERENCES Student(id) ON DELETE CASCADE,
    course_class_id INTEGER REFERENCES Course_classes(id) ON DELETE CASCADE,
    PRIMARY KEY (student_id, course_class_id)
);

CREATE TABLE IF NOT EXISTS Session (
    id SERIAL PRIMARY KEY,
    course_class_id INTEGER REFERENCES Course_classes(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status session_status DEFAULT 'scheduled', 
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
