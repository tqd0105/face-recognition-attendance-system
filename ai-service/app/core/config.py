from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    ai_service_token: str = Field(default='change_me', alias='AI_SERVICE_TOKEN')
    ai_recognition_threshold: float = Field(default=0.6, alias='AI_RECOGNITION_THRESHOLD')
    ai_top_k: int = Field(default=1, alias='AI_TOP_K')
    ai_require_token: bool = Field(default=True, alias='AI_REQUIRE_TOKEN')


settings = Settings()
