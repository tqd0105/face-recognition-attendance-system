# System Architecture

## Overview
The Face Recognition Attendance System is a web-based system that automatically records student attendance using face recognition technology and a webcam.

## System Components
The system consists of four main components:

1. Frontend (NextJS)
2. Backend API (NodeJS Express)
3. AI Service (Python FastAPI with InsightFace)
4. Database (PostgreSQL)

## Architecture Diagram

Frontend (NextJS)
        |
        |
Backend (NodeJS Express + Socket)
        |
        |
AI Service (Python FastAPI + InsightFace)
        |
        |
PostgreSQL Database

## System Flow

1. Webcam captures image from frontend
2. Frontend sends image to Backend
3. Backend sends image to AI Service
4. AI Service detects and recognizes faces
5. AI Service returns student IDs
6. Backend stores attendance into database
7. Backend sends realtime update via socket
8. Frontend displays attendance result