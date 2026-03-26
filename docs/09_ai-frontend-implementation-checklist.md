# AI + Frontend Implementation Checklist (5 Days)

This checklist is for the AI and Frontend role in the Face Recognition Attendance System.

Principles:
- Frontend calls Backend only
- Backend calls AI Service
- AI Service handles face processing only
- No business logic in AI Service

## Day 1 - Freeze AI Contract + Frontend Screens

Goals:
- Freeze internal API contract between Backend and AI Service
- Freeze minimal frontend screens for demo

Tasks:
- Confirm AI endpoints: `/ai/encode`, `/ai/load-embeddings`, `/ai/recognize`, `/ai/unload-embeddings`
- Confirm response schema fields: `student_id`, `similarity`, `status`, `bbox`
- Confirm threshold initial value (example: 0.5)
- Confirm unknown-face handling rule
- Create frontend screen list:
  - Enrollment page
  - Realtime attendance page
  - Session attendance report page

Deliverables:
- API contract document updated
- UI flow draft agreed by team

## Day 2 - AI Service MVP (InsightFace)

Goals:
- Build working AI endpoints with clear validation

Tasks:
- Implement enrollment encoding endpoint:
  - Input image validation
  - Single-face requirement for enrollment
  - Return embedding + quality score
- Implement session embedding cache endpoint (`load-embeddings`)
- Implement frame recognition endpoint (`recognize`)
- Implement cache release endpoint (`unload-embeddings`)
- Add structured error codes:
  - `INVALID_IMAGE`
  - `NO_FACE_DETECTED`
  - `MULTIPLE_FACES`
  - `SESSION_NOT_LOADED`

Deliverables:
- AI service returns stable JSON for all endpoints
- Postman or curl test cases for each endpoint

## Day 3 - Frontend Integration via Backend

Goals:
- Complete frontend flow with backend APIs only

Tasks:
- Enrollment UI:
  - Webcam capture
  - Submit image to backend enrollment API
  - Show success/failure states
- Realtime attendance UI:
  - Capture frame periodically
  - Send frame to backend attendance-recognize API
  - Show recognized and unknown status
- Add loading/error states for all critical actions

Deliverables:
- End-to-end enrollment flow works
- Realtime page displays recognition results

## Day 4 - Realtime UX + Stability

Goals:
- Improve reliability and reduce false positives

Tasks:
- Add multi-frame confirmation rule (2-3 consecutive matches)
- Add short cooldown per student for popup spam control
- Add quality warning UI for bad camera/lighting
- Add graceful fallback message when recognition fails

Deliverables:
- Realtime attendance feels stable in classroom-like conditions
- Lower repeated popup noise

## Day 5 - Demo Readiness + Report Data

Goals:
- Prepare final demo and collect metrics for thesis report

Tasks:
- Test with 5-10 students and multiple lighting conditions
- Record key metrics:
  - Average recognition latency
  - Match success rate
  - Unknown false acceptance count
- Capture screenshots/video for report
- Prepare known limitations and future improvements

Deliverables:
- Demo-ready build
- Metrics table for report
- Risk/limitation notes

## Test Cases You Must Pass

- Valid enrollment image with exactly one face
- Enrollment image with no face
- Enrollment image with multiple faces
- Recognition with known student
- Recognition with unknown face
- Duplicate attendance prevention (same student, same session)
- Session stop then recognize request (must fail with clear message)

## Suggested Commit Milestones

- `feat(ai): add encode and recognize endpoints`
- `feat(ai): add session embedding cache load and unload`
- `feat(frontend): add enrollment webcam capture flow`
- `feat(frontend): add realtime attendance page`
- `feat(frontend): add recognition result states and error handling`
- `chore(test): add AI endpoint test scenarios`

## Done Criteria

- AI endpoints are stable and documented
- Frontend screens are usable for real demo
- End-to-end flow works through Backend -> AI Service
- Duplicate attendance is prevented
- Team can run a full classroom simulation demo
