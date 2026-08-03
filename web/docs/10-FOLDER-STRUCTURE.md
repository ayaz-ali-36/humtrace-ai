# Folder Structure

## Current repository

~~~text
humanTrace_AI/
|-- ai-service/                  Loopback-only FastAPI inference service
|   |-- app/                     Health, face/text embedding, cosine, scoring
|   |-- models/                  Approved local artifacts only; not public
|   `-- manifests/               Model identifiers, checksums, and restrictions
|-- evaluation/                  Evaluation configs, scripts, reports; runtime ignored
|-- stitch_reference/            Historical UI reference material
|-- web/                         Next.js application and background workers
|   |-- app/
|   |   |-- api/                 Auth, reports, photos, search, contact, admin
|   |   |-- admin/               Admin-only dashboard, moderation, settings, staff
|   |   |-- reporter/            Owner dashboard, reports, suggestions, requests
|   |   `-- report/              Missing/Unidentified report forms and claim handoff
|   |-- components/ui/kit.jsx    Shared public, reporter, and admin UI
|   |-- lib/
|   |   |-- ai/                  Client, encryption, gate, jobs, invalidation
|   |   |-- auth.js              Sessions and role guards
|   |   |-- database-views.js    Role-specific database view models
|   |   |-- public-reports.js    Allowlisted public report query
|   |   |-- recommendations.js   Suggestion mapping and safe fallback scoring
|   |   |-- settings.js          Validated atomic operational settings
|   |   `-- upload-storage.js    Private image validation and storage
|   |-- prisma/
|   |   |-- migrations/          Canonical SQL migration history
|   |   |-- schema.prisma        Current relational model
|   |   `-- seed.js              Clearly fictional local demo records
|   |-- scripts/                 Foundation, privacy, and workflow checks
|   |-- storage/reports/         Private report photographs; server-only
|   `-- workers/
|       |-- ai-jobs.js           Single-concurrency leased background worker
|       `-- retention.js         Derived-data expiry and deletion worker
|-- PHASE_1_PROGRESS.md
|-- PHASE_2_PROGRESS.md
|-- PHASE_3_PROGRESS.md
|-- PHASE_4_PROGRESS.md
`-- web/PHASE_5_PROGRESS.md
~~~

## Ownership boundaries

| Directory | Sensitivity | Rule |
|---|---|---|
| `web/public/` | Public | Never store report images, vectors, private exports, or secrets |
| `web/storage/reports/` | Highly sensitive | No-store route; private by default, with an explicit local-presentation exception for eligible public reports |
| `web/prisma/*.db` | Sensitive | Local-only; use an isolated database for tests/evaluation |
| `ai-service/models/` | Restricted | Only reviewed, checksummed local artifacts; no runtime downloads |
| `evaluation/runtime/` | Restricted and ignored | Separately consented or evaluation-only runtime data; never commit raw images |
| `evaluation/reports/` | Public-safe documentation | Metrics, decisions, and limitations without raw sensitive content |

The browser never calls the inference service directly. Normal Phase 5 activation requires exact model-version approval plus an approved representative evaluation and calibrated threshold. Possible recommendations are suggestions only and require human review.
