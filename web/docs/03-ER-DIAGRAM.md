# Entity-Relationship Diagram

## 1. Current Phase 4.5 data model

~~~mermaid
erDiagram
    USER {
        string id PK
        string name
        string email UK
        string phone
        string passwordHash
        string role
        string status
        string region
        string preferredContactMethod
        datetime createdAt
        datetime updatedAt
    }
    SESSION {
        string id PK
        string tokenHash UK
        string userId FK
        datetime expiresAt
        datetime createdAt
        datetime updatedAt
    }
    REPORT {
        string id PK
        string publicId UK
        string type
        string reporterId FK
        string fullName
        boolean nameUnknown
        string approximateAge
        string gender
        int heightCm
        int weightKg
        string broadRegion
        string specificLocation
        datetime eventDate
        string description
        string status
        string visibility
        string lifecycleStatus
        boolean publicVisible
        boolean consentToContact
        datetime createdAt
        datetime updatedAt
    }
    REPORT_PHOTO {
        string id PK
        string reportId FK
        string kind
        string fileName
        string storagePath
        string mimeType
        int fileSizeBytes
        string reviewStatus
        string faceCheckStatus
        datetime createdAt
    }
    RECOMMENDATION {
        string id PK
        string sourceReportId FK
        string targetReportId FK
        int score
        string qualityLabel
        string sharedAttributes
        string breakdownSummary
        string status
        datetime createdAt
        datetime updatedAt
    }
    CONTACT_REQUEST {
        string id PK
        string requesterId FK
        string recipientId FK
        string requesterReportId FK
        string targetReportId FK
        string message
        string status
        string activeKey UK
        datetime createdAt
        datetime updatedAt
    }
    TIMELINE_EVENT {
        string id PK
        string reportId FK
        string title
        string description
        datetime eventDate
        datetime createdAt
    }
    NOTIFICATION {
        string id PK
        string userId FK
        string reportId FK
        string title
        string message
        string status
        datetime createdAt
    }
    AUDIT_LOG {
        string id PK
        string userId FK
        string reportId FK
        string action
        string resource
        string status
        datetime createdAt
    }
    SYSTEM_SETTING {
        string key PK
        string value
        string description
        string updatedById FK
        datetime createdAt
        datetime updatedAt
    }

    USER ||--o{ SESSION : has
    USER ||--o{ REPORT : submits
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ AUDIT_LOG : performs
    USER ||--o{ SYSTEM_SETTING : updates
    USER ||--o{ CONTACT_REQUEST : requests
    USER ||--o{ CONTACT_REQUEST : receives
    REPORT ||--o{ REPORT_PHOTO : contains
    REPORT ||--o{ RECOMMENDATION : source
    REPORT ||--o{ RECOMMENDATION : target
    REPORT ||--o{ CONTACT_REQUEST : requester_case
    REPORT ||--o{ CONTACT_REQUEST : target_case
    REPORT ||--o{ TIMELINE_EVENT : records
    REPORT ||--o{ NOTIFICATION : relates_to
    REPORT ||--o{ AUDIT_LOG : relates_to
~~~

## 2. Phase 5 proposed extension

The following entities are a design proposal and are not present in the current Prisma schema.

~~~mermaid
erDiagram
    REPORT {
        string id PK
        string publicId UK
    }
    REPORT_PHOTO {
        string id PK
        string reportId FK
        string storagePath
    }
    AI_MODEL {
        string id PK
        string capability
        string name
        string version
        string checksum UK
        string license
        string status
        datetime approvedAt
    }
    AI_PROCESSING_BASIS {
        string id PK
        string reportId FK
        string scope
        string status
        string attestedById FK
        datetime grantedAt
        datetime withdrawnAt
        datetime expiresAt
    }
    EMBEDDING {
        string id PK
        string reportId FK
        string reportPhotoId FK
        string modelId FK
        string modality
        bytes encryptedVector
        string vectorChecksum
        int dimensions
        datetime createdAt
        datetime expiresAt
        datetime deletedAt
    }
    AI_JOB {
        string id PK
        string reportId FK
        string jobType
        string status
        int attempts
        string modelId FK
        datetime availableAt
        datetime startedAt
        datetime completedAt
    }
    EVALUATION_RUN {
        string id PK
        string modelId FK
        string datasetVersion
        string metricsJson
        string approvalStatus
        datetime executedAt
        datetime approvedAt
    }
    RECOMMENDATION {
        string id PK
        string sourceReportId FK
        string targetReportId FK
        string modelVersion
        string scoringVersion
        datetime expiresAt
        datetime invalidatedAt
    }
    RECOMMENDATION_FEEDBACK {
        string id PK
        string recommendationId FK
        string userId FK
        string reason
        string notes
        datetime createdAt
    }
    SUPPRESSED_PAIR {
        string id PK
        string sourceReportId FK
        string targetReportId FK
        string modelVersion
        string reason
        datetime createdAt
        datetime expiresAt
    }
    RETENTION_EVENT {
        string id PK
        string resourceType
        string resourceId
        string action
        string outcome
        datetime scheduledAt
        datetime completedAt
    }

    REPORT ||--o{ AI_PROCESSING_BASIS : authorizes
    REPORT ||--o{ EMBEDDING : derives
    REPORT_PHOTO ||--o{ EMBEDDING : derives
    AI_MODEL ||--o{ EMBEDDING : produces
    AI_MODEL ||--o{ AI_JOB : executes
    AI_MODEL ||--o{ EVALUATION_RUN : evaluated_by
    REPORT ||--o{ AI_JOB : queues
    RECOMMENDATION ||--o{ RECOMMENDATION_FEEDBACK : receives
    REPORT ||--o{ SUPPRESSED_PAIR : source
    REPORT ||--o{ SUPPRESSED_PAIR : target
~~~

## 3. Cardinality and integrity rules

- A user can own many reports; every report has exactly one reporter record.
- A report can have many photos, although the current UI submits one primary image.
- A recommendation has exactly one source report and one target report.
- The source-target pair is unique in the current schema.
- A contact request has one requester and one recipient; report links may be nullable.
- activeKey prevents duplicate active requests for one requester-target combination.
- Sessions are deleted with their user.
- Report photos and timeline events are deleted with their report.
- Phase 5 embeddings must identify the exact source report, source photo where applicable, and model.
- A Phase 5 recommendation must be invalidated when its inputs, model, scoring policy, eligibility, or retention state changes.

