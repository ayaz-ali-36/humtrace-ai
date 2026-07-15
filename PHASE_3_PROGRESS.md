# HumTrace AI Phase 3 Progress

Last updated: 2026-07-13

## Current Phase

Phase 3 report workflow, privacy, tracking, and data-integrity hardening is implemented for the local demo.

Phase 3 review/reverification was completed on 2026-07-13. The review did not add future features; it only inspected, tested, and fixed defects inside the approved Phase 3 scope.

No embeddings, recommendation scoring, duplicate detection, facial recognition, new frontend routes, email/SMS/WhatsApp delivery, or production deployment were added.

## Completed Features

- Report schema now includes structured Phase 3 fields:
  - `heightCm`
  - `weightKg`
  - `lastSeenLocation`
  - `foundLocation`
  - `clothing`
  - `identifyingFeatures`
  - `medicalCondition`
  - `reporterRelationship`
  - `reporterContext`
  - `relationshipContext`
  - `preferredContactMethod`
  - `publicVisible`
  - `lifecycleStatus`
- Missing and unidentified report submissions use shared server validation in `web/lib/report-validation.js`.
- Report forms now use a seven-step flow:
  1. Person Details
  2. Last Seen / Found Location
  3. Description
  4. Photo Upload
  5. Reporter Information
  6. Privacy and Consent
  7. Review and Submit
- Report submission creates report, photo metadata, timeline event, notification, and audit log transactionally.
- If the database transaction fails after file save, the saved local file is cleaned up.
- Upload validation now checks MIME type, size, and image magic bytes/signature for JPG, PNG, and WEBP.
- Private report images are stored under `web/storage/reports/<case-id>/`.
- Public pages use placeholders and do not expose storage paths.
- Public Browse/Search require:
  - `visibility = PUBLIC`
  - `publicVisible = true`
  - `status != HIDDEN`
  - selected public-safe fields only
- Track now uses exact lookup through `GET /api/track/[publicId]`; `/track` no longer loads a report collection into the browser.
- Track output is public-safe: case ID, type, safe status, submission date, last update, and generic timeline summaries only.
- Public contact requests are allowed only for explicitly public-visible reports.
- Existing Phase 2 auth, ownership, contact consent, and admin moderation behavior was preserved.
- Review fix: new report-photo rows now store `faceCheckStatus = "NOT_RUN"` instead of a stale Phase 2 marker.
- Review fix: the legacy `getTrackReports()` helper now also requires `publicVisible = true`, matching the active public tracking/privacy policy.
- Review fix: report gender input now uses allowed select values, and server validation normalizes lowercase gender values from old/direct submissions.
- Review fix: server report-validation errors now name the exact invalid field instead of returning generic `Invalid input`.
- Review fix: report submit error UI now prefixes the server message with `Please fix this:` so users know what to correct.
- Review fix: report forms now require only the core report fields requested for this phase: missing-person name, age, height in feet, weight, basic description, reporter name, reporter email, photo confirmation, and consent. Unidentified reports can still omit the unknown person's name.
- Review fix: location, date, gender, clothing, identifying features, medical condition, reporter phone, relationship, and context fields are optional and no longer block minimal report submission.

## Storage Design

- Raw uploaded images are local private files, not public assets.
- New files are saved under `web/storage/reports/<case-id>/`.
- `ReportPhoto.storagePath` stores a private relative path such as `storage/reports/MP-2026-0050/file.png`.
- The app does not expose physical storage paths through public APIs or public UI.
- No automated face/person/content validation exists yet.

## Public Field Allowlist

Browse/Search selects only:

- `publicId`
- `type`
- `fullName`
- `nameUnknown`
- `approximateAge`
- `gender`
- `broadRegion`
- `eventDate`
- `status`
- `visibility`
- `publicVisible`
- `description`

Track returns only:

- `id`
- `type`
- `status`
- `date`
- `lastUpdate`
- generic timeline summaries

## Files Added or Changed

- `web/prisma/schema.prisma`
- `web/prisma/migrations/20260713020000_phase3_report_workflows/migration.sql`
- `web/scripts/apply-phase3-report-migration.js`
- `web/scripts/check-phase3-report-foundation.js`
- `web/scripts/check-phase3-workflows.js`
- `web/lib/report-validation.js`
- `web/lib/upload-storage.js`
- `web/lib/public-reports.js`
- `web/lib/database-views.js`
- `web/app/api/reports/route.js`
- `web/app/api/reports/[publicId]/route.js`
- `web/app/api/track/[publicId]/route.js`
- `web/app/api/contact-requests/route.js`
- `web/app/track/page.js`
- `web/components/ui/kit.jsx`
- `web/lib/report-validation.js`
- `web/package.json`
- `web/package-lock.json`
- `web/README.md`
- `PHASE_3_PROGRESS.md`

Review fixes on 2026-07-13:

- `web/app/api/reports/route.js`
- `web/lib/database-views.js`
- `web/lib/report-validation.js`
- `web/components/ui/kit.jsx`
- `web/scripts/check-phase3-workflows.js`
- `web/app/api/reports/route.js`
- `PHASE_3_PROGRESS.md`

## Commands Run

- `npm run db:phase3-migrate`
- `npx prisma generate`
- `npm run db:validate`
- `npm run check:db`
- `npm run check:phase3`
- `npm run check:public-reports`
- `npm run check:uploads`
- `npm run check:auth`
- `npm run check:js-only`
- `npm run check:routes`
- `npm run check:terms`
- `npm run check:images`
- `npm run lint`
- `npm run build`
- `npm run check:auth-workflows` against `http://localhost:3005`
- `npm run check:phase3-workflows` against `http://localhost:3005`

Review/reverification commands run on 2026-07-13:

- `git status --short` from project root; result: not a Git repository
- `npm run db:validate`
- `npm run check:db`
- `npm run check:phase3`
- `npm run check:public-reports`
- `npm run check:uploads`
- `npm run check:auth`
- `npm run check:js-only`
- `npm run check:routes`
- `npm run check:terms`
- `npm run check:images`
- `npm run lint`
- `npm run build`
- `npm run check:auth-workflows` against `http://localhost:3005`
- `npm run check:phase3-workflows` against `http://localhost:3005`
- Direct Prisma metadata check for latest `ReportPhoto.faceCheckStatus`

## Validation Results

- Prisma schema validation: passed
- Prisma Client generation: passed after stopping an old local Next server that locked Prisma files
- Database foundation check: passed
- Phase 3 report foundation check: passed
- Public reports query check: passed
- Upload storage check: passed
- Auth foundation check: passed
- JavaScript-only check: passed
- Route count check: passed, 17 pages and health route present
- Unsafe wording check: passed
- External image check: passed
- Lint: passed
- Build: passed
- Auth workflow regression: passed
- Phase 3 workflow regression: passed

Review/reverification results on 2026-07-13:

- Build and run: passed; app started with `next start -p 3005` and `/api/health` responded
- Prisma schema validation: passed
- Database foundation check: passed; latest counts were 13 users, 6 sessions, 6 reports, 6 photos, 1 recommendation, 9 contact requests, 32 timeline events, 33 notifications, and 33 audit logs before rerunning workflow checks
- Phase 3 report foundation check: passed
- Public reports query check: passed; 1 public database record available for Browse/Search
- Upload storage check: passed before and after workflow rerun; after the fix it checked 7 photo records, verified 4 stored files, and noted 1 legacy metadata-only record
- Auth foundation check: passed
- JavaScript-only check: passed; no `.ts` or `.tsx` files found
- Route count check: passed; 17 pages and health route present
- Unsafe wording scan: passed
- External image scan: passed
- Lint: passed with no warnings or errors
- Build: passed; non-fatal webpack cache snapshot warnings remain
- Phase 3 workflow regression: passed against `http://localhost:3005`
- Auth workflow regression: passed against `http://localhost:3005`
- Latest validation-created photo stored `faceCheckStatus = "NOT_RUN"` and a private `storage/reports/...` path
- Gender validation defect found during manual form review: lowercase `male` was rejected. Fixed by using a gender select in the report form and normalizing lowercase gender values server-side.
- Post-fix checks passed: `npm run check:phase3`, `npm run check:terms`, `npm run lint`, and `npm run build`.
- Generic validation-message defect found during manual form review: the UI displayed `Invalid input` without naming the bad field. Fixed server-side error formatting and frontend submit-error wording.
- Expanded `npm run check:phase3-workflows` to verify missing and unidentified report submission, lowercase gender normalization, invalid image rejection, future date rejection, unsupported relationship error text, missing consent error text, exact tracking privacy, and valid tracking-code responses.
- Expanded live workflow checks passed against fresh `http://localhost:3007`, followed by auth workflow regression on the same server.
- Required-field simplification validated on 2026-07-13: minimal missing and unidentified report submissions pass with optional location/date/relationship blank; missing height and missing weight fail with clear field-specific messages.
- Post-simplification checks passed: `npm run check:phase3`, `npm run check:terms`, `npm run lint`, `npm run build`, `npm run check:phase3-workflows` against `http://localhost:3008`, and `npm run check:auth-workflows` against `http://localhost:3008`.

## Current Limitations

- No AI recommendation scoring has been added.
- No duplicate detection has been added.
- No facial recognition or automated content validation has been added.
- After submit, the app saves the report and shows a case ID, but it does not yet generate or display immediate recommendations.
- The agreed next workflow direction is to show public-safe possible recommendations immediately after report submission without requiring login, while requiring login for saving/managing reports and contact-request actions.
- Public pages still use fictional placeholders for images.
- Profile/settings areas remain mostly display-only.
- Local-demo authentication is not production hardening.
- The local database includes workflow-test users/reports/contact requests created by validation scripts.
- Build completed with non-fatal webpack cache warnings about snapshotting dependencies.
- One legacy validation photo record still has metadata-only storage from before private upload storage existed.
- Full browser-based responsive/accessibility review was not rerun in this pass; build/static route checks passed, and manual viewport checks are still recommended before approval.

## Exact Next Task

Phase 3 review is complete and has been superseded by approved Phase 4 Recommendation Workflow Foundation work. Do not restart Phase 3.

Next phase name only after Phase 4 approval: Phase 5 Real AI Service Integration.

Phase 4 implemented deterministic, privacy-safe possible recommendation generation after report submission:

- Show the submitted case ID.
- Show the first 5 public-safe possible recommendations immediately.
- Allow viewing the next 5 recommendations.
- Provide an `Explore Public Cases` path if recommendations are not useful.
- Require login for contact requests, saved dashboard history, and report management.
- Never claim identity confirmation.
