# Sequence Diagrams

## 1. Current report submission

~~~mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Report Form
    participant API as POST /api/reports
    participant Auth as Session Service
    participant Files as Private File Storage
    participant DB as Prisma and SQLite
    participant Score as Deterministic Scorer

    User->>UI: Enter case and reporter details; select image
    UI->>API: Multipart form submission
    API->>API: Validate fields, MIME, size, and byte signature
    API->>Auth: Resolve optional current reporter
    API->>Files: Save private report image
    API->>DB: Transaction: reporter, report, photo metadata, event, notification, audit
    alt Database transaction fails
        API->>Files: Delete newly saved image
        API-->>UI: Generic failure
    else Report saved
        API->>Score: Generate deterministic possible recommendations
        Score->>DB: Query eligible public opposite-type reports
        Score->>DB: Upsert qualifying recommendations
        API-->>UI: Case ID, status, safe recommendations
    end
~~~

## 2. Phase 5 report processing

~~~mermaid
sequenceDiagram
    autonumber
    actor Reporter
    participant Web as Next.js Application
    participant DB as Application Database
    participant Files as Private Image Storage
    participant Queue as AI Job Queue
    participant Worker as Local AI Worker
    participant AI as Loopback Inference Service
    participant Vectors as Encrypted Embedding Store

    Reporter->>Web: Submit report and image
    Web->>DB: Store report under human review
    Web->>Files: Store private image
    Web->>Queue: Queue eligible embedding job
    Web-->>Reporter: Return case ID; processing pending
    Worker->>Queue: Claim job idempotently
    Worker->>DB: Verify lifecycle, policy, photo, and model eligibility
    Worker->>Files: Read image by trusted photo record
    Worker->>AI: Send image/text for approved inference
    AI-->>Worker: Quality signals and embeddings
    Worker->>Vectors: Encrypt and persist report embeddings
    Worker->>DB: Retrieve eligible opposite-type candidates
    Worker->>DB: Save calibrated recommendations with expiry and versions
    Worker->>Queue: Mark job succeeded
    Worker->>DB: Create safe notification and timeline event
~~~

## 3. Current Smart Search

~~~mermaid
sequenceDiagram
    autonumber
    actor Visitor
    participant UI as Smart Search Page
    participant API as POST /api/search/recommendations
    participant DB as Prisma and SQLite

    Visitor->>UI: Add photograph, details, or both
    UI->>API: Multipart search request
    API->>API: Validate photograph in memory
    alt No descriptive details
        API-->>UI: Photograph accepted but image assistance unavailable in Phase 4.5
    else Details available
        API->>DB: Query up to 100 public unidentified reports
        API->>API: Deterministic detail scoring
        API-->>UI: Up to 10 public-safe suggestions
    end
    API->>API: Release photograph bytes without storage
~~~

## 4. Phase 5 Smart Search

~~~mermaid
sequenceDiagram
    autonumber
    actor Visitor
    participant Web as Next.js Search API
    participant AI as Loopback Inference Service
    participant DB as Application Database
    participant Vectors as Encrypted Report Embeddings

    Visitor->>Web: Photograph and/or descriptive details
    Web->>Web: Validate request and check feature policy
    Web->>AI: Request-scoped image/text inference
    AI-->>Web: Quality metadata and ephemeral query vectors
    Web->>Vectors: Retrieve eligible candidate vectors
    Web->>DB: Load allowlisted candidate fields and suppression state
    Web->>Web: Calibrated scoring, thresholding, top-five limit
    Web-->>Visitor: Safe suggestions and limitations
    Web->>Web: Discard bytes, vectors, crops, and intermediate objects
~~~

## 5. Recommendation-to-contact workflow

~~~mermaid
sequenceDiagram
    autonumber
    actor Requester
    participant UI as Reporter Recommendations
    participant API as Recommendation API
    participant DB as Prisma and SQLite
    actor Recipient
    participant Contact as Contact Request API

    Requester->>UI: Review possible recommendation
    UI->>API: Mark viewed or dismiss
    API->>DB: Verify source-report ownership and update status
    Requester->>UI: Enter contact-request reason
    UI->>API: request_contact action
    API->>DB: Verify public target, distinct reporter, and active-key uniqueness
    API->>DB: Create pending request, notification, event, and audit
    API-->>Requester: Request saved; contact remains hidden
    Recipient->>Contact: Accept or decline
    Contact->>DB: Verify recipient authority and pending state
    Contact->>DB: Update status, notification, event, and audit
    alt Accepted
        Contact-->>Recipient: Other participant contact
        Contact-->>Requester: Contact visible on authorized request view
    else Declined
        Contact-->>Requester: Declined status; no contact
    end
~~~

## 6. Reporter edit and invalidation

~~~mermaid
sequenceDiagram
    autonumber
    actor Reporter
    participant API as PATCH /api/reports/[publicId]
    participant DB as Prisma and SQLite
    participant AI as Phase 5 Invalidation Worker

    Reporter->>API: Edit owned report
    API->>DB: Verify session, role, ownership, lifecycle, and fields
    API->>DB: Update report to UNDER_REVIEW and LIMITED
    API->>DB: Create timeline and audit records
    API-->>Reporter: Updated report
    opt Phase 5 enabled
        API->>DB: Queue invalidation job
        AI->>DB: Invalidate embeddings and recommendations
        AI->>DB: Reprocess only after renewed eligibility
    end
~~~

## 7. Admin moderation

~~~mermaid
sequenceDiagram
    autonumber
    actor Admin
    participant UI as Admin Manage
    participant API as Report or User API
    participant Auth as Session Service
    participant DB as Prisma and SQLite

    Admin->>UI: Choose moderation or user action
    UI->>API: Protected mutation
    API->>Auth: Resolve active admin session
    API->>DB: Validate target and action
    alt Attempt to deactivate last active admin
        API-->>UI: Reject action
    else Valid action
        API->>DB: Transactional update and audit
        opt User deactivated
            API->>DB: Delete target user sessions
        end
        API-->>UI: Safe updated view model
    end
~~~

## 8. Phase 5 retention deletion

~~~mermaid
sequenceDiagram
    autonumber
    participant Scheduler
    participant Worker as Retention Worker
    participant DB as Application Database
    participant Vectors as Encrypted Embedding Store
    participant Files as Private Image Storage

    Scheduler->>Worker: Run due-retention scan
    Worker->>DB: Select expired resources
    Worker->>Vectors: Delete expired embeddings
    opt Original photo retention also expired
        Worker->>Files: Delete private image
    end
    Worker->>DB: Invalidate dependent recommendations
    Worker->>DB: Mark metadata deleted and record safe retention outcome
    Note over Worker,DB: No vectors, raw content, contact values, or paths in retention logs
~~~

