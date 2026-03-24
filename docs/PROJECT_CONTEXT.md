# PROJECT CONTEXT – Face Recognition Attendance System

## Project Overview
This project is a Face Recognition Attendance System that automatically records student attendance using face recognition and a webcam.

## Tech Stack
Frontend: NextJS
Backend: NodeJS Express
AI Service: Python FastAPI + InsightFace
Database: PostgreSQL
Realtime: Socket.io

## System Architecture
Frontend → Backend → AI Service → Database

## Main Modules
1. Student Management
2. Face Enrollment
3. Session Management
4. Realtime Attendance
5. Attendance Report

## Face Recognition Pipeline
Image → Face Detection → Face Embedding → Cosine Similarity → Student Identification

## Database Tables
students
classes
sessions
attendance
face_embeddings

## Important Rules
- Backend handles business logic and database
- AI Service handles face recognition only
- Frontend handles webcam and UI
- Attendance must prevent duplicate records