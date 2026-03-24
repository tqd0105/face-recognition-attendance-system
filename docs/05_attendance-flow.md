# Attendance Flow

1. Session Initialization: Lecturer starts the session via the Web Portal.
2. Data Caching (Crucial for Speed): Backend queries the PostgreSQL database for the face embeddings of all students enrolled in this specific course_class and loads them into the AI Service's RAM.
3. Frame Capture: Frontend (Webcam) continuously captures video frames at a set interval (e.g., 2-3 frames per second).
4. Real-time Transmission: Frontend transmits these frames to the Backend via WebSocket (Socket.io) to ensure low latency and avoid HTTP overhead.
5. AI Processing: Backend forwards the frames to the Python AI Service.
6. Face Recognition: AI detects faces, extracts embeddings, and compares them only against the cached embeddings in RAM. It returns a list of recognized student_ids.
7. Anti-Spam Validation (Debounce): Backend receives the student_ids and checks if they have already been marked present for this specific session_id. If yes, it ignores the duplicate request.
8. Database Insertion: For valid students, Backend calculates their status ("Present" or "Late" based on the start time) and inserts the record into the attendance table.
9. Real-time Feedback: Backend broadcasts the attendance result back to the Frontend via WebSocket.
10. UI Update: Frontend displays a real-time visual popup (e.g., Green box with Student Name and Status) on the lecturer's dashboard.