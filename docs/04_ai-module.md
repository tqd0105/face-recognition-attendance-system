# AI Module Design

## Face Recognition Pipeline

The face recognition process includes the following steps:

1. Face Detection
2. Face Alignment
3. Face Embedding Extraction
4. Cosine Similarity Matching
5. Identity Prediction

## Recognition Flow

Image
→ Detect Face
→ Extract Embedding
→ Compare Embeddings
→ Return Student ID

## Embedding Storage

Each student's face embedding will be stored in the database.
During recognition, the system compares new embeddings with stored embeddings using cosine similarity.

If similarity > threshold → same person
Else → unknown person