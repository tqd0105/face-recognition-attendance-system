# AI Service (FastAPI + InsightFace)

Internal AI service for face encoding and recognition.

## Endpoints

- `POST /ai/encode`
- `POST /ai/load-embeddings`
- `POST /ai/recognize`
- `POST /ai/unload-embeddings`
- `GET /health`

## Run

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Quick Smoke Test

1. Start service with token:

```bash
AI_SERVICE_TOKEN=change_me /bin/python3 -m uvicorn app.main:app --reload --port 8000
```

2. Run smoke test script from `ai-service`:

```bash
chmod +x scripts/smoke_test.sh
IMAGE_PATH=/absolute/path/to/face.jpg TOKEN=change_me ./scripts/smoke_test.sh
```

Detailed guide: `docs/11_ai-service-smoke-test.md`

## Notes

- This service must be called by backend only.
- Frontend must never call this service directly.
- Business logic (attendance rules, duplicate prevention) belongs to backend.
