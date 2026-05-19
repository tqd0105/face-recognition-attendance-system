import base64
import math
from typing import Any

import cv2
import numpy as np
from insightface.app import FaceAnalysis

from app.services.session_cache import CachedEmbeddings


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

    @staticmethod
    def _face_area(face: Any) -> float:
        x1, y1, x2, y2 = [float(v) for v in face.bbox.tolist()]
        return max(x2 - x1, 0.0) * max(y2 - y1, 0.0)

    def _largest_face(self, faces: list[Any]) -> Any:
        return max(faces, key=self._face_area)

    @staticmethod
    def _normalized_embedding(face: Any) -> np.ndarray:
        embedding = np.asarray(face.normed_embedding, dtype=np.float32)
        norm = float(np.linalg.norm(embedding))
        if not np.isfinite(norm) or norm <= 0.0:
            return embedding
        return embedding / norm

    @staticmethod
    def _extract_pose_vector(face: Any) -> np.ndarray:
        landmarks = np.array(getattr(face, 'kps', []), dtype=float)
        if landmarks.shape[0] < 5 or landmarks.shape[1] < 2:
            raise ValueError('LIVENESS_LANDMARKS_UNAVAILABLE')

        left_eye, right_eye, nose, left_mouth, right_mouth = landmarks[:5]
        eye_center = (left_eye + right_eye) / 2.0
        mouth_center = (left_mouth + right_mouth) / 2.0
        eye_distance = float(np.linalg.norm(right_eye - left_eye))
        eye_mouth_distance = float(np.linalg.norm(mouth_center - eye_center))
        if eye_distance < 1.0 or eye_mouth_distance < 1.0:
            raise ValueError('LIVENESS_LANDMARKS_INVALID')

        mouth_width = float(np.linalg.norm(right_mouth - left_mouth))
        yaw_proxy = float((nose[0] - eye_center[0]) / eye_distance)
        pitch_proxy = float((nose[1] - eye_center[1]) / eye_mouth_distance)
        mouth_eye_ratio = float(mouth_width / eye_distance)

        return np.array([yaw_proxy, pitch_proxy, mouth_eye_ratio], dtype=float)

    def _analyze_liveness_frames(
        self,
        frame_base64_list: list[str],
        min_frames: int,
        min_pose_change: float,
        min_quality: float,
        same_face_similarity: float,
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        if len(frame_base64_list) < min_frames:
            raise ValueError('LIVENESS_FRAMES_REQUIRED')

        app = self._ensure_model()
        pose_vectors: list[np.ndarray] = []
        embeddings: list[np.ndarray] = []
        quality_scores: list[float] = []
        analyzed_frames: list[dict[str, Any]] = []

        for frame_base64 in frame_base64_list:
            image = self._decode_image_bytes(self.decode_base64_image(frame_base64))
            image_height, image_width = image.shape[:2]
            faces = app.get(image)
            if not faces:
                raise ValueError('NO_FACE_DETECTED')

            face = self._largest_face(faces)
            quality_score = float(getattr(face, 'det_score', 0.0))
            if quality_score < min_quality:
                raise ValueError('LIVENESS_LOW_FACE_QUALITY')

            pose_vectors.append(self._extract_pose_vector(face))
            embeddings.append(self._normalized_embedding(face))
            quality_scores.append(quality_score)
            analyzed_frames.append(
                {
                    'image_width': image_width,
                    'image_height': image_height,
                    'faces': faces,
                }
            )

        same_face_scores = [
            float(np.dot(embeddings[index - 1], embeddings[index]))
            for index in range(1, len(embeddings))
        ]
        min_same_face_score = min(same_face_scores) if same_face_scores else 1.0
        if min_same_face_score < same_face_similarity:
            raise ValueError('LIVENESS_FACE_CHANGED')

        pose_changes = [
            float(np.linalg.norm(pose_vectors[index] - pose_vectors[index - 1]))
            for index in range(1, len(pose_vectors))
        ]
        best_pose_change = max(pose_changes) if pose_changes else 0.0
        average_pose_change = float(sum(pose_changes) / len(pose_changes)) if pose_changes else 0.0
        if best_pose_change < min_pose_change:
            return {
                'live': False,
                'error_code': 'LIVENESS_POSE_CHANGE_TOO_LOW',
                'message': 'Liveness failed. Please turn your head left or right slightly, not just move the camera.',
                'score': round(best_pose_change, 4),
                'average_pose_change': round(average_pose_change, 4),
                'min_pose_change': min_pose_change,
                'min_same_face_similarity': round(min_same_face_score, 4),
                'quality_score': round(float(min(quality_scores)), 4),
            }, analyzed_frames

        return {
            'live': True,
            'score': round(best_pose_change, 4),
            'average_pose_change': round(average_pose_change, 4),
            'min_pose_change': min_pose_change,
            'min_same_face_similarity': round(min_same_face_score, 4),
            'quality_score': round(float(min(quality_scores)), 4),
        }, analyzed_frames

    def analyze_liveness(
        self,
        frame_base64_list: list[str],
        min_frames: int,
        min_pose_change: float,
        min_quality: float,
        same_face_similarity: float,
    ) -> dict[str, Any]:
        result, _ = self._analyze_liveness_frames(
            frame_base64_list=frame_base64_list,
            min_frames=min_frames,
            min_pose_change=min_pose_change,
            min_quality=min_quality,
            same_face_similarity=same_face_similarity,
        )
        return result

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
        cached_embeddings: CachedEmbeddings,
        min_similarity: float,
        excluded_student_ids: set[str] | None = None,
    ) -> list[dict[str, Any]]:
        image = self._decode_image_bytes(image_bytes)
        image_height, image_width = image.shape[:2]
        app = self._ensure_model()
        faces = app.get(image)

        if not faces:
            return []

        return self._recognize_faces_against_cache(
            faces=faces,
            image_width=image_width,
            image_height=image_height,
            cached_embeddings=cached_embeddings,
            min_similarity=min_similarity,
            excluded_student_ids=excluded_student_ids,
        )

    def _match_embedding(
        self,
        probe_embedding: np.ndarray,
        cached_embeddings: CachedEmbeddings,
        excluded_student_ids: set[str] | None = None,
    ) -> tuple[str | None, float]:
        if cached_embeddings.matrix.size == 0 or not cached_embeddings.student_ids:
            return None, -1.0
        if cached_embeddings.matrix.shape[1] != probe_embedding.shape[0]:
            return None, -1.0

        similarities = cached_embeddings.matrix @ probe_embedding.astype(np.float32, copy=False)
        if similarities.size == 0:
            return None, -1.0

        best_index = int(np.argmax(similarities))
        best_similarity = float(similarities[best_index])
        if not np.isfinite(best_similarity):
            return None, -1.0

        best_student_id = cached_embeddings.student_ids[best_index]
        if excluded_student_ids and best_student_id in excluded_student_ids:
            return None, best_similarity

        return best_student_id, best_similarity

    def _recognize_faces_against_cache(
        self,
        faces: list[Any],
        image_width: int,
        image_height: int,
        cached_embeddings: CachedEmbeddings,
        min_similarity: float,
        excluded_student_ids: set[str] | None = None,
    ) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []

        for face in faces:
            probe_embedding = self._normalized_embedding(face)
            bbox = [int(v) for v in face.bbox.tolist()]
            x1, y1, x2, y2 = bbox
            face_width = max(x2 - x1, 1)
            face_height = max(y2 - y1, 1)
            face_area_ratio = float((face_width * face_height) / max(image_width * image_height, 1))
            quality_score = float(getattr(face, 'det_score', 0.0))

            best_student_id, best_similarity = self._match_embedding(
                probe_embedding=probe_embedding,
                cached_embeddings=cached_embeddings,
                excluded_student_ids=excluded_student_ids,
            )

            if best_similarity >= min_similarity and best_student_id:
                results.append(
                    {
                        'student_id': best_student_id,
                        'similarity': round(best_similarity, 4),
                        'quality_score': round(quality_score, 4),
                        'face_area_ratio': round(face_area_ratio, 4),
                        'bbox': bbox,
                        'status': 'matched',
                    }
                )
            else:
                results.append(
                    {
                        'student_id': None,
                        'similarity': round(max(best_similarity, 0.0), 4),
                        'quality_score': round(quality_score, 4),
                        'face_area_ratio': round(face_area_ratio, 4),
                        'bbox': bbox,
                        'status': 'unknown',
                    }
                )

        return results

    def recognize_live_against_cache(
        self,
        image_base64: str,
        frame_base64_list: list[str],
        cached_embeddings: CachedEmbeddings,
        min_similarity: float,
        min_frames: int,
        min_pose_change: float,
        min_quality: float,
        same_face_similarity: float,
        excluded_student_ids: set[str] | None = None,
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        liveness, analyzed_frames = self._analyze_liveness_frames(
            frame_base64_list=frame_base64_list,
            min_frames=min_frames,
            min_pose_change=min_pose_change,
            min_quality=min_quality,
            same_face_similarity=same_face_similarity,
        )

        if not liveness.get('live'):
            return liveness, []

        if analyzed_frames:
            frame = analyzed_frames[-1]
            results = self._recognize_faces_against_cache(
                faces=frame['faces'],
                image_width=frame['image_width'],
                image_height=frame['image_height'],
                cached_embeddings=cached_embeddings,
                min_similarity=min_similarity,
                excluded_student_ids=excluded_student_ids,
            )
            return liveness, results

        image_bytes = self.decode_base64_image(image_base64)
        results = self.recognize_against_cache(
            image_bytes=image_bytes,
            cached_embeddings=cached_embeddings,
            min_similarity=min_similarity,
            excluded_student_ids=excluded_student_ids,
        )
        return liveness, results


face_engine = FaceEngine()
