# Software Requirements Specification

## 1. Document control

Product: HumTrace AI  
System type: Privacy-preserving local demonstration  
Geographic context: Pakistan  
Current release: Phase 5 local engineering demonstration
Normal AI activation: not approved pending representative consented evaluation and calibration

## 2. Purpose

HumTrace AI supports the reporting and review of missing-person and unidentified-person cases. It provides public-safe browsing, exact case tracking, reporter-owned case management, possible similarity recommendations, and consent-based contact requests.

The product assists people in finding relevant reports. It never makes an identity determination, and its outputs cannot replace human review or lawful investigation.

## 3. Product scope

### 3.1 Implemented scope

- Public landing, search, browse, report, tracking, about, and contact pages.
- Reporter registration, login, logout, sessions, dashboard, reports, recommendations, contact requests, and profile.
- Dedicated admin login, dashboard, report/user/settings management, and staff creation.
- Missing-person and unidentified-person report submission with a required image.
- Private local report-image storage with type, size, and byte-signature validation.
- Public-safe allowlisted report views.
- Deterministic descriptive similarity scoring.
- Reporter recommendation actions: view, dismiss, and request contact.
- Recipient-controlled contact acceptance or decline.
- Reporter case edit, close, reopen, and archive.
- Admin content review, hide, restore-to-review, public visibility, archive, and user activation controls.
- Audit logs, notifications, timeline events, and persisted system settings.

### 3.2 Phase 5 engineering scope

- Local English text embeddings.
- Optional local face-region similarity behind independent configuration and release gates.
- Encrypted persisted report embeddings and zero-retention query embeddings.
- Background processing and backfill for eligible reports.
- Vector candidate retrieval, calibrated scoring, and model versioning.
- Image-quality gates and modality-specific fallbacks.
- Evaluation reports, false-positive controls, retention enforcement, feedback, suppression, and model kill switches.

### 3.3 Out of scope

- Production deployment.
- Email, SMS, WhatsApp, or push-notification delivery.
- Public serving of report photographs.
- Automated identity decisions.
- Admin-forced contact sharing.
- External law-enforcement integration.
- Automated web scraping or external face databases.
- Reporter photo replacement unless separately approved for Phase 5.

## 4. Stakeholders and actors

| Actor | Responsibilities |
|---|---|
| Public visitor | Browse public-safe reports, track a public report, and use Smart Search |
| Reporter | Own reports, review recommendations, manage report lifecycle, send or review contact requests |
| Contact recipient | Accept or decline a contact request and control contact disclosure |
| Admin | Moderate content, manage users/settings/staff, review operational quality and audit history |
| System | Validate data, protect private information, calculate suggestions, enforce policy and retention |
| Phase 5 inference service | Produce approved embeddings and quality signals locally |
| Project evaluator | Measure model and system performance before enabling an AI capability |

## 5. Functional requirements

### 5.1 Authentication and authorization

| ID | Requirement | Status |
|---|---|---|
| FR-AUTH-001 | Public registration shall create REPORTER accounts only. | Implemented |
| FR-AUTH-002 | Passwords shall be hashed with bcrypt. | Implemented |
| FR-AUTH-003 | Sessions shall use opaque random cookies and store only SHA-256 token hashes. | Implemented |
| FR-AUTH-004 | Sessions shall be HttpOnly, SameSite Lax, path-wide, and secure in production. | Implemented |
| FR-AUTH-005 | Deactivated users shall lose active sessions. | Implemented |
| FR-AUTH-006 | The admin login shall reject non-admin credentials. | Implemented |
| FR-AUTH-007 | Only an active admin shall create another admin staff account. | Implemented |
| FR-AUTH-008 | The last active admin shall not be deactivated. | Implemented |
| FR-AUTH-009 | A public submitter shall claim a report only with its one-time code and an account using the submitted email. | Implemented |
| FR-AUTH-010 | Repeated invalid claim attempts shall trigger a temporary lock. | Implemented |

### 5.2 Reports and photographs

| ID | Requirement | Status |
|---|---|---|
| FR-RPT-001 | The system shall accept missing-person and unidentified-person reports. | Implemented |
| FR-RPT-002 | A report shall require core descriptive details, private reporter contact details, a valid image, confirmation, and consent; an account is optional at submission. | Implemented |
| FR-RPT-003 | Images shall be limited to JPG, PNG, or WEBP and 5 MB. | Implemented |
| FR-RPT-004 | Declared image type shall agree with file signature. | Implemented |
| FR-RPT-005 | Stored images shall remain under private storage/reports paths. | Implemented |
| FR-RPT-006 | A signed-in reporter submission shall attach immediately; a public submission shall remain unowned until securely claimed. | Implemented |
| FR-RPT-007 | A reporter shall access and mutate only reports they own. | Implemented |
| FR-RPT-008 | Editing a reporter-owned public report shall preserve the reporter's public visibility choice without admin pre-approval. | Implemented |
| FR-RPT-009 | Closed and archived reports shall be removed from public visibility. | Implemented |
| FR-RPT-010 | Reopened reports shall restore the reporter's saved public or limited visibility choice without admin pre-approval. | Implemented |
| FR-RPT-011 | Unclaimed reports shall not receive or initiate report-linked contact actions. | Implemented |
| FR-RPT-012 | Admin moderation shall occur after submission and may hide, limit, archive, review, or republish saved reports. | Implemented |

### 5.3 Public views and tracking

| ID | Requirement | Status |
|---|---|---|
| FR-PUB-001 | Public routes shall expose allowlisted public fields only. | Implemented |
| FR-PUB-002 | Private image paths, reporter contact information, and internal IDs shall not appear in public responses. | Implemented |
| FR-PUB-003 | Exact tracking shall accept MP-YYYY-NNNN and UI-YYYY-NNNN case identifiers. | Implemented |
| FR-PUB-004 | Public search and tracking shall respect maintenance and public-search settings. | Implemented |

### 5.4 Recommendations and contact

| ID | Requirement | Status |
|---|---|---|
| FR-REC-001 | The system shall compare a report with all other eligible public missing and unidentified reports, regardless of type, while excluding itself. | Implemented with deterministic scoring |
| FR-REC-002 | Recommendations shall use uncertainty-preserving labels and explanations. | Implemented |
| FR-REC-003 | A reporter shall view or dismiss a recommendation for their own source report. | Implemented |
| FR-REC-004 | A reporter shall provide a reason before requesting contact from a recommendation. | Implemented |
| FR-REC-005 | A reporter shall not create a contact request for their own report. | Implemented |
| FR-REC-006 | Contact data shall be null or hidden before recipient acceptance. | Implemented |
| FR-REC-007 | Only the recipient shall accept or decline; only the requester shall cancel. | Implemented |
| FR-REC-008 | Contact acceptance shall not alter report identity status. | Implemented |

### 5.5 Administration

| ID | Requirement | Status |
|---|---|---|
| FR-ADM-001 | Admin shall manage moderation status, users, settings, staff, and audit review. | Implemented |
| FR-ADM-002 | Admin shall not make identity determinations or force contact sharing. | Implemented |
| FR-ADM-003 | Admin mutations shall create audit records. | Implemented |
| FR-ADM-004 | Settings shall control public search, submission, recommendation threshold, duplicate warning, and maintenance mode. | Implemented |

### 5.6 Phase 5 AI processing

| ID | Requirement | Status |
|---|---|---|
| FR-AI-001 | Every normally enabled model shall have a name, version, checksum, license, purpose, exact-version approval, and evaluation approval. | Engineering implemented; release approval pending |
| FR-AI-002 | Search-image bytes and query embeddings shall be discarded after the request. | Implemented |
| FR-AI-003 | Persisted embeddings shall be encrypted, versioned, expiring, and inaccessible from public APIs. | Implemented |
| FR-AI-004 | Face, text, and structured signals shall be scored separately before calibrated combination. | Engineering implemented; calibration pending |
| FR-AI-005 | Missing signals shall be excluded and remaining weights normalized. | Implemented |
| FR-AI-006 | An image-quality failure shall cause a safe fallback rather than an unreliable image score. | Implemented |
| FR-AI-007 | Candidate eligibility shall require active lifecycle, approved visibility, a non-self missing or unidentified report, and approved AI-processing basis. | Implemented |
| FR-AI-008 | Up to ten candidate recommendations shall be retained per report or search, displayed five at a time with Previous/Next navigation. | Phase 5 implemented |
| FR-AI-009 | Report edit, closure, archive, deletion, permission withdrawal, photo change, or model/policy change shall invalidate affected derived data. | Implemented for current report lifecycle |
| FR-AI-010 | Reporters shall be able to dismiss, suppress, and flag an inappropriate suggestion with a reason. | Implemented |
| FR-AI-011 | A global switch shall disable AI-assisted recommendations without disabling reporting or tracking. | Implemented |
| FR-AI-012 | Face-region similarity shall remain independently disabled until its exact model and evaluation gate is approved. | Implemented gate; approval pending |

## 6. Non-functional requirements

### 6.1 Privacy

- Data minimization shall apply to every response and log.
- Public visibility shall not imply permission for biometric processing.
- Private images, embeddings, contact data, and raw sensitive descriptions shall not appear in analytics or general audit text.
- Smart Search shall provide zero-persistence handling for photographs and query embeddings.
- Derived data shall have explicit expiry and deletion behavior.

### 6.2 Security

- All protected actions shall be authorized server-side.
- File type shall be validated from both metadata and bytes.
- The future inference service shall bind to loopback only and reject unauthenticated internal calls.
- The inference environment shall have no required external network connection.
- Embedding encryption keys shall not be stored in the database.
- Error responses shall not disclose paths, tokens, password hashes, model secrets, or stack traces.

### 6.3 Reliability

- Report creation and related database records shall be transactional.
- A failed database transaction shall remove an already-written report image.
- Recommendation failure shall not prevent successful report submission.
- Model processing shall be retryable and idempotent.
- A failed or unavailable AI service shall produce a safe pending or text-only state.

### 6.4 Performance

- Current public and protected pages should remain usable on desktop and mobile browsers.
- Phase 5 candidate retrieval shall avoid full model inference across the entire gallery for each request.
- Phase 5 latency targets shall be measured separately for report background processing and interactive Smart Search.
- Interactive search shall time out safely and shall not retain query data after timeout.

### 6.5 Accessibility and usability

- Forms shall have visible labels, validation messages, and keyboard-operable controls.
- Uncertainty, privacy, and contact-consent notices shall be visible at the decision point.
- Color shall not be the only carrier of status.
- Mobile layouts shall preserve all actions without horizontal clipping.

### 6.6 Maintainability and observability

- Application code remains JavaScript/JSX unless a reviewed architecture change is approved.
- Model and scoring versions shall be recorded with generated recommendations.
- Operational logs shall use safe identifiers and event categories.
- Existing validation scripts shall remain passing after future changes.

## 7. Core business rules

1. A recommendation is a lead for human review, not an identity decision.
2. Both missing and unidentified cases are eligible for report-to-report similarity; a report never compares with itself.
3. Public responses use allowlisted fields.
4. Public report visibility does not make the report photograph public.
5. Contact disclosure requires an accepted request from the receiving reporter.
6. Admin moderation controls content availability, not identity.
7. A material report edit invalidates stale AI-derived results.
8. A suppressed report pair shall not automatically reappear for the same source and model version.

## 8. Data retention proposal for review

| Data | Proposed retention |
|---|---|
| Smart Search image bytes | Request lifetime only |
| Smart Search query embedding | Request lifetime only |
| Stored recommendation | 30 days or until invalidated |
| Persisted report embedding | Active lifecycle plus 30-day deletion grace |
| Original report photograph | Active lifecycle plus 90 days after closure/archive |
| Safe audit metadata | 365 days |
| Evaluation data | Synthetic or separately consented dataset policy |

These durations are design defaults and require project approval before implementation.

## 9. Acceptance baseline

- No Phase 5 capability is enabled by merely installing a model.
- A feature flag, approved model record, approved evaluation run, configured threshold, and retention policy are all required.
- Existing lint, build, route, privacy-language, upload, authorization, public-report, and Phase 1–4.5 workflow checks continue to pass.
