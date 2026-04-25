#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
TOKEN="${TOKEN:-change_me}"
IMAGE_PATH="${IMAGE_PATH:-./sample.jpg}"
SESSION_ID="${SESSION_ID:-sess_local_demo}"
STUDENT_ID="${STUDENT_ID:-stu_demo_001}"

if [[ ! -f "$IMAGE_PATH" ]]; then
  echo "Image not found: $IMAGE_PATH"
  echo "Usage: IMAGE_PATH=/absolute/path/to/face.jpg TOKEN=change_me ./scripts/smoke_test.sh"
  exit 1
fi

echo "[1/6] Health check"
curl -sS "$BASE_URL/health" | /bin/python3 -m json.tool

echo "[2/6] Protected health check"
curl -sS "$BASE_URL/health/protected" \
  -H "X-Service-Token: $TOKEN" | /bin/python3 -m json.tool

echo "[3/6] Encode"
ENCODE_JSON=$(curl -sS -X POST "$BASE_URL/ai/encode" \
  -H "X-Service-Token: $TOKEN" \
  -F "student_id=$STUDENT_ID" \
  -F "image=@$IMAGE_PATH")

echo "$ENCODE_JSON" | /bin/python3 -m json.tool
EMBEDDING=$(/bin/python3 -c "import json,sys; d=json.loads(sys.stdin.read()); print(json.dumps(d['embedding']))" <<< "$ENCODE_JSON")

cat > /tmp/ai_load_payload.json <<EOF
{
  "session_id": "$SESSION_ID",
  "items": [
    {
      "student_id": "$STUDENT_ID",
      "embedding": $EMBEDDING
    }
  ]
}
EOF

echo "[4/6] Load embeddings"
curl -sS -X POST "$BASE_URL/ai/load-embeddings" \
  -H "X-Service-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  --data @/tmp/ai_load_payload.json | /bin/python3 -m json.tool

IMG_B64=$(/bin/python3 -c "import base64,sys; print(base64.b64encode(open(sys.argv[1],'rb').read()).decode())" "$IMAGE_PATH")
cat > /tmp/ai_recognize_payload.json <<EOF
{
  "session_id": "$SESSION_ID",
  "image_base64": "$IMG_B64",
  "top_k": 1,
  "min_similarity": 0.6
}
EOF

echo "[5/6] Recognize"
curl -sS -X POST "$BASE_URL/ai/recognize" \
  -H "X-Service-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  --data @/tmp/ai_recognize_payload.json | /bin/python3 -m json.tool

cat > /tmp/ai_unload_payload.json <<EOF
{
  "session_id": "$SESSION_ID"
}
EOF

echo "[6/6] Unload embeddings"
curl -sS -X POST "$BASE_URL/ai/unload-embeddings" \
  -H "X-Service-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  --data @/tmp/ai_unload_payload.json | /bin/python3 -m json.tool

echo "Smoke test completed."
