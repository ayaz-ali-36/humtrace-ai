import base64
import json
import os
import sys
from pathlib import Path


_TEXT_MODEL = None


def emit(payload: dict) -> None:
    print(json.dumps(payload, separators=(",", ":")))


def face(payload: dict) -> dict:
    import cv2
    import numpy as np

    raw = base64.b64decode(payload["image"], validate=True)
    image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        return {"outcome": "QUALITY_LIMITED", "reason": "IMAGE_DECODE_FAILED"}
    height, width = image.shape[:2]
    if min(height, width) < 80:
        return {"outcome": "QUALITY_LIMITED", "reason": "IMAGE_TOO_SMALL", "quality": {"width": width, "height": height}}
    from deepface import DeepFace

    try:
        representations = DeepFace.represent(
            img_path=image,
            model_name="Facenet",
            detector_backend="opencv",
            enforce_detection=True,
            align=True,
            max_faces=2,
            l2_normalize=True,
        )
    except Exception as error:
        message = str(error).lower()
        if "face could not be detected" in message or "face detection" in message:
            return {"outcome": "NO_FACE", "reason": "NO_USABLE_FACE", "quality": {"width": width, "height": height}}
        raise
    if len(representations) != 1:
        return {"outcome": "MULTIPLE_FACES", "reason": "SINGLE_FACE_REQUIRED", "quality": {"faceCount": len(representations)}}
    vector = [float(value) for value in representations[0]["embedding"]]
    return {
        "outcome": "AVAILABLE",
        "modelId": "deepface-facenet",
        "modelVersion": "deepface-0.0.100-facenet",
        "preprocessingVersion": "opencv-align-l2-1",
        "dimensions": len(vector),
        "embedding": vector,
        "quality": {"faceCount": 1, "width": width, "height": height},
    }


def text(payload: dict) -> dict:
    from sentence_transformers import SentenceTransformer

    global _TEXT_MODEL
    model_path = Path(os.environ["HUMTRACE_TEXT_MODEL_PATH"])
    if _TEXT_MODEL is None:
        _TEXT_MODEL = SentenceTransformer(str(model_path), local_files_only=True, device="cpu")
    vectors = _TEXT_MODEL.encode(
        payload["texts"],
        batch_size=1,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return {
        "outcome": "AVAILABLE",
        "modelId": "sentence-transformers-all-MiniLM-L6-v2",
        "modelVersion": "local-artifact-1",
        "preprocessingVersion": "english-normalized-1",
        "language": "en",
        "dimensions": 384,
        "vectors": vectors.tolist(),
    }


def run_payload(mode: str, payload: dict) -> dict:
    if mode == "face":
        return face(payload)
    if mode == "text":
        return text(payload)
    raise ValueError("unsupported_mode")


def main() -> None:
    payload = json.load(sys.stdin)
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    emit(run_payload(mode, payload))


if __name__ == "__main__":
    main()
