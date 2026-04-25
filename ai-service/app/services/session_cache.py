class SessionEmbeddingCache:
    def __init__(self) -> None:
        self._store: dict[str, dict[str, list[float]]] = {}

    def load(self, session_id: str, items: list[tuple[str, list[float]]]) -> int:
        self._store[session_id] = {student_id: embedding for student_id, embedding in items}
        return len(items)

    def unload(self, session_id: str) -> bool:
        return self._store.pop(session_id, None) is not None

    def get(self, session_id: str) -> dict[str, list[float]] | None:
        return self._store.get(session_id)


session_cache = SessionEmbeddingCache()
