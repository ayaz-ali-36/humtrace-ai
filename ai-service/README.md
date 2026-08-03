# HumTrace internal AI service

CPU-only, loopback-only FastAPI service for face and English text embeddings, cosine similarity, and additive recommendation scoring.

It never generates, synthesizes, edits, or enhances images. It only analyzes user-supplied photographs for possible similarity. Results never confirm identity and always require human review.

The service has no database access, accepts no URLs or file paths, and stores no request content. It uses isolated model subprocesses by default. A local presentation can set `HUMTRACE_AI_PERSISTENT_MODELS="true"` to reuse loaded model objects and reduce repeated-search latency; request images and query vectors still are not cached.

Run from this directory after configuring a 32+ character `HUMTRACE_AI_INTERNAL_TOKEN`:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 5055 --workers 1
```
