from fastapi import Header, HTTPException, status

from app.core.config import settings


async def verify_service_token(x_service_token: str | None = Header(default=None)) -> None:
    if not settings.ai_require_token:
        return

    if not x_service_token or x_service_token != settings.ai_service_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"success": False, "error_code": "UNAUTHORIZED", "message": "Invalid service token"},
        )
