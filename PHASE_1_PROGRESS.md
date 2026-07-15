# HumTrace AI Phase 1 Progress

Last updated: 2026-07-12

## Current Phase

Phase 1 frontend UI foundation is implemented. Do not start Phase 2 in this thread.

The app is a Next.js 14 App Router frontend in `web/`, using JavaScript/JSX only, Tailwind CSS, Lucide React, Recharts, React Hook Form, and Zod. It is UI-only: no database, authentication, persistence, AI service, real upload saving, notifications, email/SMS, or real contact sharing has been implemented.

## Completed Pages

Public pages:
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

Reporter pages:
- `/reporter/dashboard`
- `/reporter/my-reports`
- `/reporter/recommendations`
- `/reporter/connection-requests`
- `/reporter/profile`

Admin pages:
- `/admin/dashboard`
- `/admin/manage`

API:
- `/api/health`

Unknown routes:
- `app/not-found.js`

## Completed Components and UI Systems

Main shared UI implementation:
- `web/components/ui/kit.jsx`

Implemented component groups:
- Public navbar and footer
- Hero section
- Dashboard/stat cards
- Report cards
- Potential match cards
- Match score breakdown bars
- Contact request cards
- Timeline
- Status badges
- Privacy notice card
- Reporter sidebar
- Admin sidebar
- Page/section headers
- Search input and filter bar
- Empty state
- Loading skeleton
- Form section
- Visual-only file upload field
- Demo data notice
- Responsive data table/mobile cards
- Mobile drawer
- Responsive tabs
- Chart cards
- Notification cards
- Case ID display after report submission
- Confidence badge colors for public cards

## Important Files Created or Changed

Project and config:
- `web/package.json`
- `web/package-lock.json`
- `web/next.config.js`
- `web/tailwind.config.js`
- `web/postcss.config.js`
- `web/jsconfig.json`
- `web/.eslintrc.json`
- `web/README.md`

App routes:
- `web/app/page.js`
- `web/app/layout.js`
- `web/app/globals.css`
- `web/app/not-found.js`
- `web/app/api/health/route.js`
- All route `page.js` files under `web/app/`

Shared app code:
- `web/components/ui/kit.jsx`
- `web/data/mock-data.js`
- `web/lib/routes.js`
- `web/lib/constants.js`
- `web/lib/utils.js`

Validation scripts:
- `web/scripts/check-routes.js`
- `web/scripts/check-unsafe-terms.js`
- `web/scripts/check-javascript-only.js`
- `web/scripts/check-external-images.js`

Reference-only extraction:
- `stitch_reference/` contains extracted Stitch screenshots/design reference files. These are not app source files.

## Design and Product Decisions

- Visual style: dark navy professional UI, dark card surfaces, red `#E94560` as the primary accent.
- Current CSS tokens:
  - `--navy: #1A1A2E`
  - `--navy-2: #16213E`
  - `--navy-3: #0D1B2A`
  - `--red: #E94560`
  - `--red-dark: #C73652`
  - `--success: #27AE60`
  - `--warning: #F39C12`
  - `--danger: #E74C3C`
- Teal/cyan accent literals were removed from source.
- Public navigation uses: Home, Search, Report Missing, Report Unidentified, About, Contact.
- Public navigation now also exposes Browse and Track so users can discover those existing pages directly.
- Language was changed from command-center/spy tone to family-facing wording.
- AI output is framed as suggestions/potential matches and must not confirm identity.
- Contact remains hidden until a contact request is accepted.
- Admin is moderation/monitoring only, not an investigator and cannot confirm identity.
- `/report/hospital` was removed to keep Phase 1 at exactly 17 frontend routes.
- Phase 1 route-check script now expects 17 frontend pages plus `/api/health`.
- Report forms now require a photo upload UI before submission.
- Missing person reports require a full name; unidentified person reports allow the name to be unknown/optional.
- Photo upload includes Phase 1 frontend-only person/face guidance and a required user confirmation. Real person/face detection remains a future computer-vision/AI task.
- Submission now shows a clear UI notification with the generated demo case ID.
- Public report cards now open a same-page details modal from `View Details`, keeping Phase 1 at exactly 17 routes.
- Public case details and recommendation cards now use `Request Contact` instead of direct contact reveal. Contact details remain hidden until consent/approval in a future backend phase.
- Request Contact now opens a reason/message form and then shows that the request will appear in the reporter dashboard when backend persistence is added.
- Public Browse/Search is database browsing only; AI confidence/recommendation signals were removed from public report cards and details.
- AI recommendations are reserved for post-report and reporter recommendation workflows.

## Commands Already Run

Setup:
- `winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements`
- `npm install`

Development/runtime:
- `npm run start -- -p 3000`
- localhost health checks against `http://localhost:3000/api/health`

Validation:
- `npm run lint`
- `npm run build`
- `npm run check:routes`
- `npm run check:terms`
- `npm run check:js-only`
- `npm run check:images`

Browser checks:
- Full responsive route sweeps were run in the in-app browser across desktop, tablet, and mobile sizes.
- Latest sweep covered 17 pages at desktop/mobile widths and found no horizontal overflow or hospital route references.
- Login and register forms were verified as centered auth cards.
- Missing and unidentified report forms were verified through UI-only submission.
- Report upload requirements were verified as frontend-only Phase 1 validation.
- Browse `View Details` was verified to open a case details modal with limited public information and a Track link.
- Browse details and reporter recommendations were verified to expose request-contact UI without showing direct reporter contact details.
- Browse contact request form was verified: reason entered, request submitted, reporter-dashboard/hidden-contact message shown.
- Browse was verified to show public database cards without confidence badges or potential-match counts.
- Track Case was verified with the sample case ID.
- `/report/hospital` now resolves to the not-found page.

## Current Validation Status

Last known status before this handoff:
- Lint: passed
- Build: passed
- Route check: passed, 17 pages and health route present
- Unsafe identity wording scan: passed
- JavaScript-only scan: passed
- External-image scan: passed
- Browser responsive pass: passed for 17-route desktop/mobile sweep
- `/api/health`: passed

Note: npm previously reported dependency audit vulnerabilities after install. They are dependency-tree warnings and were not fixed in Phase 1.

## Current Bugs or Incomplete Items

Known incomplete by design:
- No Prisma schema yet
- No SQLite database yet
- No persistent storage
- No authentication/session logic
- No real uploads or local file saving
- No backend API for reports/search/contact requests
- No AI service
- No embeddings
- No duplicate detection
- No real top-5 recommendation generation
- No notifications
- No email/SMS
- No real contact-sharing workflow

Known technical/design debt:
- Most reusable UI is centralized in `web/components/ui/kit.jsx`, which is large. It is acceptable for Phase 1, but future phases may benefit from splitting it into smaller components before backend wiring.
- `stitch_reference/` is local reference material only and should not be treated as source.
- Existing safety term script intentionally scans for original prohibited identity-confirmation phrases; if wording policy changes, update the script carefully.
- Route count restored to the original 17 by removing `/report/hospital`.

## Git Status

`git status --short` was run from `C:\Users\SMSHOP\Desktop\humanTrace_AI`.

Result:
- This folder is not currently a Git repository.
- Command output: `fatal: not a git repository (or any of the parent directories): .git`

Because there is no `.git` repository, no commit was created and uncommitted changes cannot be summarized by git. No completed work needs to be recreated; all current work exists on disk in the workspace.

## Exact Next Task for New Codex Thread

Do not start Phase 2 until the user explicitly approves Phase 1.

Recommended next prompt:

```text
Phase 1 is approved. Start Phase 2 database foundation only.
Use Next.js JavaScript, Prisma ORM, and SQLite.
Create the schema and local database foundation for users, reports, photos, recommendations, contact requests, timeline events, notifications, and audit logs.
Do not add AI processing yet.
Do not add real authentication yet unless needed as UI-only scaffolding.
Stop after database foundation and validation.
```

## Handoff Notes

The next Codex thread should:
1. Reopen `PHASE_1_PROGRESS.md`.
2. Run `cd web && npm run lint && npm run build`.
3. Manually inspect `http://localhost:3000`.
4. Confirm Phase 1 approval with the user.
5. Only then begin Phase 2 database foundation.

No completed Phase 1 work needs to be recreated.
