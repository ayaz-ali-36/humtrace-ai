# HumTrace AI

Phase 4.5 local demo for a privacy-preserving, AI-assisted reporting and recommendation workflow for missing and unidentified person reports in Pakistan.

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
- Seven-step missing/unidentified report forms with structured Phase 3 fields
- Exact tracking lookup through `GET /api/track/[publicId]`
- Consent-based contact request send, accept, decline, and cancel actions
- Registration creates reporter accounts only and sends users to login instead of auto-signing them in
- Reporter dashboard shows the signed-in reporter's own report count and recommendation count
- Report forms require only core details: missing-person name, age, height in feet, weight, basic description, reporter name/email, photo confirmation, and consent; unidentified reports can omit the unknown person's name
- Deterministic local recommendation scoring after report submission
- Public-safe possible recommendations on the submit success screen
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
- Deterministic detail-based Smart Search recommendations with public-safe fields only
- Search photographs are validated in memory and are not stored or analyzed in Phase 4.5

Not implemented:
- Python AI service, embeddings, DeepFace, FaceNet, SentenceTransformers, or real face/text embedding generation
- Computer-vision face/person validation
- Photograph-based search similarity (scheduled for Phase 5)
- Replacing a submitted report photograph from the reporter edit screen
- Email, SMS, WhatsApp, or notification delivery
- Production deployment

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

## Anonymous Reports

Anonymous public report submissions are intentionally not attached to an existing registered account just because the submitter typed that account's email. The app creates a separate local anonymous reporter record for the submitted case. A future phase can add secure claiming.

## Current Submit Workflow

After a report is submitted, the app saves the report, private image file, photo metadata, timeline event, notification, and audit log, then shows a case ID and public-safe possible recommendations when eligible public opposite-type reports exist.

Phase 4 uses deterministic local scoring only. Login is required for contact requests, saved dashboard history, accepting/declining requests, and managing reports.

Phase 4.5 Smart Search also uses deterministic descriptive-detail scoring. A search photograph can be supplied, but it is only validated and is never stored or analyzed. Real image similarity begins in Phase 5.

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
npm run db:auth-migrate
npm run db:phase4-admin-migrate
npx prisma generate
```

The Phase 2 SQLite migration was applied with local scripts because Prisma migrate/db push produced schema-engine errors in this Windows workspace during earlier Phase 2 work.

## Development

```bash
npm run dev
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

The complete Phase 4.5 baseline and proposed Phase 5 design are documented in [docs/README.md](./docs/README.md). Phase 5 sections are design proposals only and require review before implementation.

## Validation Scripts

```bash
npm run db:validate
npm run check:db
npm run check:auth
npm run check:phase3
npm run check:phase4
npm run check:phase4-admin
npm run check:phase45
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

AI suggestions must never be presented as identity confirmation. Contact information remains hidden unless a contact request is accepted by the actual recipient. Admin is moderation-only and is not an investigator. Admin moderation does not confirm or reject identity, cannot approve recommendation truth, and cannot force contact sharing.

Stored report images are private local files, not assets served from `public/`. The current UI uses placeholders for public case cards and details.
