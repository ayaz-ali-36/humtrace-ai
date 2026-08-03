# System Architecture Document

## 1. Architecture goals

HumTrace AI uses a privacy-first modular architecture. The current local demo keeps the web application, database, and private files on one machine. Phase 5 adds local inference and derived-data controls while preserving the existing authorization and consent boundaries.

## 2. Current Phase 5 engineering architecture

~~~mermaid
flowchart LR
    Browser["Browser<br/>Public, Reporter, Admin"]
    Next["Next.js 14 App Router<br/>Pages, layouts, route handlers"]
    Auth["Authentication and authorization<br/>Opaque cookie sessions"]
    Domain["Domain services<br/>Reports, deterministic scoring,<br/>contact consent, moderation"]
    Prisma["Prisma ORM"]
    SQLite[("SQLite<br/>prisma/dev.db")]
    PrivateFiles[("Private local storage<br/>storage/reports")]
    PublicAssets["Public assets<br/>public/"]

    Browser -->|"HTTPS in production / HTTP local"| Next
    Next --> Auth
    Next --> Domain
    Auth --> Prisma
    Domain --> Prisma
    Prisma --> SQLite
    Domain -->|"validated report images"| PrivateFiles
    Next --> PublicAssets
    PrivateFiles -. "never publicly served" .-> Browser
~~~

## 3. Phase 5 target architecture

~~~mermaid
flowchart LR
    Browser["Browser"]
    Web["Next.js policy boundary"]
    Queue[("AI job records")]
    Worker["Local AI worker"]
    Inference["Loopback-only inference service"]
    Models[("Approved local model files")]
    Embeddings[("Encrypted embeddings")]
    DB[("SQLite application data")]
    Images[("Private report images")]
    Eval["Offline evaluation harness"]
    Flags["Feature flags and kill switches"]

    Browser --> Web
    Web --> DB
    Web --> Images
    Web --> Queue
    Worker --> Queue
    Worker --> Images
    Worker --> Inference
    Inference --> Models
    Worker --> Embeddings
    Worker --> DB
    Eval --> Inference
    Eval --> Models
    Eval --> DB
    Flags --> Web
    Flags --> Worker
    Web -->|"ephemeral search bytes"| Inference
    Inference -->|"ephemeral query vectors"| Web
~~~

## 4. Component responsibilities

| Component | Responsibility | Status |
|---|---|---|
| Browser UI | Forms, route navigation, safe result presentation, explicit user actions | Implemented |
| Next.js server | Authentication, authorization, validation, public allowlists, orchestration | Implemented |
| Prisma | Database access and transactions | Implemented |
| SQLite | Users, reports, recommendations, requests, events, settings, audit | Implemented |
| Private file storage | Original report photographs | Implemented |
| Deterministic scorer | Age, gender, height, weight, location, description token scoring | Implemented |
| AI job worker | Asynchronous report embedding, leases, retries, invalidation, and reciprocal suggestions | Implemented |
| Inference service | Approved local text/face embedding, cosine similarity, quality checks, and scoring | Implemented; normal activation gated |
| Encrypted embedding store | Encrypted, versioned, expiring report vectors | Implemented |
| Evaluation harness | Offline metrics, slices, thresholds, and release artifacts | Implemented; representative dataset evaluation pending |

## 5. Logical layers

### Presentation layer

- Public shell and public routes.
- Reporter portal protected by reporter layout.
- Admin portal protected by admin layout.
- Shared UI components in components/ui/kit.jsx.

### Application layer

- App Router route handlers validate input and enforce actor permissions.
- Database-view functions produce role-appropriate view models.
- Recommendation and settings services apply deterministic rules.

### Data layer

- Prisma models describe relational application data.
- SQLite is the local-demo database.
- Report images are filesystem objects referenced by ReportPhoto metadata.

### Phase 5 inference layer

- Inference is isolated from browser access.
- Only the Next.js server or local worker may call it.
- Model outputs are technical similarity features, never identity decisions.
- Search queries remain ephemeral; report embeddings follow retention policy.

## 6. Trust boundaries

~~~mermaid
flowchart TB
    subgraph Untrusted["Untrusted input boundary"]
        Browser["Browser uploads and JSON"]
    end
    subgraph App["Application trust boundary"]
        Routes["Next.js route handlers"]
        Auth["Session and role enforcement"]
        Validation["Zod, file metadata, and byte validation"]
    end
    subgraph Sensitive["Sensitive local-data boundary"]
        Database[("SQLite")]
        Photos[("Private photos")]
        Vectors[("Encrypted embeddings - Phase 5")]
    end
    subgraph AI["Restricted inference boundary - Phase 5"]
        Worker["AI worker"]
        Service["Loopback inference service"]
        Model["Approved model files"]
    end

    Browser --> Routes
    Routes --> Auth
    Routes --> Validation
    Auth --> Database
    Validation --> Photos
    Routes --> Database
    Routes --> Worker
    Worker --> Photos
    Worker --> Service
    Service --> Model
    Worker --> Vectors
~~~

## 7. Security architecture

- Opaque 32-byte random sessions; only token hashes are persisted.
- Password hashes use bcrypt.
- Authorization is checked in layouts and mutation handlers.
- Role checks distinguish public, reporter, and admin capabilities.
- Reporter ownership is verified before report or recommendation mutation.
- File extension is derived from validated MIME type rather than the user filename.
- Public queries select only safe fields.
- Deactivation revokes sessions.
- Phase 5 service shall use loopback binding, a rotating internal credential, request-size limits, timeouts, and no required egress.
- Embedding encryption shall use authenticated encryption; key material remains outside SQLite.

## 8. Availability and failure behavior

| Failure | Required behavior |
|---|---|
| Database unavailable | Return a generic server error; do not expose internals |
| Image validation fails | Reject before report creation |
| Report transaction fails after file save | Delete the newly saved file |
| Recommendation calculation fails | Preserve the report and return no recommendations |
| Phase 5 service unavailable | Mark job retryable or provide safe non-image fallback |
| Interactive inference timeout | Return an availability notice and discard query data |
| Model disabled | Do not create new AI-assisted recommendations |
| Retention task failure | Record a safe operational incident and retry |

## 9. Deployment view

### Current local demo

One Windows host runs Node.js, Next.js, Prisma, SQLite, and private image storage. The local production build normally runs on port 3000.

### Phase 5 local demo

The same host may run a separate Python inference process and worker. They remain loopback-only. Model files and encrypted embeddings remain local. Production deployment, multi-host networking, object storage, and managed vector databases remain outside the approved scope.

## 10. Architecture decisions requiring review

1. Complete and review the approximately 50-volunteer consented pilot before any normal activation.
2. Review FaceNet weight provenance and the exact local model artifacts before release.
3. Review application-level encryption and operational key handling beyond the local demo.
4. Approve retention periods, withdrawal handling, and deletion grace behavior.
5. Decide whether report-photo replacement belongs in a later scope.
