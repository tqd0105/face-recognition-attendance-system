# AI Module Design

## Face Recognition Pipeline

The face recognition pipeline is optimized for high performance and includes the following steps:

1. Face Detection: Scans incoming frames from the camera to detect the location (bounding boxes) of one or multiple faces appearing simultaneously.
2. Face Alignment: Automatically rotates and normalizes detected faces to a frontal view, improving feature extraction accuracy.
3. Face Embedding Extraction: The aligned face is passed through a convolutional neural network (e.g., InsightFace/ResNet) to convert it into a high-dimensional vector (embedding).
4. Cosine Similarity Matching: Computes similarity scores between the extracted embedding and stored embeddings of students in the system.
5. Identity Prediction: Compares the cosine similarity score against a predefined threshold to determine the final identity.

## Real-time Recognition Flow
(This flow is designed for ultra-fast crowd attendance processing)

Frame (Image) → Detect Multiple Faces → Face Alignment → Extract n Embeddings → Compare with Session Cache (only embeddings of students in the current class) → Return List of student_ids to Backend

## Embedding Storage & Matching Strategy

1. Persistent Storage
All student face embeddings are securely stored in a PostgreSQL database (using the pgvector extension for efficient float array storage).
2. In-Memory Caching (Session-based RAM)
To achieve recognition latency under 1 second, the AI Service does NOT scan the entire database.
When a session starts, the backend preloads embeddings of students in that class into the AI Service’s RAM.
3. Threshold Tuning
The matching process follows strict error control logic:
   - If Cosine Similarity > Threshold (e.g., > 0.6) → Successful recognition (Known Student). Returns student_id.
   - If Cosine Similarity ≤ Threshold → Unknown/Stranger. The system ignores the frame to avoid false recognition (minimizing FAR – False Acceptance Rate).