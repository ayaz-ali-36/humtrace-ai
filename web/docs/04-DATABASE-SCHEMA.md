# Database Schema

## 1. Current database

Engine: SQLite  
ORM: Prisma 6.19  
Schema source: prisma/schema.prisma  
Local database: prisma/dev.db

The database stores relational metadata. Original report photographs are filesystem objects and are referenced through ReportPhoto.storagePath.

## 2. Current tables

### 2.1 User

Purpose: Reporter and admin accounts, including anonymous local reporter records.

| Field | Type | Constraints / meaning |
|---|---|---|
| id | String | Primary key, CUID |
| name | String | Display name |
| email | String | Unique normalized email |
| phone | String? | Private phone |
| passwordHash | String? | bcrypt hash; absent for some anonymous records |
| role | String | REPORTER or ADMIN; default REPORTER |
| status | String | ACTIVE or DEACTIVATED; default ACTIVE |
| region | String? | Optional broad region |
| preferredContactMethod | String | EMAIL or PHONE; default EMAIL |
| createdAt | DateTime | Creation time |
| updatedAt | DateTime | Prisma-managed update time |

### 2.2 Session

Purpose: Server-side session lookup without storing raw cookie tokens.

| Field | Type | Constraints / meaning |
|---|---|---|
| id | String | Primary key |
| tokenHash | String | Unique SHA-256 hash |
| userId | String | Foreign key to User; cascade delete |
| expiresAt | DateTime | Seven-day expiration at creation |
| createdAt | DateTime | Creation time |
| updatedAt | DateTime | Update time |

Indexes: userId, expiresAt.

### 2.3 Report

Purpose: Missing-person or unidentified-person case.

| Field group | Fields |
|---|---|
| Identity | id, publicId, type, reporterId |
| Person description | fullName, nameUnknown, approximateAge, gender, heightCm, weightKg |
| Location/time | broadRegion, specificLocation, lastSeenLocation, foundLocation, eventDate |
| Descriptive detail | description, clothing, identifyingFeatures, medicalCondition |
| Reporter context | reporterRelationship, reporterContext, relationshipContext, preferredContactMethod |
| Publication and consent | publicVisible, visibility, consentToContact |
| Lifecycle | lifecycleStatus, status |
| Photo attestation | photoRequirementNote |
| Timestamps | createdAt, updatedAt |

Important constraints:

- publicId is unique and follows MP-YYYY-NNNN or UI-YYYY-NNNN.
- type is MISSING or UNIDENTIFIED.
- visibility is LIMITED, PUBLIC, or HIDDEN in current workflows.
- publicVisible and visibility are jointly checked in public queries.
- Indexes exist on type, status, visibility, and broadRegion.

### 2.4 ReportPhoto

Purpose: Private image metadata.

| Field | Type | Meaning |
|---|---|---|
| id | String | Primary key |
| reportId | String | Foreign key to Report; cascade delete |
| kind | String | Default PRIMARY |
| fileName | String | Sanitized stored filename |
| storagePath | String | Private local relative path |
| mimeType | String | image/jpeg, image/png, or image/webp |
| fileSizeBytes | Int? | Stored byte length |
| reviewStatus | String | Default PENDING |
| faceCheckStatus | String | Default NOT_RUN |
| createdAt | DateTime | Creation time |

The current application does not serve storagePath publicly.

### 2.5 Recommendation

Purpose: Persisted deterministic possible recommendation.

| Field | Type | Meaning |
|---|---|---|
| id | String | Primary key |
| sourceReportId | String | Source Report foreign key |
| targetReportId | String | Target Report foreign key |
| score | Int | Current deterministic score |
| qualityLabel | String | Safe similarity label |
| sharedAttributes | String | JSON-encoded array |
| breakdownSummary | String | JSON-encoded score breakdown |
| status | String | NEW, VIEWED, DISMISSED, CONTACT_REQUESTED, or legacy review status |
| createdAt | DateTime | Creation time |
| updatedAt | DateTime | Update time |

Constraint: sourceReportId and targetReportId form a unique pair.

### 2.6 ContactRequest

Purpose: Consent-controlled connection between two reporters.

| Field | Type | Meaning |
|---|---|---|
| id | String | Primary key |
| requesterId | String | Requesting User |
| recipientId | String | Receiving User |
| requesterReportId | String? | Optional source case |
| targetReportId | String? | Optional target case |
| message | String | Contact reason |
| status | String | PENDING, ACCEPTED, DECLINED, or CANCELLED |
| activeKey | String? | Unique while active |
| createdAt | DateTime | Creation time |
| updatedAt | DateTime | Update time |

### 2.7 TimelineEvent

Purpose: Human-readable report history.

Fields: id, reportId, title, description, eventDate, createdAt.  
Index: reportId.  
Delete rule: cascade with Report.

### 2.8 Notification

Purpose: In-application notification records.

Fields: id, userId, reportId, title, message, status, createdAt.  
Indexes: userId, status.  
Delivery outside the application is not implemented.

### 2.9 AuditLog

Purpose: Security and operational history.

Fields: id, userId, reportId, action, resource, status, createdAt.  
Indexes: userId, reportId.

Audit status is currently free text. Phase 5 safe-logging rules should prevent vectors, raw image bytes, sensitive descriptions, contact values, keys, or filesystem paths from entering it.

### 2.10 SystemSetting

Purpose: Persisted operational settings.

| Key | Default |
|---|---:|
| publicSearchEnabled | true |
| reportSubmissionEnabled | true |
| recommendationDisplayThreshold | 0 |
| duplicateWarningThreshold | 85 |
| maintenanceMode | false |

Values are stored as strings and normalized by lib/settings.js.

## 3. Current status transitions

~~~mermaid
stateDiagram-v2
    [*] --> SUBMITTED
    SUBMITTED --> UNDER_REVIEW: admin review or reporter edit
    UNDER_REVIEW --> PUBLIC: admin completes content review
    PUBLIC --> UNDER_REVIEW: reporter edits
    SUBMITTED --> CLOSED_BY_REPORTER: reporter closes
    UNDER_REVIEW --> CLOSED_BY_REPORTER: reporter closes
    PUBLIC --> CLOSED_BY_REPORTER: reporter closes
    CLOSED_BY_REPORTER --> UNDER_REVIEW: reporter reopens
    SUBMITTED --> ARCHIVED: reporter or admin archives
    UNDER_REVIEW --> ARCHIVED: reporter or admin archives
    PUBLIC --> ARCHIVED: reporter or admin archives
    ARCHIVED --> UNDER_REVIEW: restore to review
    PUBLIC --> HIDDEN: admin hides
    HIDDEN --> UNDER_REVIEW: admin restores to review
~~~

## 4. Phase 5 proposed schema changes

These changes require a reviewed Prisma migration.

### 4.1 AIModel

Stores model capability, artifact identity, version, checksum, license, status, evaluation approval, and activation dates. Only APPROVED and ENABLED records can produce user-visible recommendations.

### 4.2 AIProcessingBasis

Stores the authorized processing scope for a report, who attested to it, current status, grant/withdrawal timestamps, policy version, and expiry.

Public visibility and AI-processing authorization are separate fields.

### 4.3 Embedding

Stores encrypted vector bytes and metadata:

- reportId and optional reportPhotoId.
- modelId and modality.
- dimensions and vector checksum.
- source content version.
- encryption key identifier, nonce, and authentication tag.
- createdAt, expiresAt, invalidatedAt, and deletedAt.

Raw vectors must never appear in normal API serialization.

### 4.4 AIJob

Provides idempotent queued work:

- EMBED_REPORT, REEMBED_REPORT, INVALIDATE_REPORT, RETENTION_DELETE, and BACKFILL.
- PENDING, RUNNING, SUCCEEDED, RETRYABLE, and FAILED states.
- attempt count, safe error code, timing, modelId, and idempotency key.

### 4.5 EvaluationRun

Records model/dataset/scoring versions, metrics, slice results, threshold proposal, limitations, approver, and activation decision.

### 4.6 Recommendation additions

Proposed fields:

- modelVersion and scoringVersion.
- modalityScoresJson and explanationJson.
- eligibilitySnapshotJson.
- expiresAt, invalidatedAt, and invalidationReason.
- evaluationRunId.

The existing integer score may remain for display compatibility, but it must not be presented as identity certainty.

### 4.7 RecommendationFeedback and SuppressedPair

Feedback records a reporter-selected reason and optional safe notes. SuppressedPair prevents an inappropriate source-target pair from resurfacing under the same model version unless a reviewed policy allows reconsideration.

### 4.8 RetentionEvent

Records scheduled and completed deletion outcomes without retaining deleted content.

## 5. Migration principles

1. Add nullable Phase 5 fields and new tables before backfill.
2. Keep all AI feature flags disabled.
3. Register model metadata without enabling it.
4. Backfill only reports with approved eligibility and processing basis.
5. Verify encrypted round-trip and deletion before any recommendation generation.
6. Preserve existing Phase 4.5 recommendations until an explicit replacement policy is approved.
7. Provide a rollback that disables AI features without deleting current reports.

