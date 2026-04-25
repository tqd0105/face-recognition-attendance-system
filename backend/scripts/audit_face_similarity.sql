-- Audit potential duplicate identities by cosine similarity (latest embedding per student)
-- Usage example:
-- psql -U postgres -d fras_db -f scripts/audit_face_similarity.sql

WITH latest AS (
    SELECT DISTINCT ON (f.student_id)
        f.student_id,
        f.embedding,
        f.created_at
    FROM Face_embeddings f
    ORDER BY f.student_id, f.created_at DESC
), pairs AS (
    SELECT
        a.student_id AS student_a,
        b.student_id AS student_b,
        1 - (a.embedding <=> b.embedding) AS similarity
    FROM latest a
    JOIN latest b ON a.student_id < b.student_id
)
SELECT
    p.student_a,
    sa.student_code AS student_a_code,
    sa.name AS student_a_name,
    p.student_b,
    sb.student_code AS student_b_code,
    sb.name AS student_b_name,
    ROUND(p.similarity::numeric, 4) AS similarity
FROM pairs p
JOIN Student sa ON sa.id = p.student_a
JOIN Student sb ON sb.id = p.student_b
WHERE p.similarity >= 0.45
ORDER BY p.similarity DESC;
