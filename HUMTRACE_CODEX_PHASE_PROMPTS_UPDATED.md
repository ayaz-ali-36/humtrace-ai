# HumTrace AI - Updated Codex Phase Prompts

Updated from the repository state documented on 2026-07-12.

This prompt pack replaces the old phase prompts for all future work. It is based on the actual code in `web/`, `PHASE_1_PROGRESS.md`, and `PHASE_2_PROGRESS.md`.

## Current project position

- Phase 1 UI foundation is complete and validated.
- All 17 required frontend routes and `/api/health` exist.
- The project is Next.js 14 App Router, JavaScript/JSX only, and Tailwind CSS.
- Prisma 6.19 and SQLite are installed. The current schema has User, Report, ReportPhoto, Recommendation, ContactRequest, TimelineEvent, Notification, and AuditLog models.
- Public Browse/Search read public-safe records from SQLite.
- Missing and unidentified report forms already write reports and local image files.
- Track, Reporter My Reports, Reporter Connection Requests, and Admin Manage already read some database data.
- Contact-request creation and admin report visibility/status updates already write to the database.
- Authentication, sessions, authorization, password hashing, and role protection are not implemented.
- Reporter database views are not scoped to a signed-in user yet.
- Contact-request accept/decline/cancel actions are not implemented.
- Contact details are not genuinely revealed from authenticated user preferences after acceptance.
- Some dashboards, profile/settings, and recommendations still use mock data.
- Face/text embeddings, duplicate detection, recommendation generation, and real AI are not implemented.
- Current uploaded report images are stored under `public/uploads`, which must be reviewed before production because sensitive files under `public/` can be fetched directly.
- The README is stale and still describes the app as Phase 1 UI-only.
- Phase 1 must not be rebuilt. Already working Phase 2 database/report functionality must be preserved and secured.

## Recommended order from now

1. Paste the Master Continuation Prompt.
2. Paste Phase 2 Completion: Authentication, Authorization, Ownership, and Consent Actions.
3. Run the Review Prompt and manually approve the phase.
4. Paste Phase 3 Completion: Reports, Privacy, Tracking, and Data Integrity.
5. Run the Review Prompt and manually approve the phase.
6. Paste Phase 4: Mock Recommendation Engine and Consent-Based Connections.
7. Run the Review Prompt and manually approve the phase.
8. Paste Phase 5: Admin Completion, Full QA, Documentation, and Demo/Deployment Preparation.

Do not use the old Phase 1 prompt again. Do not use the old Phase 2 prompt as written because much of its database and report scope is already implemented while its authentication scope is still missing.

---

# 1. Master Continuation Prompt

Paste this at the start of every new Codex task before the current phase prompt.

```text
You are my senior full-stack software engineer for my FYP project, HumTrace AI.

Repository location:
- Project root: C:\Users\SMSHOP\Desktop\humanTrace_AI
- Next.js application: C:\Users\SMSHOP\Desktop\humanTrace_AI\web

Before planning or editing:
1. Read PHASE_1_PROGRESS.md completely.
2. Read PHASE_2_PROGRESS.md completely.
3. Read the current phase prompt completely.
4. Inspect the existing implementation and package.json. Treat the repository as the source of truth when a progress note is stale.
5. Check git status if this is a Git repository. Preserve unrelated user changes. If it is not a Git repository, say so once and continue carefully.
6. Do not recreate completed work and do not overwrite working code with a fresh scaffold.

PROJECT PURPOSE
HumTrace AI is a privacy-preserving, AI-assisted recommendation platform for missing-person and unidentified-individual reports in Pakistan.

PRODUCT SAFETY RULES
- The system only generates possible recommendations for human review.
- The system never confirms identity and never declares that two people are the same person.
- A recommendation score is not a probability, identity proof, forensic conclusion, or guarantee.
- Reporter review and mutual consent are required before limited contact information is shared.
- Admin is a monitoring and moderation role, not an investigator.
- Admin cannot confirm or reject identity, declare a case solved, approve a recommendation as true, or force contact sharing.
- Public pages must never expose email, phone, exact address, medical details, private notes, reporter identity, embeddings, AI scores, connection data, or unreviewed private images.
- Never use real missing-person data, real contact data, or real identifying photos in seed/demo/test content.

SAFE UI WORDING
Prefer:
- Possible Recommendation
- AI-Suggested Similarity
- Recommendation Score
- Request to Connect
- Connection Accepted
- Contact Shared After Consent
- Closed by Reporter
- Archived
- Public-Safe Record
- Recommendation Engine
- Description Similarity
- Face Similarity

PROHIBITED IDENTITY/OUTCOME WORDING
Scan user-facing code for claims such as Match Found, Identity Confirmed, Confirm Match, Reject Match, AI Verified Identity, Case Solved, Person Located, Forensic Match, Verified Identity, Match Accuracy, or equivalent claims. A prohibited phrase may appear only inside the safety-scanner's own test/config list, never as a product claim.

FIX LEGACY WORDING WHEN TOUCHED
Some Phase 1 code still uses labels such as potential match, resolved, or approval. When working in the relevant file, replace ambiguous identity/outcome wording with the approved recommendation and reporter-closure vocabulary. Do not perform a risky unrelated rewrite only for cosmetic wording.

TECHNICAL BASELINE
- Next.js 14 App Router
- JavaScript/JSX only; do not create TypeScript files
- Tailwind CSS
- Prisma ORM 6.19.x
- SQLite for the local FYP demo
- React Hook Form and Zod
- Lucide React and Recharts
- Local development storage only until deployment architecture is explicitly addressed

ROUTE CONTRACT
Keep exactly these 17 frontend routes:

PUBLIC
- /
- /search
- /browse
- /report/missing
- /report/unidentified
- /track
- /about
- /contact
- /login
- /register

REPORTER
- /reporter/dashboard
- /reporter/my-reports
- /reporter/recommendations
- /reporter/connection-requests
- /reporter/profile

ADMIN
- /admin/dashboard
- /admin/manage

Keep /api/health. API routes required by the current phase are allowed and do not count as frontend pages.

Do not create these frontend routes:
- /reporter/notifications
- /admin/reports
- /admin/users
- /admin/analytics
- /admin/audit-logs
- /admin/settings

Reporter notifications stay in Reporter Dashboard. Admin analytics stay in Admin Dashboard. Reports, Users, Audit Logs, and Settings stay as tabs in Admin Manage.

STRICT DEVELOPMENT LOOP

STEP 1 - INSPECT AND PLAN
- Confirm the current repository state instead of trusting the old prompt blindly.
- Briefly state what is already complete, what this phase will add, expected files, migration impact, privacy/security risks, and verification plan.
- Identify any existing behavior that this phase must preserve.

STEP 2 - BUILD ONLY THE CURRENT PHASE
- Make the smallest coherent changes needed for this phase.
- Reuse current routes and components.
- Do not add future-phase AI or deployment features early.
- Do not silently change the route contract, stack, Prisma major version, product policy, or visual design.

STEP 3 - SELF-REVIEW
Inspect the actual diff and check:
- Syntax and missing imports
- Server/client component boundaries
- Broken routes and API contracts
- Validation and clear error states
- Authentication, authorization, object ownership, and role checks where relevant
- Data exposure in server queries and serialized props
- Contact privacy and consent enforcement
- Unsafe identity wording
- Accidental TypeScript files
- Prisma relation/migration/data integrity issues
- Uploaded-file safety where relevant
- Mobile layout and accessibility for changed UI
- Accidental edits to seed/demo data or user files

STEP 4 - RUN RELEVANT CHECKS
Run checks from web/. Use the scripts that exist in package.json, including the relevant subset of:
- npm run lint
- npm run build
- npm run check:routes
- npm run check:terms
- npm run check:js-only
- npm run check:images
- npm run db:validate
- npm run db:generate
- npm run check:db
- npm run check:public-reports
- npm run check:uploads

Run phase-specific API or browser workflow tests as well. Do not claim a flow works only because the build passes.

PRISMA NOTE
This Windows environment previously produced a blank Prisma schema-engine error for migrate dev/db push, although validate, generate, and migrate diff worked. First attempt the normal non-destructive Prisma workflow. Preserve the existing migration history. If the same environment-specific failure occurs, record the exact command/output, generate and inspect migration SQL using Prisma, apply only the reviewed migration through a safe documented fallback, and verify the final schema with Prisma Client. Never delete or reset the existing database merely to make migration easier.

STEP 5 - BUG-FIX LOOP
If a check or workflow fails, identify the cause, apply the smallest safe fix, and rerun the same check. Repeat until stable or until genuinely blocked by a decision requiring my input.

STEP 6 - SAFETY AND PRIVACY SCAN
- Run the existing term scanner.
- Search changed code for sensitive fields returned to public or unauthorized clients.
- Confirm accepted contact is the only state that can reveal the permitted contact method.
- Confirm admin has no identity-confirmation or forced-contact action.

STEP 7 - UPDATE HANDOFF DOCUMENTATION
After the phase is stable, update the appropriate progress document with verified facts only. Update README/package scripts when their instructions or project-status claims became stale.

STEP 8 - STOP AND REPORT
Report:
1. Outcome and pass/fail status
2. What was built
3. Files changed
4. Schema/migration changes
5. Commands and workflow tests run
6. Bugs found and fixed
7. Remaining limitations
8. Exact manual tests I should perform
9. Whether the current phase is ready for approval
10. The next phase name only

Do not begin the next phase until I explicitly approve this one.
```

---

# 2. Phase 2 Completion Prompt - Authentication, Authorization, Ownership, and Consent Actions

This is the next prompt to use now.

```text
PHASE 2 COMPLETION: AUTHENTICATION, AUTHORIZATION, OWNERSHIP, AND CONTACT-REQUEST ACTIONS

Continue from the existing Phase 1 UI and partially completed Phase 2 database/report implementation. Do not rebuild Prisma, reports, uploads, Browse/Search, Track, My Reports, or Admin Manage from scratch.

GOAL
Close the most important security and ownership gaps before adding AI. Implement real local-demo authentication, server-enforced role/ownership authorization, user-scoped reporter data, and consent-based contact-request review actions.

DO NOT ADD IN THIS PHASE
- Face/text embeddings
- Duplicate detection
- Recommendation generation
- DeepFace, FastAPI, or any real AI service
- Email, SMS, or WhatsApp delivery
- New frontend routes
- Production cloud deployment

PART A - SCHEMA AND DATA MIGRATION
1. Extend User with the fields needed by the existing product contract, without discarding existing data:
   - full name (reuse/rename the current name field safely)
   - email
   - optional phone
   - optional region
   - passwordHash
   - role
   - preferredContactMethod
   - active/deactivated state
   - createdAt and updatedAt
2. Add a secure server-side session model if using opaque database sessions. Store only a hash of the session token, plus user, expiry, and timestamps. Do not store raw session tokens in the database.
3. Use explicit centralized constants/enums-in-code for role and status values so casing does not drift across APIs and UI.
4. Keep existing seed reports and relations valid. Add/update one fictional admin and at least two fictional reporter accounts with bcrypt password hashes and clearly documented demo credentials.
5. Do not expose passwordHash or session records through page props, API responses, logs, or audit details.

PART B - AUTHENTICATION
1. Install/use bcryptjs for password hashing and verification.
2. Implement register, login, logout, and current-session APIs using secure validation.
3. Public registration can create REPORTER accounts only. The request body must never be able to create ADMIN.
4. Normalize email consistently and enforce unique email.
5. Use a cryptographically random opaque session token in an HttpOnly cookie with SameSite=Lax, Path=/, an expiry, and Secure in production. Store/compare a hash of the token server-side.
6. Rotate/create a new session at login, delete/revoke it at logout, and reject expired sessions.
7. Deactivated users cannot log in and existing sessions for them must not authorize protected actions.
8. Return generic login failure messages that do not reveal whether an email exists.
9. Do not put authentication tokens in localStorage or expose them to client JavaScript.
10. Connect the existing /register and /login forms to the real APIs with pending, success, validation, and error states.
11. Reporter login redirects to /reporter/dashboard. Admin login redirects to /admin/dashboard.
12. Replace Phase 1 preview-only auth messages with accurate behavior.

PART C - ROUTE AND API AUTHORIZATION
1. Protect reporter and admin layouts on the server.
2. Logged-out access to protected pages redirects to /login with a safe return target.
3. Reporter cannot access admin pages or admin mutations.
4. Admin cannot access reporter-owned actions merely by changing a URL or request body.
5. Every protected mutation must derive the acting user from the server session, never from a client-submitted userId/email/role.
6. Validate return/redirect URLs to prevent open redirects.
7. Add working logout controls to reporter/admin navigation.

PART D - REPORT OWNERSHIP
1. Change Reporter My Reports to query only reports owned by the authenticated reporter.
2. Do not load all reports and filter them in the browser.
3. A signed-in report submission must attach the report to the session user, not upsert identity from a submitted email.
4. Preserve public report submission, but never attach an anonymous submission to an existing registered account merely because the user typed that account's email.
5. Choose and implement a safe explicit anonymous ownership policy:
   - anonymous reports remain track-only until securely claimed, or
   - implement a one-time claim secret whose raw value is shown once and whose hash is stored.
   Document the chosen behavior clearly. Do not invent account ownership from publicId alone.
6. Any report read/update endpoint must enforce public visibility, owner access, or admin moderation access as appropriate.

PART E - CONTACT REQUEST REVIEW
1. Add authenticated accept, decline, and requester-cancel actions using the existing ContactRequest model and route/page.
2. Only the actual recipient may accept/decline. Only the actual requester may cancel.
3. Enforce valid state transitions and make repeated requests idempotent or return a clear conflict.
4. Prevent duplicate active requests for the same reporter/report pair at the database or transaction layer, not only in UI.
5. Create notifications, timeline events where a report is linked, and audit logs for sent, accepted, declined, and cancelled actions.
6. Contact remains hidden for pending, declined, cancelled, and expired requests.
7. After acceptance, reveal only each user's selected preferred contact method and only to the two participants. Do not return all profile fields.
8. The acceptance modal must state: "If you accept, your selected contact method will be shared with the other reporter. This does not confirm identity."
9. Admin cannot accept/decline on behalf of a reporter and cannot force contact disclosure.

PART F - TESTS AND VALIDATION
Add focused repeatable checks where practical. Verify at minimum:
- Reporter registration succeeds.
- Duplicate email is blocked safely.
- Public registration cannot create an admin.
- Correct login works; wrong password fails generically.
- Logout revokes access.
- Expired/deactivated sessions fail.
- Logged-out users cannot access protected pages.
- Reporter cannot access admin pages/APIs.
- Reporter A cannot see Reporter B's reports.
- Admin moderation works only for admin.
- Anonymous submission cannot hijack an account by email.
- Only recipient can accept/decline.
- Only requester can cancel.
- Duplicate active request is blocked.
- Contact is hidden before acceptance and after decline/cancel.
- Only the allowed preferred contact value is visible to both participants after acceptance.
- No password hash or session token appears in any response.
- Existing public Browse/Search and report submission behavior still works.
- All existing project validation scripts and npm run build pass.

PHASE HANDOFF
Update PHASE_2_PROGRESS.md and README to reflect the real authenticated/database-backed state. Clearly document demo credentials, session behavior, anonymous-report ownership behavior, migration handling, and remaining non-AI limitations. Stop after the phase summary and wait for approval.
```

---

# 3. Phase 3 Completion Prompt - Reports, Privacy, Tracking, and Data Integrity

Use only after Phase 2 Completion is approved.

```text
PHASE 3 COMPLETION: REPORT WORKFLOWS, PRIVATE MEDIA, PUBLIC-SAFE DATA, TRACKING, AND DATA INTEGRITY

Continue from the approved authenticated Phase 2 implementation. The basic report APIs, SQLite writes, local image saving, Browse/Search, Track, My Reports, and Admin Manage already exist. Harden and complete them; do not recreate them.

GOAL
Make both report types complete, ownership-safe, privacy-safe, and consistent from form submission through My Reports, public Browse/Search, and Track.

DO NOT ADD IN THIS PHASE
- Embeddings or recommendation scoring
- Duplicate detection
- Real facial recognition
- Connection flows beyond preserving the approved Phase 2 behavior
- New frontend routes

PART A - COMPLETE REPORT DATA CONTRACT
1. Compare the existing forms, API, and Prisma schema field by field.
2. Add/migrate the missing structured fields needed by the UI and FYP requirements, including as applicable:
   - Missing: fullName, age/estimated age, gender, height, weight, reporterRelationship, lastSeenLocation, broad region/city, dateMissing, description, clothing, identifyingFeatures, optional medicalCondition, preferredContactMethod, consent, publicVisible.
   - Unidentified: optional/unknown name, estimatedAge, gender, height, weight, foundLocation, broad region/city, dateFound, description, clothing, identifyingFeatures, optional medicalCondition, reporter/organization context, relationshipContext, preferredContactMethod, consent, publicVisible.
3. Separate sensitive/private fields from public-safe fields in query mapping. Do not rely on the UI to hide data that the server already serialized.
4. Use shared Zod schemas for server validation and compatible client feedback.
5. Reject impossible/invalid dates, invalid enum/status values, oversized text, and malformed requests with useful errors.
6. Preserve existing valid records through a reviewed migration/backfill.

PART B - STEP FORMS AND SUBMISSION
1. Keep the existing visual design and turn each report form into a reliable seven-step flow with progress, Back/Next, validation per step, review, and final submission.
2. Preserve entered values between steps and prevent duplicate submit clicks.
3. Use the approved disclaimer/consent text and require explicit consent.
4. Return a unique public tracking code after success.
5. Clearly distinguish successful database persistence from demo-only behavior.
6. Create report, photo metadata, timeline event, notification where applicable, and audit log transactionally. If file saving succeeds but the database transaction fails, clean up the orphan file safely.
7. Handle public/anonymous and signed-in ownership exactly as approved in Phase 2.

PART C - IMAGE PRIVACY AND FILE SAFETY
1. Review the current public/uploads storage. Raw/unreviewed report images must not be directly enumerable or publicly fetchable by guessed URL.
2. Move new sensitive uploads to a non-public local storage directory for the local demo, or implement an authenticated/visibility-checked media route. Migrate or quarantine the existing validation upload without breaking its database record.
3. Public pages may show an image only after an explicit public-safe review/visibility decision. Otherwise show a fictional placeholder.
4. Validate extension, MIME type, file signature/magic bytes, size, and generated server-side filename. Never trust the submitted filename as a path.
5. Accept only JPG/JPEG, PNG, and WEBP. Reject SVG and executable/polyglot-like invalid input.
6. Prevent path traversal and avoid returning physical storage paths to clients.
7. Keep the limitation explicit: no automated face/person/content validation exists yet.

PART D - TRACK, SEARCH, BROWSE, AND MY REPORTS
1. Track must query only the supplied public tracking code; do not load every report into the page/client.
2. Tracking output must be public-safe: type, submission date, last update, safe status, and safe timeline only. No owner, contact, sensitive details, private image path, AI data, or internal audit information.
3. Add basic abuse resistance appropriate for a local demo: normalized exact tracking lookup, generic not-found response, input limits, and no record enumeration endpoint.
4. Browse/Search must query only records explicitly eligible for public display and select only allowlisted fields at the database layer.
5. Search filters must be server-validated and bounded. Do not leak hidden/limited records through counts, errors, or direct IDs.
6. My Reports must remain scoped to the authenticated user and show actual stored records, status, visibility, and safe timeline.
7. Align lifecycle vocabulary with: active, recommendations_generated, connection_requested, connected, closed_by_reporter, archived, plus moderation visibility states where separately needed. Do not use an identity-confirming resolved state.

PART E - VALIDATION
Test at minimum:
- Both seven-step forms on desktop and mobile.
- Missing and unidentified submissions with all structured fields.
- Required consent and photo validation.
- Invalid MIME, spoofed extension/signature, oversized file, and path-like filename rejection.
- Database/file consistency on success and simulated failure.
- Unique tracking code generation under repeated submissions.
- Exact public-safe track response and unknown code behavior.
- Owner-only My Reports.
- Anonymous ownership/claim policy.
- Public Browse/Search excludes limited, hidden, archived-as-private, and sensitive fields.
- Raw private upload URLs cannot be fetched without authorization/public eligibility.
- Existing authentication and contact consent tests still pass.
- Lint, build, Prisma, route, JavaScript-only, image, public-report, upload, and wording checks pass.

PHASE HANDOFF
Create or update PHASE_3_PROGRESS.md and README with the verified schema, storage design, public field allowlist, commands, tests, known limitations, and exact next phase. Stop and wait for approval.
```

---

# 4. Phase 4 Prompt - Mock Recommendation Engine and Consent-Based Connections

Use only after Phase 3 Completion is approved.

```text
PHASE 4: DETERMINISTIC MOCK RECOMMENDATION ENGINE, DUPLICATE WARNINGS, AND COMPLETE CONSENT-BASED CONNECTIONS

Continue from approved Phases 1-3. Authentication, ownership, report persistence, private media, public-safe queries, and base contact-request actions must already be stable.

GOAL
Implement an explainable deterministic mock recommendation system for the FYP demo. It may rank possible recommendations, but it must never claim or confirm identity.

DO NOT ADD IN THIS PHASE
- DeepFace
- Python/FastAPI AI service
- Real facial recognition or biometric identification
- External AI APIs
- Automatic identity decisions
- Admin approval of recommendation truth
- New frontend routes

PART A - SCHEMA
1. Add FaceEmbedding and TextEmbedding models linked to reports/photos as appropriate. Store vectors as JSON strings for this local mock phase and include generator version/timestamps.
2. Extend Recommendation with explicit component scores:
   - faceScore
   - ageScore
   - genderScore
   - heightScore
   - weightScore
   - locationScore
   - descriptionScore
   - finalScore
   - sharedAttributes/explanation
   - generatorVersion
   - status and timestamps
3. Use a unique source/target constraint and prevent self-pairs and same-type cross-recommendations.
4. Recommendation statuses: generated, viewed, connection_requested, connected, dismissed_by_user, expired.
5. Preserve or clearly replace the existing seeded demo Recommendation row so it cannot be mistaken for generated output.

PART B - DETERMINISTIC MOCK EMBEDDINGS
1. Create small modules under lib/ai/ for deterministic mock face embedding, deterministic text embedding, vector parsing/validation, cosine similarity, scoring, and recommendation generation.
2. Generate the face mock from a stable non-sensitive report/photo identifier, not from claimed visual recognition.
3. Generate the text mock deterministically from normalized description text.
4. Store finite bounded vectors and safely handle missing/corrupt vectors and zero magnitude.
5. Clearly label the implementation and UI as mock/demo logic. Never imply that the uploaded image was genuinely analyzed.

PART C - DUPLICATE WARNING
1. Compare a new report only with existing reports of the same type.
2. Use a configurable threshold, initially 95, and document that it is a mock similarity threshold rather than identity confidence.
3. Show a warning without blocking submission.
4. Avoid returning private candidate data in the warning.
5. Add safe timeline/audit metadata without identity claims.

PART D - RECOMMENDATION GENERATION
1. Compare Missing reports only with eligible Unidentified reports and vice versa.
2. Use the formula:
   finalScore = faceScore * 0.40
              + ageScore * 0.15
              + genderScore * 0.10
              + heightScore * 0.10
              + weightScore * 0.05
              + locationScore * 0.10
              + descriptionScore * 0.10
3. Define each component algorithm, normalization, missing-value behavior, score range, rounding, and tie-break order in code comments/docs.
4. Do not treat unknown/missing attributes as a perfect similarity. Use a documented neutral or reduced contribution and normalize consistently.
5. Save at most the Top 5 eligible recommendations per source report, sorted deterministically.
6. Generate both directions consistently or define one canonical pair and query it safely; do not create contradictory duplicates.
7. Run generation in a transaction-safe/idempotent workflow so retries do not duplicate rows.

PART E - REPORTER RECOMMENDATIONS UI
1. Replace the Phase 1 mock recommendation cards with authenticated database records belonging only to the signed-in reporter's reports.
2. Show Possible Recommendation, Recommendation Score, component breakdown, shared attributes, and a clear mock/demo label.
3. Add this visible disclaimer: "This is an AI-generated recommendation only. It does not confirm identity. Contact information is shared only after mutual consent."
4. Support Request to Connect, Not Relevant to My Report, and Hide Recommendation with server-enforced ownership and valid status transitions.
5. Do not expose the other reporter's identity or contact before an accepted request.

PART F - CONNECTION INTEGRATION
1. A request from a recommendation must link requester report, target report, recommendation, requester, and recipient consistently. Add the required schema relation if missing.
2. Only the owner of the source report can request connection.
3. Reuse the approved Phase 2 accept/decline/cancel privacy rules.
4. Prevent duplicate active requests for the same recommendation.
5. Update recommendation/report statuses, notifications, timelines, and audit logs transactionally.
6. Acceptance reveals only the mutually permitted preferred contact methods to the two authenticated participants.
7. Decline/cancel/expiry keeps contact hidden.
8. Admin can monitor counts and moderate content but cannot accept, decline, connect, or reveal contact for users.

PART G - VALIDATION
Create deterministic tests/check scripts covering:
- Same input produces the same mock vectors and scores.
- Different stable inputs produce valid bounded vectors.
- Cosine similarity handles invalid/zero vectors safely.
- Same-type duplicate warning appears above threshold and does not block submission.
- Cross-type recommendation generation only.
- Exact formula and score bounds.
- Unknown fields do not inflate scores.
- Top 5 limit, descending deterministic order, and idempotent regeneration.
- Reporter cannot view or mutate another reporter's recommendations.
- Request links the correct reports/users/recommendation.
- Duplicate active request is blocked.
- Contact remains hidden until acceptance.
- Accepted contact is visible only to the two participants.
- Admin cannot force connection/contact.
- All prior checks, lint, build, Prisma validation/generation, and wording scan pass.

PHASE HANDOFF
Create/update PHASE_4_PROGRESS.md and README. Document explicitly that all embeddings and similarities are deterministic mock/demo outputs, not biometric or identity evidence. Stop and wait for approval.
```

---

# 5. Phase 5 Prompt - Admin Completion, Full QA, Documentation, and Demo/Deployment Preparation

Use only after Phase 4 is approved.

```text
PHASE 5: ADMIN COMPLETION, FULL QA, DOCUMENTATION, AND LOCAL DEMO/DEPLOYMENT PREPARATION

Continue from approved Phases 1-4. Do not add new product features. Replace remaining Phase 1 mock widgets only where required to complete existing routes.

GOAL
Finish the simplified admin experience, remove stale mock behavior, verify every end-to-end workflow and privacy boundary, update documentation, and prepare a reliable local FYP demonstration with honest deployment limitations.

PART A - ADMIN DASHBOARD
1. Make /admin/dashboard read real aggregate data from the database with admin-only server authorization.
2. Show Total Users, Total Reports, Missing Reports, Unidentified Reports, Possible Recommendations Generated, Connection Requests, Public Reports, Hidden Reports, Reports by City/Region, Reports by Month, Connection Acceptance Rate, and Recent Activity.
3. Define zero-denominator behavior for acceptance rate and label mock recommendation counts accurately.
4. Do not send unnecessary raw personal records to chart components.
5. Show: "Admin moderation does not confirm or reject identity. HumTrace AI only generates possible recommendations for reporter review."

PART B - ADMIN MANAGE
Keep one /admin/manage page with Reports, Users, Audit Logs, and Settings tabs.

Reports:
- View the moderation-safe record.
- Hide, restore, or archive inappropriate public content.
- Require valid server-side transitions and write audit logs.
- Do not change report ownership or identity outcome.

Users:
- View minimum necessary account data and report count.
- Activate/deactivate accounts with safeguards preventing accidental loss of the last active admin.
- Revoke sessions on deactivation.
- Never expose password hashes, session data, or accepted private contact exchanges.

Audit Logs:
- Read-only, paginated/bounded, newest first.
- Show actor, action, module/resource, record ID, timestamp, and safe details.
- Do not store or display passwords, raw session/claim tokens, full private report text, or unnecessary contact values.

Settings:
- Public search enabled
- Report submission enabled
- Recommendation display threshold
- Duplicate warning threshold
- Maintenance mode
- Persist settings using a SystemSetting model or a clearly structured equivalent.
- Enforce settings in the relevant server APIs, not only visually.
- Validate threshold ranges and audit changes.
- Show: "Recommendation thresholds affect which possible similarities are displayed. They do not confirm identity."

Admin must never receive controls to confirm/reject identity, approve recommendation truth, declare official resolution, or force contact sharing.

PART C - REMOVE STALE MOCK/PHASE LABELS
1. Inventory mock-data imports and preview-only messages.
2. Replace them with database-backed data on functional authenticated/admin/report/recommendation pages.
3. Keep only clearly labeled fictional demo/empty-state data where appropriate.
4. Update /api/health so its phase/capability description is accurate without exposing secrets or database internals.
5. Update README so it no longer claims the application is UI-only.

PART D - UI, ACCESSIBILITY, AND RESPONSIVENESS
1. Verify all 17 routes at desktop, tablet, and mobile widths.
2. Fix horizontal overflow, clipped text, broken drawers/tabs/modals, inconsistent buttons/status badges, and inaccessible form errors.
3. Verify keyboard navigation, visible focus, modal focus/close behavior, labels, headings, alt text, and chart fallbacks.
4. Ensure privacy notices and mock-AI limitations remain visible at decision points.
5. Ensure sample data and images are fictional.

PART E - SECURITY AND PRIVACY QA
Verify server-side, not just UI:
- Authentication/session expiry/logout/deactivation
- Role restrictions
- Owner-only reports and recommendations
- Object-level authorization for every mutation
- Anonymous ownership/claim security
- Public field allowlists
- Private media access checks
- Upload validation/path traversal resistance
- Contact hidden before acceptance and from non-participants/admin
- Settings enforcement
- Input size/enum/date validation
- No secrets, password hashes, tokens, storage paths, embeddings, or sensitive fields in responses/logs
- No unsafe identity/outcome claims

PART F - AUTOMATED AND MANUAL TEST DOCUMENTS
Create TESTING.md with prerequisites, fictional test accounts, expected results, and at least these workflows:
1. Public pages and navigation
2. Register/login/logout/session expiry
3. Role and object-level access
4. Missing report submission
5. Unidentified report submission
6. Image validation/private storage
7. Anonymous report ownership or secure claim
8. My Reports isolation
9. Public Search/Browse privacy
10. Exact Track lookup privacy
11. Mock embeddings and duplicate warning
12. Top 5 recommendation score/order/breakdown
13. Recommendation dismiss/hide
14. Connection request send/duplicate prevention
15. Accept/decline/cancel
16. Contact hidden and post-consent participant-only reveal
17. Notifications/timelines/audit logs
18. Admin dashboard
19. Admin report moderation
20. Admin user activation/deactivation
21. Admin settings enforcement
22. Mobile/accessibility checks
23. Unsafe wording scan
24. Build and clean-start test

PART G - DOCUMENTATION AND DEMO
1. Update README with architecture, setup, environment variables, Prisma 6.19 commands, migration/seed steps, storage layout, scripts, demo accounts, safety model, and troubleshooting.
2. Add/update .env.example with placeholders only. Never commit real secrets or local credentials beyond clearly fictional demo defaults.
3. Create DEMO.md with a short reproducible FYP presentation script using fictional data: submit reports, track safely, view mock recommendations, request connection, accept as the second reporter, show limited contact sharing, and demonstrate admin moderation boundaries.
4. Add Git initialization/GitHub instructions, but do not create a remote, push, or publish unless I explicitly ask.
5. Explain deployment honestly:
   - SQLite and local filesystem uploads are suitable for a single-machine local FYP demo.
   - Typical serverless/Vercel filesystems are ephemeral and SQLite/local uploads are not a durable multi-instance production design.
   - A production deployment needs a managed database and private object storage, plus secrets/session configuration and backup/retention controls.
6. Do not migrate infrastructure or deploy in this phase unless I explicitly authorize a target.

PART H - FINAL VERIFICATION
1. Test from a clean documented setup where practical.
2. Run all package validation scripts, Prisma validate/generate, lint, and npm run build.
3. Run focused API/auth/authorization/privacy/recommendation checks.
4. Run the 17-route browser sweep and core two-reporter consent workflow.
5. Fix failures and repeat the failed test.
6. Record commands and results accurately; do not claim unrun tests passed.

FINAL HANDOFF
Create/update PHASE_5_PROGRESS.md. Report completed scope, test evidence, known limitations, local demo instructions, production gaps, and any remaining risks. Do not add new features and do not begin a Phase 6.
```

---

# 6. Updated Review Prompt

Use after every phase before approval.

```text
REVIEW LOOP FOR THE CURRENT HUMTRACE AI PHASE

Read the master continuation prompt, all progress documents through the current phase, package.json, and the actual changed code.

Do not build future features. Inspect, test, and fix only defects or missing requirements in the current approved phase scope.

Review:
1. Does the application build and run?
2. Do all existing validation scripts pass?
3. Are all current-phase pages, APIs, schema fields, and workflows actually implemented?
4. Were existing working workflows preserved?
5. Are authentication and sessions secure for the local-demo architecture?
6. Are role and object-ownership checks enforced on the server?
7. Can one reporter read or mutate another reporter's private data?
8. Are public queries allowlisted and privacy-safe?
9. Are private images and storage paths protected?
10. Is contact hidden until acceptance and limited to the two participants afterward?
11. Can admin force a connection or make an identity decision?
12. Are input/file validation, transactions, status transitions, and error states correct?
13. Are mock AI outputs clearly labeled and deterministic, if this phase includes them?
14. Are unsafe identity/outcome claims absent from user-facing code?
15. Are there accidental TypeScript files, broken imports, stale preview messages, or misleading README claims?
16. Are changed pages responsive and accessible?
17. Do progress docs match verified reality?

For each issue:
- State the evidence and exact file/workflow.
- Apply the smallest in-scope safe fix.
- Rerun the exact failing test, then the relevant regression checks.

Return:
1. Pass/fail status
2. Requirements verified
3. Bugs found and fixed
4. Commands/workflows run with results
5. Remaining issues or limitations
6. Exact manual checks for me
7. Whether I can approve the phase

Stop. Do not start the next phase.
```

---

# 7. Updated Bug-Fix Prompt

```text
HUMTRACE AI BUG-FIX LOOP

Current approved phase:
[PHASE NAME]

Observed problem/error:
[PASTE ERROR, URL, STEPS, OR SCREENSHOT DESCRIPTION]

Do not add features, redesign the UI, change the architecture, reset/delete the database, or move to another phase.

1. Reproduce the problem if safe.
2. Identify the exact route, API, component, query, schema, or authorization check involved.
3. Explain the root cause briefly with evidence.
4. Apply the smallest safe in-scope fix while preserving user changes and existing data.
5. Rerun the exact reproduction.
6. Run relevant regression checks, including privacy/authorization checks when affected.
7. Repeat if another related failure appears.

Report:
- Root cause
- Files changed
- Commands and workflows rerun
- Regression checks
- Whether fully fixed
- Any remaining limitation
- Exact manual test I should perform

Stop after the fix. Do not begin future-phase work.
```

---

# 8. Continue Only After Approval Prompt

```text
Stop. Do not begin the next HumTrace AI phase.

Finish the current phase only:
1. Inspect the diff and current implementation.
2. Complete missing current-phase requirements.
3. Run the phase workflow tests and relevant regression checks.
4. Run build, lint, Prisma, route, JavaScript-only, image, and safety checks as applicable.
5. Verify authentication, ownership, public-data privacy, private media, and contact consent boundaries as applicable.
6. Update the current progress document and README if needed.
7. Give the phase summary and manual test checklist.

Wait until I explicitly say: "Approved, continue to the next phase."
```

---

# 9. Short Prompt for the Immediate Next Task

Use this only after pasting the Master Continuation Prompt if a shorter phase instruction is preferred.

```text
Phase 1 is approved. Continue the already-started Phase 2; do not rebuild completed database/report work.

Implement Phase 2 completion only:
- bcrypt password hashes and fictional seeded credentials
- secure HttpOnly server-side sessions
- register/login/logout/current-session APIs
- public registration creates reporters only
- server-side reporter/admin route protection
- server-derived role and actor for all protected mutations
- authenticated reporter-only My Reports
- safe anonymous report ownership (no ownership by typed email)
- accept/decline/cancel contact-request actions with valid participant-only authorization
- contact hidden until acceptance and then limited to preferred contact method for the two participants only
- notifications, timeline/audit entries, and duplicate active-request prevention
- update stale README and PHASE_2_PROGRESS.md

Preserve all 17 routes, current Prisma 6.19/SQLite data, public Browse/Search, Track, report submissions, uploads, and admin moderation. Add no AI, embeddings, duplicate detection, email/SMS, new frontend route, or deployment.

Run the full inspect/build/test/fix/privacy-scan loop from the master prompt, then stop for approval.
```
