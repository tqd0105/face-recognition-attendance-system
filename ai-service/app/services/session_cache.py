from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class CachedEmbeddings:
    student_ids: list[str]
    matrix: np.ndarray


class SessionEmbeddingCache:
    def __init__(self) -> None:
        self._store: dict[str, CachedEmbeddings] = {}

    def load(self, session_id: str, items: list[tuple[str, list[float]]]) -> int:
        student_ids: list[str] = []
        vectors: list[np.ndarray] = []

        for student_id, embedding in items:
            vector = np.asarray(embedding, dtype=np.float32)
            if vector.ndim != 1 or vector.size == 0:
                continue

            norm = float(np.linalg.norm(vector))
            if not np.isfinite(norm) or norm <= 0.0:
                continue

            student_ids.append(student_id)
            vectors.append(vector / norm)

        matrix = np.vstack(vectors).astype(np.float32, copy=False) if vectors else np.empty((0, 0), dtype=np.float32)
        self._store[session_id] = CachedEmbeddings(student_ids=student_ids, matrix=matrix)
        return len(student_ids)

    def unload(self, session_id: str) -> bool:
        return self._store.pop(session_id, None) is not None

    def get(self, session_id: str) -> CachedEmbeddings | None:
        return self._store.get(session_id)


session_cache = SessionEmbeddingCache()
