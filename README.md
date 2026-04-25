# face-recognition-attendance-system

Face Recognition Attendance System (Frontend + AI service integration docs).

This guide helps a teammate run the project locally with PostgreSQL.

## 1. Tech Stack

- Frontend: Next.js + TypeScript
- Backend API: Node.js + Express + PostgreSQL
- AI service: FastAPI + InsightFace
- Auth: JWT (role-based: teacher/admin/student)

## 2. Repositories and Folders

Typical local layout used by this project:

```text
/home/<user>/Applications/
	face-recognition-attendance-system/   # this repo (frontend + ai-service + docs)
	face-recognition-backend/backend/     # backend API repo
```

If your layout is different, adjust paths in commands below.

## 3. Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 14+
- `npm`, `pip`

## 4. Setup Environment Files

### Frontend

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

### Backend

In backend repo:

```bash
cp .env.example .env
```

Set at least:

- `PORT=5000`
- `JWT_SECRET=<your_secret>`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `AI_SERVICE_URL=http://localhost:8000`
- `AI_SERVICE_TOKEN=<same token as AI service>`
- `ADMIN_EMAILS=anhnv@ut.edu.vn`

### AI Service

In `ai-service`, create `.env` if needed and ensure token matches backend:

- `AI_REQUIRE_TOKEN=true`
- `AI_SERVICE_TOKEN=<same token as backend>`

## 5. Import Local Database (Important)

Use the SQL schema file from backend repo:

`/home/<user>/Applications/face-recognition-backend/backend/database.sql`

Import command example:

```bash
psql -U <db_user> -d <db_name> -f /home/<user>/Applications/face-recognition-backend/backend/database.sql
```

This file includes:

- role-related tables and columns
- student password hash column
- session and attendance schema used by current API

## 6. Run Services

Open 3 terminals.

### Terminal A: Backend API

```bash
cd /home/<user>/Applications/face-recognition-backend/backend
npm install
npm start
```

Backend runs on `http://localhost:5000`.

### Terminal B: AI Service

```bash
cd /home/<user>/Applications/face-recognition-attendance-system/ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

AI service runs on `http://localhost:8000`.

### Terminal C: Frontend

```bash
cd /home/<user>/Applications/face-recognition-attendance-system/frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

## 7. Quick Health Checks

- Backend health:

```bash
curl http://localhost:5000/api/health/services
```

- AI health:

```bash
curl http://localhost:8000/health
```

- Frontend build check:

```bash
cd frontend && npm run -s build
```

## 8. Login Notes

- Teacher/Admin login via `/login` with role selector.
- Student login uses student email + password.
- Initial student password policy can be based on `student_code` depending on seeded data.

## 9. Git Workflow

- Base branch: `main`
- Integration branch: `develop`
- Feature branches: `feature/<name>`

Recommended merge flow:

1. `feature/*` -> `develop`
2. `develop` -> `main`

## 10. Commit Standards

This repository uses Conventional Commits.

See full guideline in `CONTRIBUTING.md`.

Quick format:

```text
<type>(<scope>): <short summary>
```

Examples:

```text
feat(frontend): add attendance dashboard layout
fix(backend): validate student id before check-in
docs(readme): add setup steps for local development
```
