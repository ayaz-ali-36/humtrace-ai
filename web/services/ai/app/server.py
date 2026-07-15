import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from sentence_transformers import SentenceTransformer


WEB_ROOT = Path(__file__).resolve().parents[3]


def load_local_env():
    env_path = WEB_ROOT / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_local_env()

MODEL_ID = "sentence-transformers-all-MiniLM-L6-v2"
MODEL_PATH = WEB_ROOT / "services" / "ai" / "models" / "all-MiniLM-L6-v2"
INTERNAL_TOKEN = os.environ.get("HUMTRACE_AI_INTERNAL_TOKEN", "")
HOST = "127.0.0.1"
PORT = int(os.environ.get("HUMTRACE_AI_SERVICE_PORT", "5055"))

if len(INTERNAL_TOKEN) < 32:
    raise RuntimeError("HUMTRACE_AI_INTERNAL_TOKEN must be configured.")
if not MODEL_PATH.exists():
    raise RuntimeError("The approved local English text model is not available.")

MODEL = SentenceTransformer(str(MODEL_PATH), local_files_only=True, device="cpu")


class Handler(BaseHTTPRequestHandler):
    server_version = "HumTraceLocalAI/0.1"

    def log_message(self, format_string, *args):
        print("[humtrace-ai] " + self.address_string() + " " + (format_string % args))

    def send_json(self, status, payload):
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def authorized(self):
        return self.headers.get("X-HumTrace-Internal-Token", "") == INTERNAL_TOKEN

    def do_GET(self):
        if self.path != "/health":
            return self.send_json(404, {"error": "not_found"})
        if not self.authorized():
            return self.send_json(401, {"error": "unauthorized"})
        return self.send_json(200, {
            "status": "ok",
            "capability": "english_text_embedding",
            "modelId": MODEL_ID,
            "dimensions": 384,
            "mode": "development_only",
            "evaluationStatus": "deferred"
        })

    def do_POST(self):
        if self.path != "/embed/text":
            return self.send_json(404, {"error": "not_found"})
        if not self.authorized():
            return self.send_json(401, {"error": "unauthorized"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.send_json(400, {"error": "invalid_length"})
        if length < 2 or length > 128_000:
            return self.send_json(413, {"error": "request_size"})
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            texts = payload.get("texts")
            if not isinstance(texts, list) or not 1 <= len(texts) <= 128:
                raise ValueError("texts")
            normalized = []
            for text in texts:
                if not isinstance(text, str):
                    raise ValueError("text_type")
                cleaned = " ".join(text.split())[:2000]
                if len(cleaned) < 3:
                    raise ValueError("text_length")
                normalized.append(cleaned)
            vectors = MODEL.encode(
                normalized,
                batch_size=min(32, len(normalized)),
                normalize_embeddings=True,
                show_progress_bar=False
            )
            return self.send_json(200, {
                "modelId": MODEL_ID,
                "language": "en",
                "dimensions": 384,
                "vectors": vectors.tolist()
            })
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
            return self.send_json(400, {"error": "invalid_request"})
        except Exception:
            return self.send_json(500, {"error": "inference_failed"})


if __name__ == "__main__":
    print("HumTrace English text service loading " + MODEL_ID + " on http://" + HOST + ":" + str(PORT))
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
