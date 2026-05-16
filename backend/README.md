# face-recognition-backend

Backend API for the Face Recognition Attendance System.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Configure `.env` (minimum):

- `PORT=5000`
- `JWT_SECRET=<your_secret>`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `AI_SERVICE_URL=http://localhost:8000`
- `AI_SERVICE_TOKEN=<must match AI service token>`
- `ADMIN_SEED_EMAIL=admin@ut.edu.vn`
- `ADMIN_SEED_PASSWORD=123456`
- `SESSION_LIFECYCLE_INTERVAL_MS=15000`
- `SESSION_TIMEZONE=Asia/Ho_Chi_Minh`

## Database Import

Import schema from this repo's `database.sql`:

```bash
psql -U <db_user> -d <db_name> -f database.sql
```

The SQL file contains the latest schema used by current backend features, including:

- role-based auth support
- teacher/admin roles stored in `Teacher.role`
- student credentials (`password_hash`)
- session and attendance tables/constraints

## Run

```bash
npm start
```

API base URL: `http://localhost:5000`

## Health Check

```bash
curl http://localhost:5000/api/health/services
```

## Attendance Liveness

Realtime recognition endpoints require multi-frame liveness proof by default:

- `POST /api/attendance/recognize`
- `POST /api/attendance/check-in-one-face`

Clients should send the normal `image_base64` used for recognition plus `liveness_frames`, an array of recent camera frame base64 strings captured while the user turns their head slightly left or right.

```json
{
  "session_id": 1,
  "image_base64": "data:image/jpeg;base64,...",
  "liveness_frames": [
    "data:image/jpeg;base64,...",
    "data:image/jpeg;base64,...",
    "data:image/jpeg;base64,...",
    "data:image/jpeg;base64,..."
  ]
}
```

Set `ATTENDANCE_REQUIRE_LIVENESS=false` only for local debugging or automated tests.

## Session Auto Start/Stop

The backend has a lifecycle scheduler that automatically:

- starts `scheduled` sessions when local session time reaches `start_time`
- completes `active` sessions when local session time reaches `end_time`
- cancels `scheduled` sessions that fully pass their end time without starting

Use these environment variables to control the scheduler:

- `SESSION_LIFECYCLE_INTERVAL_MS` how often the job runs, default `15000`
- `SESSION_TIMEZONE` timezone used when comparing `session_date + start_time/end_time`, default `Asia/Ho_Chi_Minh`
