import asyncio
import base64
import hashlib
import hmac
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, Field, field_validator


SERVICE_VERSION = "phase5-local-1"
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_TEXTS = 4
MAX_TEXT_LENGTH = 2000
MAX_CANDIDATES = 25
ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent


def load_local_env() -> None:
    env_file = REPO_ROOT / "web" / ".env"
    if not env_file.exists():
        return
    for raw in env_file.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_local_env()
DEFAULT_TEXT_MODEL = ROOT / "models" / "all-MiniLM-L6-v2"
LEGACY_TEXT_MODEL = REPO_ROOT / "web" / "services" / "ai" / "models" / "all-MiniLM-L6-v2"
TEXT_MODEL_PATH = Path(os.environ.get("HUMTRACE_TEXT_MODEL_PATH", str(DEFAULT_TEXT_MODEL)))
if not TEXT_MODEL_PATH.exists() and LEGACY_TEXT_MODEL.exists():
    TEXT_MODEL_PATH = LEGACY_TEXT_MODEL

INFERENCE_TIMEOUT_SECONDS = int(os.environ.get("HUMTRACE_AI_INFERENCE_TIMEOUT_SECONDS", "180"))
PERSISTENT_MODELS = os.environ.get("HUMTRACE_AI_PERSISTENT_MODELS", "false").lower() == "true"
INFERENCE_GATE = asyncio.Semaphore(1)

WEIGHTS = {
    "face": 0.40,
    "age": 0.15,
    "gender": 0.10,
    "height": 0.10,
    "weight": 0.05,
    "location": 0.10,
    "description": 0.10,
}

app = FastAPI(
    title="HumTrace Internal AI Service",
    version=SERVICE_VERSION,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)


def require_internal_token(x_humtrace_internal_token: str = Header(default="")) -> None:
    configured = os.environ.get("HUMTRACE_AI_INTERNAL_TOKEN", "")
    if len(configured) < 32 or not hmac.compare_digest(configured, x_humtrace_internal_token):
        raise HTTPException(status_code=401, detail="unauthorized")


def require_request_id(x_request_id: str = Header(default="")) -> str:
    request_id = x_request_id.strip()
    if not request_id or len(request_id) > 100:
        raise HTTPException(status_code=400, detail="invalid_request_id")
    return request_id


class TextEmbeddingRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=MAX_TEXTS)

    @field_validator("texts")
    @classmethod
    def validate_texts(cls, values: list[str]) -> list[str]:
        cleaned = [" ".join(value.split()) for value in values]
        if any(len(value) < 3 or len(value) > MAX_TEXT_LENGTH for value in cleaned):
            raise ValueError("invalid_text_length")
        return cleaned


class CandidateVector(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    vector: list[float]


class CosineRequest(BaseModel):
    source: list[float]
    candidates: list[CandidateVector] = Field(min_length=1, max_length=MAX_CANDIDATES)


class ScoreSignal(BaseModel):
    available: bool
    score: float = Field(ge=0, le=100)


class RecommendationScoreRequest(BaseModel):
    policyVersion: Literal["phase5-additive-1"]
    signals: dict[str, ScoreSignal]

    @field_validator("signals")
    @classmethod
    def validate_signals(cls, value: dict[str, ScoreSignal]) -> dict[str, ScoreSignal]:
        if set(value) != set(WEIGHTS):
            raise ValueError("all_scoring_signals_are_required")
        return value


def run_isolated(mode: str, payload: dict) -> dict:
    env = os.environ.copy()
    env.update({
        "TF_CPP_MIN_LOG_LEVEL": "3",
        "OMP_NUM_THREADS": "1",
        "TF_NUM_INTRAOP_THREADS": "1",
        "TF_NUM_INTEROP_THREADS": "1",
        "TOKENIZERS_PARALLELISM": "false",
        "TRANSFORMERS_OFFLINE": "1",
        "HF_HUB_OFFLINE": "1",
        "HUMTRACE_TEXT_MODEL_PATH": str(TEXT_MODEL_PATH),
    })
    completed = subprocess.run(
        [sys.executable, "-m", "app.inference_runner", mode],
        cwd=str(ROOT),
        env=env,
        input=json.dumps(payload),
        text=True,
        capture_output=True,
        timeout=INFERENCE_TIMEOUT_SECONDS,
        check=False,
    )
    output = [line for line in completed.stdout.splitlines() if line.strip().startswith("{")]
    if completed.returncode != 0 or not output:
        raise RuntimeError("isolated_inference_failed")
    return json.loads(output[-1])


def run_inference(mode: str, payload: dict) -> dict:
    if not PERSISTENT_MODELS:
        return run_isolated(mode, payload)
    os.environ.update({
        "TF_CPP_MIN_LOG_LEVEL": "3",
        "OMP_NUM_THREADS": "1",
        "TF_NUM_INTRAOP_THREADS": "1",
        "TF_NUM_INTEROP_THREADS": "1",
        "TOKENIZERS_PARALLELISM": "false",
        "TRANSFORMERS_OFFLINE": "1",
        "HF_HUB_OFFLINE": "1",
        "HUMTRACE_TEXT_MODEL_PATH": str(TEXT_MODEL_PATH),
    })
    from app.inference_runner import run_payload
    return run_payload(mode, payload)


@app.get("/health", dependencies=[Depends(require_internal_token)])
async def health() -> dict:
    return {
        "status": "ok",
        "service": "humtrace-ai-service",
        "version": SERVICE_VERSION,
        "concurrency": 1,
        "persistentModels": PERSISTENT_MODELS,
        "models": {
            "face": {"id": "deepface-facenet", "state": "READY" if PERSISTENT_MODELS else "UNLOADED"},
            "text": {
                "id": "sentence-transformers-all-MiniLM-L6-v2",
                "state": ("READY" if PERSISTENT_MODELS else "UNLOADED") if TEXT_MODEL_PATH.exists() else "ERROR",
            },
        },
        "generativeImages": False,
    }


@app.post("/ai/face-embedding", dependencies=[Depends(require_internal_token)])
async def face_embedding(request: Request, request_id: str = Depends(require_request_id)) -> dict:
    content_type = request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    if content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="invalid_image_type")
    image = await request.body()
    if not image or len(image) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413 if image else 400, detail="invalid_image_size")
    async with INFERENCE_GATE:
        try:
            result = await asyncio.to_thread(run_inference, "face", {
                "image": base64.b64encode(image).decode("ascii"),
                "mimeType": content_type,
            })
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="inference_timeout") from None
        except Exception:
            raise HTTPException(status_code=503, detail="face_model_unavailable") from None
    result["requestId"] = request_id
    return result


@app.post("/ai/text-embedding", dependencies=[Depends(require_internal_token)])
async def text_embedding(payload: TextEmbeddingRequest, request_id: str = Depends(require_request_id)) -> dict:
    if not TEXT_MODEL_PATH.exists():
        raise HTTPException(status_code=503, detail="text_model_unavailable")
    async with INFERENCE_GATE:
        try:
            result = await asyncio.to_thread(run_inference, "text", payload.model_dump())
        except subprocess.TimeoutExpired:
            raise HTTPException(status_code=504, detail="inference_timeout") from None
        except Exception:
            raise HTTPException(status_code=503, detail="text_model_unavailable") from None
    result["requestId"] = request_id
    return result


@app.post("/ai/cosine-similarity", dependencies=[Depends(require_internal_token)])
async def cosine(payload: CosineRequest, request_id: str = Depends(require_request_id)) -> dict:
    import numpy as np
    from sklearn.metrics.pairwise import cosine_similarity

    dimensions = len(payload.source)
    if dimensions < 2 or any(len(item.vector) != dimensions for item in payload.candidates):
        raise HTTPException(status_code=400, detail="vector_dimension_mismatch")
    if not np.isfinite(np.asarray(payload.source, dtype=np.float32)).all():
        raise HTTPException(status_code=400, detail="invalid_vector")
    matrix = np.asarray([item.vector for item in payload.candidates], dtype=np.float32)
    if not np.isfinite(matrix).all():
        raise HTTPException(status_code=400, detail="invalid_vector")
    raw_scores = cosine_similarity(np.asarray([payload.source], dtype=np.float32), matrix)[0]
    return {
        "requestId": request_id,
        "metric": "cosine",
        "dimensions": dimensions,
        "results": [
            {
                "id": item.id,
                "cosine": float(score),
                "similarity": round(max(0.0, min(1.0, float(score))) * 100, 4),
            }
            for item, score in zip(payload.candidates, raw_scores)
        ],
    }


@app.post("/ai/recommendation-score", dependencies=[Depends(require_internal_token)])
async def recommendation_score(payload: RecommendationScoreRequest, request_id: str = Depends(require_request_id)) -> dict:
    available = [(name, signal) for name, signal in payload.signals.items() if signal.available]
    available_weight = sum(WEIGHTS[name] for name, _ in available)
    contributions = {
        name: round(WEIGHTS[name] * signal.score, 6)
        for name, signal in available
    }
    score = sum(contributions.values()) / available_weight if available_weight else 0.0
    return {
        "requestId": request_id,
        "policyVersion": payload.policyVersion,
        "score": round(score, 4),
        "availableWeight": round(available_weight, 4),
        "modalityMask": sorted(name for name, _ in available),
        "contributions": contributions,
        "humanReviewRequired": True,
    }
