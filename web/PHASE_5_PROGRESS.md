# Phase 5 Progress

Status: Local engineering complete. User-visible model activation is disabled until a representative final evaluation is approved.

## Delivered

- Root-level Python FastAPI service served by one Uvicorn worker on loopback only.
- Required health, face embedding, text embedding, cosine similarity, and recommendation score endpoints.
- DeepFace FaceNet face embeddings and English all-MiniLM-L6-v2 text embeddings.
- scikit-learn cosine similarity and fixed additive scoring with missing-signal normalization.
- One-at-a-time inference, using isolated processes by default or optional persistent model objects for faster repeated local-demo searches.
- Asynchronous report jobs that begin for consented, eligible public reports without admin pre-approval.
- AES-256-GCM encrypted, versioned face and text embeddings.
- All eligible public/active/consented missing and unidentified candidates are considered regardless of report type; self-comparison is excluded, reciprocal top-ten recommendations are stored for both report owners, and five are displayed at a time.
- Smart Search zero-persistence image/query handling.
- Safe no-face, multiple-face, model-offline, and structured-fallback behavior.
- Permission withdrawal, embedding deletion, recommendation invalidation, suppression, quality flags, expiry, and retention cleanup.
- Mandatory human-review acknowledgment before recommendation-based contact.
- Admin kill switches without identity or contact authority.
- Explicit prohibition on generative image creation or alteration.
- Public report submission with hashed one-time claim codes, matching-email ownership transfer after sign-in, private owner/admin photo review, unclaimed-contact blocking, public-visibility request enforcement, and lifecycle cancellation of pending contact requests.
- Worker leases, expired-lease recovery, atomic consent/policy/lifecycle rechecks, exact model-version release gates, and safe offline fallback.
- Disabled/double-submit states, queued-processing copy, timeouts, retry guidance, route loading/error boundaries, and responsive accessible navigation.

## Validation

- FastAPI health endpoint: passed.
- Real English embedding smoke test: two finite 384-dimensional vectors returned.
- Real FaceNet LFW engineering smoke test: three finite 128-dimensional vectors; the selected same-subject pair ranked above the different-subject pair (0.825 versus -0.160), without calibrating a threshold.
- Invalid/tiny image smoke test: safe quality-limited result and no vector; basic quality failures exit before DeepFace loads.
- Cosine exact cases and no-face weight normalization: passed.
- Prisma schema validation, client generation, and the full SQL migration chain against an isolated SQLite database: passed; Prisma `migrate deploy` still hits the documented generic Windows schema-engine failure in this workspace.
- Next.js lint and production build: passed.
- Phase 1–4.5 foundation/workflow checks and Phase 5 foundation/privacy/live checks: passed.
- AI-service-offline Smart Search fallback: passed in 68 ms with an actionable fallback notice.
- Headless Edge production-browser workflow: passed with an original LFW JPEG through public submission, one-time code display, registration/login return, secure claiming, reporter ownership, logout, and admin navigation.

## Final evaluation gate

The engineering evaluation is recorded under `../evaluation/reports/PHASE5_FINAL_EVALUATION.md`. LFW is web-collected and was used only for a local workflow/model smoke test; it does not satisfy the consent or representativeness gate. Model activation is not approved because the project still needs the planned thesis pilot of approximately 50 separately consenting adult volunteers, with person-disjoint development and held-out evaluation, from which to measure false-positive rates, retrieval metrics, quality slices, and release thresholds. Development mode can exercise the local pipeline, but normal user-visible activation must stay disabled.
