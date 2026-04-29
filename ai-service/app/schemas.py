from pydantic import BaseModel, Field


class EmbeddingItem(BaseModel):
    student_id: str
    embedding: list[float]


class LoadEmbeddingsRequest(BaseModel):
    session_id: str
    items: list[EmbeddingItem] = Field(default_factory=list)


class UnloadEmbeddingsRequest(BaseModel):
    session_id: str


class RecognizeRequest(BaseModel):
    session_id: str
    image_base64: str
    top_k: int = 1
    min_similarity: float = 0.6


class LivenessRequest(BaseModel):
    frames: list[str] = Field(default_factory=list)


class RecognizeResult(BaseModel):
    student_id: str | None
    similarity: float
    bbox: list[int]
    status: str


class ApiResponse(BaseModel):
    success: bool
