from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    ai_service_token: str = Field(default='change_me', alias='AI_SERVICE_TOKEN')
    ai_recognition_threshold: float = Field(default=0.6, alias='AI_RECOGNITION_THRESHOLD')
    ai_top_k: int = Field(default=1, alias='AI_TOP_K')
    ai_require_token: bool = Field(default=True, alias='AI_REQUIRE_TOKEN')
    ai_liveness_min_frames: int = Field(default=4, alias='AI_LIVENESS_MIN_FRAMES')
    ai_liveness_min_pose_change: float = Field(default=0.06, alias='AI_LIVENESS_MIN_POSE_CHANGE')
    ai_liveness_min_quality: float = Field(default=0.5, alias='AI_LIVENESS_MIN_QUALITY')
    ai_liveness_same_face_similarity: float = Field(default=0.45, alias='AI_LIVENESS_SAME_FACE_SIMILARITY')


settings = Settings()
