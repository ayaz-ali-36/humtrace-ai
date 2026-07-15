# HumTrace AI Phase 2 Progress

Last updated: 2026-07-13

## Current Phase

Phase 2 database foundation and completion work are implemented for the local demo. Read-only public Browse/Search database wiring, report-submission database writes, local report image-file storage, local-demo authentication, server-side role checks, reporter-owned data scoping, consent-based contact-request review actions, tracker database reads, reporter case views, and admin moderation database views have been added.

No AI processing, computer vision, email/SMS, WhatsApp, or production deployment have been added.

## Database Stack

- ORM: Prisma 6.19.0
- Database: SQLite
- Local database file: `web/prisma/dev.db`
- Environment variable: `DATABASE_URL="file:./dev.db"`

Prisma 7.8.0 was initially installed, but its newer config/adapter path caused schema-engine failures in this local Windows setup. The project was moved to Prisma 6.19.0 for stable SQLite migration/client support.

Note: `prisma migrate dev` and `prisma db push` still produced a blank schema-engine error in this environment, even though `prisma validate` and `prisma migrate diff` succeeded. The initial migration SQL was generated from Prisma, saved under `web/prisma/migrations/`, and applied directly to SQLite. Prisma Client can query the resulting database successfully.

## Database Models Added

Defined in `web/prisma/schema.prisma`:

- `User`
- `Report`
- `ReportPhoto`
- `Recommendation`
- `ContactRequest`
- `TimelineEvent`
- `Notification`
- `AuditLog`
- `Session`

## Workflow Coverage

The schema supports:

- Reporters/admin users
- Missing person reports
- Unidentified person reports with unknown name support
- Required report photos as database records
- Future face/person review status fields
- AI recommendation records as future generated data
- Consent-based contact request records
- Report timeline events
- User notifications
- Audit logs
- Read-only public report browsing from SQLite for `/browse` and `/search`
- Missing/unidentified report form submissions now create local database records through `POST /api/reports`
- Missing/unidentified report submissions now send multipart form data and store uploaded JPG/PNG/WEBP files under private `web/storage/reports/<case-id>/`
- Submitted reports are saved as `SUBMITTED` and `LIMITED`, so they do not appear in public Browse/Search until a future review workflow makes them public
- Consent-based contact requests now create local database records through `POST /api/contact-requests`
- Local-demo authentication now supports register, login, logout, and current-session APIs
- Session tokens are opaque HttpOnly cookies; only token hashes are stored in SQLite
- Public registration creates reporter accounts only, does not auto-login, and sends the user to `/login`
- Reporter/admin layouts are protected server-side
- Reporter My Reports is scoped to the authenticated reporter
- Signed-in report submissions attach to the session reporter
- Anonymous report submissions create separate anonymous reporter records and cannot claim an existing account by typed email
- Contact requests now support authenticated accept, decline, and requester-cancel actions
- Contact remains hidden unless a request is accepted; accepted contact reveals only the selected preferred contact method to the two participants
- `/track` can read local database reports by case ID
- `/reporter/my-reports` reads local database reports
- `/reporter/connection-requests` reads local database contact requests and shows an All Requests tab for demo validation
- `/admin/manage` reads local database reports, users, and audit logs
- Admin moderation actions can update report status and visibility through `PATCH /api/reports/[publicId]`

## Seed Data

Seed file:

- `web/prisma/seed.js`

Current seed creates:

- 3 users
- 2 reports
- 2 report photos
- 1 recommendation
- 1 contact request
- 2 timeline events
- 2 notifications
- 2 audit logs

Workflow validation records were also created through the API:

- `MP-2026-0048`, currently status `HIDDEN`, visibility `HIDDEN`; this is a legacy metadata-only report-photo validation record from before local image-file storage was added
- `MP-2026-0049`, currently status `UNDER_REVIEW`, visibility `LIMITED`; created through the multipart upload API and has a stored local PNG under private `web/storage/reports/MP-2026-0049/`
- Additional contact request records for consent-flow validation
- `UI-2026-0001` was restored to `PUBLIC` visibility so Browse/Search have at least one safe public demo record and `npm run check:public-reports` passes

## Important Files Added or Changed

- `web/prisma/schema.prisma`
- `web/prisma/seed.js`
- `web/prisma/dev.db`
- `web/prisma/migrations/20260712230000_init_database_foundation/migration.sql`
- `web/prisma/migrations/20260713010000_auth_sessions_ownership/migration.sql`
- `web/scripts/check-database-foundation.js`
- `web/scripts/apply-auth-migration.js`
- `web/scripts/check-auth-foundation.js`
- `web/scripts/check-auth-workflows.js`
- `web/scripts/check-public-reports-query.js`
- `web/scripts/check-upload-storage.js`
- `web/lib/prisma.js`
- `web/lib/public-reports.js`
- `web/lib/database-views.js`
- `web/lib/upload-storage.js`
- `web/lib/auth.js`
- `web/lib/auth-constants.js`
- `web/app/browse/page.js`
- `web/app/search/page.js`
- `web/app/api/reports/route.js`
- `web/app/api/reports/[publicId]/route.js`
- `web/app/api/contact-requests/route.js`
- `web/app/api/contact-requests/[id]/route.js`
- `web/app/api/auth/register/route.js`
- `web/app/api/auth/login/route.js`
- `web/app/api/auth/logout/route.js`
- `web/app/api/auth/me/route.js`
- `web/app/track/page.js`
- `web/app/reporter/my-reports/page.js`
- `web/app/reporter/connection-requests/page.js`
- `web/app/admin/manage/page.js`
- `web/components/ui/kit.jsx`
- `web/.env`
- `web/.env.example`
- `web/.gitignore`
- `web/package.json`
- `web/package-lock.json`
- `web/README.md`
- `web/storage/reports/MP-2026-0049/1783910010404-humtrace-upload-test.png` local validation upload file; upload directory is ignored for future submissions

## Commands Run

Setup:

- `npm install prisma @prisma/client`
- `npm install prisma@6.19.0 @prisma/client@6.19.0`
- `npx prisma generate`
- `npm run db:seed`

Validation:

- `npm run db:validate`
- `npm run check:db`
- `npm run check:auth`
- `npm run check:public-reports`
- `npm run check:uploads`
- `npm run check:js-only`
- `npm run lint`
- `npm run build`
- `npm run check:routes`
- `npm run check:terms`
- `npm run check:images`
- Local API validation against `POST /api/reports`
- Local API validation against `POST /api/contact-requests`
- Local API validation against `PATCH /api/reports/[publicId]`
- Local multipart API validation against `POST /api/reports` on `http://localhost:3001`, creating `MP-2026-0049` with an actual stored PNG
- Local health check against `http://localhost:3001/api/health`
- Local auth workflow validation against `http://localhost:3002`
- In-app browser validation for `/track`, `/reporter/my-reports`, `/reporter/connection-requests`, and `/admin/manage`

Recovery/repair:

- Updated local SQLite row `UI-2026-0001` back to status `PUBLIC`, visibility `PUBLIC` after verification found all reports hidden and `npm run check:public-reports` failing
- Applied local auth/session migration through `npm run db:auth-migrate`
- `npx prisma generate` initially hit a Windows file-lock error on `.prisma/client/default.js`; retry with elevated permissions succeeded
- `npm run lint` initially hit a Windows permission error writing `.next/cache/eslint`; retry with elevated permissions succeeded
- Review fix moved stored report images out of `public/` and updated `ReportPhoto.storagePath` to private `storage/reports/...`
- Review fix blocked signed-in admin/non-reporter accounts from creating reporter contact requests.
- Review fix restricted public Track data to public reports only, so limited/hidden case details are not shipped to public browser code.
- Review fix replaced stale Phase 1/auth-preview messages in the touched UI and README with Phase 2 local-demo wording.

## Current Validation Status

- Prisma schema validation: passed
- Prisma Client generation: passed
- SQLite database exists: passed
- Seed data check: passed
- Public reports database query check: passed
- Upload storage metadata/file check: passed; 4 photo records checked, 1 stored file verified, 1 legacy metadata-only record noted
- Auth foundation check: passed
- Auth workflow check: passed against `http://localhost:3002`
- Review auth workflow check: passed against fresh server `http://localhost:3004`
- Report submission API write check: passed
- Multipart report submission with local image file: passed for `MP-2026-0049`
- Contact request API write check: passed
- Admin moderation API status update check: passed
- JavaScript-only check: passed
- Lint: passed
- Build: passed
- Route check: passed, 17 pages and health route present
- Unsafe wording check: passed
- External image check: passed

## Review Fixes After Manual Product Check

Updated on 2026-07-13:

- Registration now creates a reporter account but does not auto-login the user.
- Registration now returns `/login`, so the user signs in with their email and password after account creation.
- Phone number was removed from the registration UI; phone remains optional in the database and report/contact flows.
- Reporter dashboard now uses authenticated database counts and shows only:
  - signed-in reporter name
  - reporter's own report count
  - recommendation count
- Reporter profile was simplified to basic display-only account details.
- Auth workflow validation was updated to assert the corrected registration behavior.

Files changed:

- `web/app/api/auth/register/route.js`
- `web/app/reporter/dashboard/page.js`
- `web/app/reporter/profile/page.js`
- `web/lib/database-views.js`
- `web/components/ui/kit.jsx`
- `web/scripts/check-auth-workflows.js`

Validation after fix:

- `npm run check:auth`: passed
- `npm run check:phase3`: passed
- `npm run check:terms`: passed
- `npm run lint`: passed
- `npm run build`: passed
- `npm run check:auth-workflows` against fresh `http://localhost:3006`: passed

Note: `http://localhost:3005` appeared to be serving an older/stale running process during review. Fresh validation used port `3006` to confirm the current build.

## Current Limitations

- Browse/Search now read public report cards from SQLite.
- Track, Reporter My Reports, Reporter Connection Requests, and Admin Manage now read local database records.
- Reporter dashboard uses authenticated database counts for the signed-in reporter's own reports and recommendation count.
- Reporter profile is a simplified display-only account page.
- Report forms write report data, photo metadata, and local image files for new submissions.
- Contact request UI writes to the database.
- Reporter connection requests read local database contact requests.
- One legacy validation photo record still has `pending-local-metadata/...` because it was created before real file storage existed. It is intentionally not treated as a stored image.
- Recommendations are seeded demo records only; no AI or duplicate detection has been implemented.
- Local-demo authentication/session logic is implemented, but it is not production hardening.
- Public Track is limited to public reports only so limited/hidden reports are not shipped to public browser code.
- Stored report images are private local files under `web/storage/reports/`; public UI uses placeholders and does not expose storage paths.
- Local upload storage validates MIME type and size, but does not perform image content scanning or computer-vision face/person validation.
- The local database contains workflow-test users/sessions/contact requests created by validation scripts.

## Exact Next Task

Phase 2 is complete and has been superseded by completed Phase 3 report workflow hardening. Do not restart Phase 2.

Next phase name only after Phase 3 approval: Phase 4 AI Recommendation Foundation.
