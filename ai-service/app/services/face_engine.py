import base64
import math
from typing import Any

import cv2
import numpy as np
from insightface.app import FaceAnalysis


class FaceEngine:
    def __init__(self) -> None:
        self._app: FaceAnalysis | None = None

    def _ensure_model(self) -> FaceAnalysis:
        if self._app is None:
            self._app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
            self._app.prepare(ctx_id=-1)
        return self._app

    @staticmethod
    def _decode_image_bytes(image_bytes: bytes) -> np.ndarray:
        if len(image_bytes) < 100:
            raise ValueError('INVALID_IMAGE')

        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError('INVALID_IMAGE')
        return image

    def encode_from_bytes(self, image_bytes: bytes) -> tuple[list[float], float, list[int]]:
        image = self._decode_image_bytes(image_bytes)
        app = self._ensure_model()
        faces = app.get(image)

        if len(faces) == 0:
            raise ValueError('NO_FACE_DETECTED')
        if len(faces) > 1:
            raise ValueError('MULTIPLE_FACES')

        face = faces[0]
        embedding = np.array(face.normed_embedding, dtype=float)
        bbox = [int(v) for v in face.bbox.tolist()]
        quality_score = float(getattr(face, 'det_score', 0.0))
        return embedding.tolist(), quality_score, bbox

    def decode_base64_image(self, image_base64: str) -> bytes:
        if ',' in image_base64:
            image_base64 = image_base64.split(',', 1)[1]
        try:
            return base64.b64decode(image_base64)
        except Exception as exc:  # noqa: BLE001
            raise ValueError('INVALID_IMAGE') from exc

    @staticmethod
    def cosine_similarity(v1: list[float], v2: list[float]) -> float:
        a = np.array(v1, dtype=float)
        b = np.array(v2, dtype=float)
        denominator = np.linalg.norm(a) * np.linalg.norm(b)
        if math.isclose(float(denominator), 0.0):
            return 0.0
        return float(np.dot(a, b) / denominator)

    def recognize_against_cache(
        self,
        image_bytes: bytes,
        cached_embeddings: dict[str, list[float]],
        min_similarity: float,
    ) -> list[dict[str, Any]]:
        image = self._decode_image_bytes(image_bytes)
        app = self._ensure_model()
        faces = app.get(image)

        if not faces:
            return []

        results: list[dict[str, Any]] = []

        for face in faces:
            probe_embedding = np.array(face.normed_embedding, dtype=float).tolist()
            bbox = [int(v) for v in face.bbox.tolist()]

            best_student_id: str | None = None
            best_similarity = -1.0

            for student_id, stored_embedding in cached_embeddings.items():
                sim = self.cosine_similarity(probe_embedding, stored_embedding)
                if sim > best_similarity:
                    best_similarity = sim
                    best_student_id = student_id

            if best_similarity >= min_similarity and best_student_id:
                results.append(
                    {
                        'student_id': best_student_id,
                        'similarity': round(best_similarity, 4),
                        'bbox': bbox,
                        'status': 'matched',
                    }
                )
            else:
                results.append(
                    {
                        'student_id': None,
                        'similarity': round(max(best_similarity, 0.0), 4),
                        'bbox': bbox,
                        'status': 'unknown',
                    }
                )

        return results


face_engine = FaceEngine()
