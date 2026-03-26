from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.security import verify_service_token
from app.schemas import LoadEmbeddingsRequest, RecognizeRequest, UnloadEmbeddingsRequest
from app.services.face_engine import face_engine
from app.services.session_cache import session_cache

router = APIRouter(prefix='/ai', tags=['ai'], dependencies=[Depends(verify_service_token)])


@router.post('/encode')
async def encode_face(
    student_id: str = Form(...),
    image: UploadFile = File(...),
) -> dict:
    image_bytes = await image.read()

    try:
        embedding, quality_score, bbox = face_engine.encode_from_bytes(image_bytes)
    except ValueError as exc:
        error_code = str(exc)
        status_code = status.HTTP_400_BAD_REQUEST
        if error_code in {'NO_FACE_DETECTED', 'MULTIPLE_FACES'}:
            status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        raise HTTPException(
            status_code=status_code,
            detail={'success': False, 'error_code': error_code, 'message': 'Invalid enrollment image'},
        ) from exc

    return {
        'success': True,
        'student_id': student_id,
        'embedding': embedding,
        'dim': len(embedding),
        'quality_score': quality_score,
        'face_bbox': bbox,
    }


@router.post('/load-embeddings')
async def load_embeddings(payload: LoadEmbeddingsRequest) -> dict:
    if not payload.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'success': False, 'error_code': 'EMPTY_ITEMS', 'message': 'No embeddings to load'},
        )

    loaded_count = session_cache.load(
        payload.session_id,
        [(item.student_id, item.embedding) for item in payload.items],
    )

    dim = len(payload.items[0].embedding)
    return {
        'success': True,
        'session_id': payload.session_id,
        'loaded_count': loaded_count,
        'dim': dim,
    }


@router.post('/recognize')
async def recognize(payload: RecognizeRequest) -> dict:
    cached = session_cache.get(payload.session_id)
    if cached is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                'success': False,
                'error_code': 'SESSION_NOT_LOADED',
                'message': 'Session embeddings are not loaded in AI memory',
            },
        )

    try:
        image_bytes = face_engine.decode_base64_image(payload.image_base64)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={'success': False, 'error_code': 'INVALID_IMAGE', 'message': 'Invalid base64 image'},
        ) from exc

    min_similarity = payload.min_similarity or settings.ai_recognition_threshold
    results = face_engine.recognize_against_cache(
        image_bytes=image_bytes,
        cached_embeddings=cached,
        min_similarity=min_similarity,
    )

    return {
        'success': True,
        'session_id': payload.session_id,
        'results': results,
    }


@router.post('/unload-embeddings')
async def unload_embeddings(payload: UnloadEmbeddingsRequest) -> dict:
    released = session_cache.unload(payload.session_id)
    return {
        'success': True,
        'session_id': payload.session_id,
        'released': released,
    }
