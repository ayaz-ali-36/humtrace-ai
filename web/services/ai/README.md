# HumTrace AI Local Text Service

This development-only service loads the locally cached English all-MiniLM-L6-v2 model and returns normalized 384-dimensional text embeddings to trusted loopback callers.

It is not a browser API. It binds to 127.0.0.1, requires the internal token from .env, performs no database writes, and does not persist request text.

Start it from the web directory:

~~~powershell
npm run ai:text-service
~~~

Evaluation is intentionally deferred until the final Phase 5 gate. The service and model must remain development-only until that evaluation is approved.
