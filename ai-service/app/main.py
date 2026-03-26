from fastapi import Depends, FastAPI

from app.api.routes import router as ai_router
from app.core.security import verify_service_token

app = FastAPI(title='Face Recognition AI Service', version='0.1.0')


@app.get('/health')
async def health() -> dict:
    return {'success': True, 'status': 'ok'}


@app.get('/health/protected', dependencies=[Depends(verify_service_token)])
async def health_protected() -> dict:
    return {'success': True, 'status': 'ok'}


app.include_router(ai_router)
