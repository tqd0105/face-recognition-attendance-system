#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5000}"
TOKEN="${TOKEN:-}"
SESSION_ID="${SESSION_ID:-}"
IMAGE_PATH="${IMAGE_PATH:-}"

if [[ -z "$TOKEN" || -z "$SESSION_ID" || -z "$IMAGE_PATH" ]]; then
  echo "Usage: TOKEN=<jwt> SESSION_ID=<id> IMAGE_PATH=/absolute/path/to/face.jpg [BASE_URL=http://localhost:5000] ./scripts/smoke_session_lifecycle.sh"
  exit 1
fi

if [[ ! -f "$IMAGE_PATH" ]]; then
  echo "Image not found: $IMAGE_PATH"
  exit 1
fi

AUTH_HEADER="Authorization: Bearer $TOKEN"
IMG_B64=$(/bin/python3 -c "import base64,sys; print(base64.b64encode(open(sys.argv[1],'rb').read()).decode())" "$IMAGE_PATH")

echo "[1/5] Start session"
START_RESPONSE=$(curl -sS -X PATCH "$BASE_URL/api/sessions/$SESSION_ID/start" -H "$AUTH_HEADER")
echo "$START_RESPONSE" | /bin/python3 -m json.tool

echo "[2/5] Recognize while active (should be 200 or 422 depending on image quality)"
RECOG_ACTIVE_HTTP=$(curl -sS -o /tmp/reco_active.json -w "%{http_code}" -X POST "$BASE_URL/api/attendance/recognize" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  --data "{\"session_id\":$SESSION_ID,\"image_base64\":\"$IMG_B64\",\"min_similarity\":0.6}")
echo "HTTP $RECOG_ACTIVE_HTTP"
cat /tmp/reco_active.json | /bin/python3 -m json.tool || cat /tmp/reco_active.json

echo "[3/5] Stop session"
STOP_RESPONSE=$(curl -sS -X PATCH "$BASE_URL/api/sessions/$SESSION_ID/stop" -H "$AUTH_HEADER")
echo "$STOP_RESPONSE" | /bin/python3 -m json.tool

echo "[4/5] Recognize after stop (should fail clearly with session not active)"
RECOG_STOP_HTTP=$(curl -sS -o /tmp/reco_stop.json -w "%{http_code}" -X POST "$BASE_URL/api/attendance/recognize" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  --data "{\"session_id\":$SESSION_ID,\"image_base64\":\"$IMG_B64\",\"min_similarity\":0.6}")
echo "HTTP $RECOG_STOP_HTTP"
cat /tmp/reco_stop.json | /bin/python3 -m json.tool || cat /tmp/reco_stop.json

if [[ "$RECOG_STOP_HTTP" != "400" ]]; then
  echo "Expected recognize-after-stop to return HTTP 400, got $RECOG_STOP_HTTP"
  exit 2
fi

echo "[5/5] Start again after completed (restart check)"
RESTART_RESPONSE=$(curl -sS -X PATCH "$BASE_URL/api/sessions/$SESSION_ID/start" -H "$AUTH_HEADER")
echo "$RESTART_RESPONSE" | /bin/python3 -m json.tool

echo "Smoke lifecycle test completed successfully."
