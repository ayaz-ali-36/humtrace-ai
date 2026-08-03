# HumTrace AI

Phase 5 local engineering release for a privacy-preserving, AI-assisted reporting and possible-recommendation workflow for missing and unidentified person reports in Pakistan.

HumTrace never generates, synthesizes, edits, or enhances images. The AI service only analyzes user-supplied photographs and English descriptions for possible similarity. It never confirms identity, and human review is mandatory.

## Current Scope

Implemented:
- Next.js App Router UI from Phase 1
- Prisma 6.19 and SQLite local database
- Local report submission with JPG/PNG/WEBP file storage under private `storage/reports/`
- Public Browse/Search database reads
- Track, Reporter My Reports, Reporter Contact Requests, and Admin Manage database reads
- Local-demo register, login, logout, and current-session APIs
- HttpOnly opaque session cookie with hashed session tokens in the database
- Reporter/admin role checks on protected layouts and protected mutations
- Reporter-owned My Reports filtering
- Public Browse/Search and Track use allowlisted public report fields only
- Four-step missing/unidentified report forms with structured person, location, description, photograph, reporter, permission, and review fields
- Exact tracking lookup through `GET /api/track/[publicId]`
- Consent-based contact request send, accept, decline, and cancel actions
- Registration creates reporter accounts only and sends users to login instead of auto-signing them in
- Reporter dashboard shows the signed-in reporter's own report count and recommendation count
- Signed-in submissions attach directly to the reporter account; signed-out submissions receive a one-time claim code and cannot use reporter-only contact actions until claimed
- Report submission saves immediately, returns a case ID and public-safe recommendations, and queues eligible AI work asynchronously without admin pre-approval
- Reporter recommendation history with viewed, dismissed, and contact-requested statuses
- Recommendation-to-contact-request workflow with contact hidden until acceptance
- Admin recommendation quality/status review tab
- Real admin dashboard aggregates from SQLite with admin-only server authorization
- Admin Manage Reports, Users, Audit Logs, and persisted Settings tabs
- Admin report hide, restore, archive, and public-review transitions with audit logs
- Admin user activate/deactivate actions with last-active-admin protection and session revocation
- Persisted system settings for public search, report submission, recommendation display threshold, duplicate warning threshold, and maintenance mode
- Dedicated admin login at `/admin/login`; reporter credentials are rejected there
- Admin-only staff account creation and staff listing at `/admin/staff`
- Reporter-owned report editing, closing, reopening, and archiving from My Reports
- Smart Search using optional descriptive details and/or a photograph
- Deterministic detail-based recommendations across eligible public missing and unidentified reports, with public-safe fields only
- Smart Search photographs and query vectors are validated and processed in memory, then discarded; safe detail-only fallback remains available when approved AI is disabled or offline
- Root-level FastAPI/Uvicorn AI service with DeepFace FaceNet, English all-MiniLM-L6-v2, and scikit-learn cosine similarity
- One-at-a-time local model execution, with isolated subprocesses by default and optional in-process model reuse for faster repeated searches on a capable demo machine
- Asynchronous report AI jobs with encrypted, model-versioned face/text embeddings
- Additive seven-signal scoring with missing-weight normalization and reciprocal top-ten recommendations, displayed five at a time
- Ephemeral Smart Search photographs/query vectors, no-face/multiple-face fallback, permission withdrawal, suppression, retention, and kill switches

Release-gated or not implemented:
- User-visible Phase 5 model activation remains disabled until a representative, separately consented final evaluation is approved
- Replacing a submitted report photograph from the reporter edit screen
- Email, SMS, WhatsApp, or notification delivery
- Production deployment

Local presentation mode may show eligible public report photographs when `HUMTRACE_DEMO_PUBLIC_REPORT_PHOTOS="true"`. The committed default is `false`; this is a local thesis-demo convenience, not production approval.

## Demo Credentials

```text
Admin:
email: admin@humtrace.demo
password: AdminDemo!2026

Reporter A:
email: reporter@humtrace.demo
password: ReporterDemo!2026

Reporter B:
email: second.reporter@humtrace.demo
password: SecondReporter!2026
```

Public registration creates `REPORTER` accounts only. It cannot create an admin account, and it does not auto-login the user. After registering, the user signs in with email and password.

## Session Behavior

Login creates a cryptographically random opaque token in an HttpOnly cookie named `humtrace_session`.
Only a SHA-256 hash of the token is stored in the SQLite `Session` table. Logout deletes the matching session record and clears the cookie. Deactivated users cannot authorize protected actions.

## Report Ownership

Report submission is public and does not require an account. A signed-in reporter owns a report immediately; a signed-out submitter receives a high-entropy one-time claim code. Claiming later requires both that code and a reporter account using the same email entered on the form. Claim codes are stored only as SHA-256 hashes, repeated failures are temporarily locked, and contact actions remain unavailable while a report is unclaimed.

## Current Submit Workflow

After a report is submitted, the app saves the report, private image file, photo metadata, timeline event, and audit log, then shows a case ID. Signed-in owners receive a notification; public submitters instead receive the one-time claim code. It does not pretend that background analysis completed synchronously.

Phase 5 report inference is queued when the report is active/public, processing permission is explicit, and the release gate is approved. It never blocks report submission. Admin moderation is reactive: an admin may later hide, limit, archive, or republish saved content. Possible recommendations are suggestions for reporter review only, never identity confirmation.

Smart Search uses deterministic details when AI is disabled or offline. When the reviewed Phase 5 development/release gate is active, the photograph is analyzed in memory and then discarded together with its query vector.

## Tech Stack

- Next.js App Router
- JavaScript and JSX only
- Tailwind CSS
- Lucide React
- Recharts
- React Hook Form
- Zod
- Prisma ORM
- SQLite
- bcryptjs

## Setup

```bash
cd web
npm install
npm run db:migrate
npm run db:generate
npm run db:seed
```

Use a separate `DATABASE_URL` for test or evaluation data so the normal local demo database is not polluted.

### Faces94 evaluation workflow

The evaluation tools refuse to use the normal application database, keep imported reports `EVALUATION_ONLY` with `publicVisible=false`, and never approve the normal release gate. The real photographs remain in the external dataset folder; only an isolated SQLite evaluation database, encrypted embeddings, ranked results, and metrics are written under the ignored evaluation workspace.

From `web/`, validate and import the external package:

```powershell
npm run check:evaluation -- --dataset "C:\path\to\faces94"
npm run evaluation:import -- --dataset "C:\path\to\faces94"
```

Start the loopback AI service in another terminal, then run the real face-only evaluation:

```powershell
npm run ai:service
npm run evaluation:run
```

Outputs are written to `../evaluation/runtime/faces94-100/`: `metrics.json`, `query-ranks.csv`, `ranked-recommendations.csv`, and `EVALUATION_REPORT.md`. Development chooses the integer face threshold; validation and final-evaluation identities use that frozen threshold. Every query ranks candidates from both the missing and unidentified collections within its identity-disjoint split. Synthetic names, dates, locations, and descriptions are excluded from scoring so they cannot leak the expected identity.

Faces94 results are for a controlled academic evaluation only. They cannot establish participant consent for this missing-person use case, approve public deployment, or turn a similarity suggestion into an identity confirmation.

## Development

```bash
npm run dev
```

For a local HTTP-only FYP demo using `next start`, set `HUMTRACE_SECURE_COOKIES="false"`. Leave it unset (secure by default) or set it to `true` for an HTTPS deployment.

In separate terminals, start the internal AI service and the single background worker:

```bash
npm run ai:service
npm run ai:worker
```

If port 3000 is busy:

```bash
npm run dev -- -p 3001
```

## Production Build

```bash
npm run build
```

## Project Documentation

The current Phase 5 engineering design, safeguards, release gate, and evaluation plan are documented in [docs/README.md](./docs/README.md). Model activation for normal use remains unapproved pending the consented evaluation and calibration gate.

## Validation Scripts

```bash
npm run db:validate
npm run check:db
npm run check:auth
npm run check:phase3
npm run check:phase4
npm run check:phase4-admin
npm run check:phase45
npm run check:phase5
npm run check:phase5-privacy
npm run check:public-reports
npm run check:uploads
npm run check:js-only
npm run check:routes
npm run check:terms
npm run check:images
npm run lint
npm run build
```

With a local server running, validate auth workflows:

```bash
set HUMTRACE_BASE_URL=http://localhost:3002
npm run check:auth-workflows
npm run check:phase3-workflows
npm run check:phase4-workflows
npm run check:phase4-admin-workflows
npm run check:phase45-workflows
```

## Routes

- `/`
- `/search`
- `/browse`
- `/report/missing`
- `/report/unidentified`
- `/track`
- `/about`
- `/contact`
- `/login`
- `/register`
- `/admin/login`
- `/reporter/dashboard`
- `/reporter/my-reports`
- `/reporter/recommendations`
- `/reporter/connection-requests`
- `/reporter/profile`
- `/admin/dashboard`
- `/admin/manage`
- `/admin/staff`

## Safety Rules

AI suggestions must never be presented as identity confirmation. Contact information remains hidden unless a contact request is accepted by the actual recipient. Admin authority is limited to moderation and operations. Admin moderation does not confirm or reject identity, cannot approve recommendation truth, and cannot force contact sharing.

Stored report images remain outside `public/` and are served only through a controlled, no-store route. Anonymous photo access is disabled by default. It can be enabled only for eligible public reports in a local presentation by setting `HUMTRACE_DEMO_PUBLIC_REPORT_PHOTOS="true"`; keep it `false` for deployment or a shared environment.
