# AI Project Prompt

You are working on a Face Recognition Attendance System.

Before implementing any feature, you must read the project documentation in the docs folder.

Read the documentation in this order:
1. PROJECT_CONTEXT.md
2. 01_system-architecture.md
3. 02_database-design.md
4. 03_api-design.md
5. 04_ai-module.md
6. 05_attendance-flow.md
7. 06_project-structure.md
8. 07_git-workflow.md

Always follow the system architecture and database design.
Do not change the tech stack.
Do not change the architecture without explanation.

Project Tech Stack:
- Frontend: NextJS
- Backend: NodeJS Express
- AI Service: Python FastAPI + InsightFace
- Database: PostgreSQL

System Architecture:
Frontend → Backend → AI Service → Database

Rules:
- Backend handles business logic and database
- AI service handles face recognition only
- Frontend handles UI and webcam
- Frontend never calls AI service directly
- Backend always communicates with AI service
- Prevent duplicate attendance
- Follow RESTful API design
- Follow project structure
- Explain logic before writing code