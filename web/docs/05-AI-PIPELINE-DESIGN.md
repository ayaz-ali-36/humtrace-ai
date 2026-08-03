# AI Pipeline Design

## 1. Status and objective

Status: Phase 5 local engineering implemented; user-visible activation remains disabled pending final evaluation.

The implemented scope is English-only all-MiniLM-L6-v2 text similarity and separately switchable DeepFace FaceNet similarity. General visual and multilingual models are not included. HumTrace never generates, synthesizes, edits, or enhances images.

The objective is to retrieve possible recommendations using separate face-pattern, English-text, and structured similarity signals while preserving privacy, retention, explainability, and human control.

## 2. Implemented capability

- English description embedding with local all-MiniLM-L6-v2.
- Face-pattern embedding with local DeepFace FaceNet when exactly one usable face is detected.
- Structured age, gender, height, weight, and location comparisons.
- Separate settings for AI assistance, face similarity, and text similarity.
- Model registry, authenticated encryption, expiry, invalidation, suppression, quality flags, retention worker, and kill switches.
- Development mode for the local thesis demo; committed defaults remain release-gated pending the consented held-out pilot.
- No general visual/clothing image model, multilingual embedding model, image generation, or identity confirmation.

## 3. Signal design

| Input | Processing | Persistence |
|---|---|---|
| Report photograph | Decode/size/face-count checks plus FaceNet | Encrypted report face embedding while eligible |
| Smart Search photograph | Decode/size/face-count checks plus FaceNet | None; bytes and query vector are request-scoped |
| Description, clothing, identifying features | English check, normalization, all-MiniLM-L6-v2 | Encrypted report text embedding; query vector request-scoped |
| Age, height, weight | Numeric distance functions | Source fields already stored; no embedding |
| Gender | Exact/unknown-aware structured comparison | Source field already stored |
| Region and location | Normalized structured/text similarity | No separate sensitive vector unless approved |
| Medical condition | Excluded from general similarity by default | Existing private report field only |
| Reporter/contact details | Never used for similarity | Existing private account/report data only |

## 4. End-to-end pipeline

~~~mermaid
flowchart TD
    Input["New report or Smart Search"]
    Validate["Validate fields, size, MIME, and bytes"]
    Policy{"Eligible processing basis?"}
    Quality["Image quality and suitability checks"]
    Text["Text normalization and embedding"]
    Face["Face-pattern embedding<br/>when enabled and usable"]
    Structured["Structured feature preparation"]
    Retrieve["Retrieve eligible missing and unidentified candidates"]
    Score["Calibrated modality scoring<br/>normalize available weights"]
    Suppress["Apply suppression, lifecycle,<br/>visibility, and retention filters"]
    Threshold{"Approved threshold met?"}
    Explain["Create safe explanation and model metadata"]
    Save["Persist recommendation with expiry"]
    Review["Reporter human review"]
    Discard["Discard query bytes and vectors"]

    Input --> Validate
    Validate --> Policy
    Policy -->|No| Structured
    Policy -->|Yes| Quality
    Quality --> Text
    Quality --> Face
    Structured --> Retrieve
    Text --> Retrieve
    Face --> Retrieve
    Retrieve --> Score
    Score --> Suppress
    Suppress --> Threshold
    Threshold -->|No| Discard
    Threshold -->|Yes| Explain
    Explain --> Save
    Save --> Review
    Review --> Discard
~~~

## 5. Report processing

1. The web application validates and stores the report and private photograph.
2. The reporter's public or limited visibility choice is applied immediately; no admin pre-approval is required.
3. Once consent, visibility, release-gate, and model eligibility are satisfied, an idempotent AI job is queued.
4. The worker loads the private image by trusted report-photo identifier, not a browser-supplied path.
5. The inference service returns quality signals and approved embeddings.
6. The worker encrypts report embeddings before persistence.
7. Candidate retrieval compares all other eligible public missing and unidentified reports, excluding the source report itself.
8. Recommendations include model/scoring versions, modality contributions, expiry, and safe explanations.
9. Report edit or lifecycle change invalidates dependent results.

## 6. Smart Search processing

1. Accept image, details, or both.
2. Validate image type, signature, size, and request limits.
3. Keep image bytes in memory.
4. Generate request-scoped vectors.
5. Retrieve eligible public candidates without exposing their photographs or embeddings.
6. Return up to ten public-safe suggestions, displayed five at a time.
7. Discard image bytes, vectors, intermediate crops, and temporary inference objects on success, error, or timeout.
8. Log only safe request outcome, latency category, and opaque error code.

## 7. Candidate eligibility

A report is eligible only when all required conditions are true:

- Missing or unidentified report type; both same-type and cross-type candidates are allowed.
- Not the source report itself.
- Active lifecycle.
- Public visibility selected by the reporter and not subsequently restricted by moderation.
- Not hidden, closed, archived, expired, or deleted.
- Valid approved processing basis for every applied modality.
- Current embeddings for an approved enabled model.
- Not blocked by suppression.

## 8. Quality gates

Quality signals may include:

- Image decodability.
- Minimum dimensions.
- Blur.
- Under/overexposure.
- Occlusion.
- Pose.
- Face/person count where relevant.
- Cropping and visibility.

Failure behavior:

- Do not invent an image score.
- Continue with text and structured signals when available.
- Tell the user that image assistance was unavailable and why in safe terms.
- If no valid modality remains, return no recommendation and guidance to improve input.

## 9. Scoring and calibration

The implemented additive policy has seven signals: face, age, gender, height, weight, location, and description. Unavailable signals are excluded and the remaining configured weights are normalized. Face and English-text signals are independently switchable.

The combination policy shall:

1. Exclude unavailable or disallowed modalities.
2. Normalize the remaining approved weights.
3. Apply quality-dependent caps.
4. Apply eligibility and suppression filters.
5. Use a threshold tied to a recorded evaluation run and gallery size.
6. Limit stored/search results to ten and display five at a time.

The displayed score is a ranking aid, not identity certainty. The interface should emphasize signal categories and limitations over a single number.

## 10. Model lifecycle

~~~mermaid
stateDiagram-v2
    [*] --> REGISTERED
    REGISTERED --> EVALUATING
    EVALUATING --> REJECTED: fails license, privacy, or evaluation gate
    EVALUATING --> APPROVED_DISABLED: review approved
    APPROVED_DISABLED --> ENABLED: explicit release decision
    ENABLED --> PAUSED: incident or kill switch
    PAUSED --> ENABLED: reviewed recovery
    ENABLED --> RETIRED: replacement or expiry
    APPROVED_DISABLED --> RETIRED
    RETIRED --> [*]
~~~

Every result must be traceable to model artifact checksum, model version, preprocessing version, scoring version, and evaluation run.

## 11. Privacy and retention controls

- Separate public visibility, contact consent, and AI-processing basis.
- Encrypt persisted embeddings with authenticated encryption.
- Do not log vectors, image bytes, crops, contact data, or raw sensitive text.
- Use request-finally cleanup for Smart Search.
- Delete or invalidate embeddings when policy, report, photo, model, or lifecycle changes.
- Maintain a retention worker and safe deletion-event record.
- Do not reuse operational report photographs as evaluation data by default.

## 12. Human review and false-positive handling

- Show why a suggestion appeared: face-pattern, text, and structured contribution categories.
- Show image-quality limitations.
- Require an acknowledgment before creating contact from an AI-assisted suggestion.
- Allow dismiss, suppress, and flag actions with reasons.
- Preserve a suppression key for source report, target report, and model version.
- Let admins review operational quality incidents and disable a model, while preserving moderation-only authority.
- Contact remains recipient-controlled.

## 13. Service boundary

The implemented inference service:

- Binds only to 127.0.0.1.
- Accepts an internal credential and request identifier.
- Enforces content type, body size, timeout, and concurrency limits.
- Returns vectors and quality metadata only to trusted server components.
- Has no browser route and no direct database credentials.
- Reads approved model artifacts locally.
- Does not persist request bodies.

## 14. Release gates

No capability becomes user-visible until:

1. Model artifact and license are approved.
2. Processing purpose and retention are approved.
3. Evaluation coverage and limitations are documented.
4. Threshold and gallery assumptions are approved.
5. Privacy, authorization, zero-retention, encryption, and deletion tests pass.
6. Existing Phase 1–4.5 checks pass.
7. A global disable path is verified.
