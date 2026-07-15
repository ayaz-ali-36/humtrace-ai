# Evaluation Plan

## 1. Purpose

This plan defines how HumTrace AI will evaluate software behavior, privacy controls, and Phase 5 similarity models before enabling user-facing AI assistance.

Evaluation does not establish identity. It measures whether the system retrieves useful possible recommendations while controlling false positives, privacy risk, and operational failure.

## 2. Release stages

| Stage | Capability | Gate |
|---|---|---|
| Baseline | Phase 4.5 deterministic detail scoring | Existing test suite |
| Phase 5A lab | Text and general visual inference offline | Model/license/privacy review |
| Phase 5A shadow | Generate results without showing users | Evaluation and incident review |
| Phase 5A limited demo | Feature-flagged user-visible suggestions | Approved threshold and rollback |
| Phase 5B lab | Optional face-region similarity offline | Separate sensitive-processing gate |
| Phase 5B disabled/limited | No activation without explicit project approval | Independent review |

## 3. Evaluation principles

- Use synthetic or separately consented evaluation data.
- Do not copy operational report photographs into evaluation datasets by default.
- Separate development, calibration, and held-out test sets by individual and source.
- Prevent near-duplicate images from crossing splits.
- Document dataset origin, permission, collection conditions, demographics, language, quality, and limitations.
- Measure the intended one-to-many retrieval use case at representative gallery sizes.
- Evaluate the full pipeline, not only model embeddings.
- Report uncertainty and insufficient sample sizes.

NIST resources informing the plan:

- [AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)
- [AI RMF Core: Govern, Map, Measure, Manage](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)
- [Face Recognition Technology Evaluation 1:N](https://pages.nist.gov/frvt/html/frvt1N.html)
- [Demographic Effects in Face Recognition](https://pages.nist.gov/frvt/html/frvt_demographics.html)

## 4. Evaluation datasets

### 4.1 Text dataset

Include consented or synthetic case descriptions in:

- English.
- Urdu.
- Roman Urdu.
- Mixed-language descriptions.
- Short and long descriptions.
- Spelling variants and transliteration variants.
- Conflicting structured and free-text details.

Labels should identify relevant and irrelevant candidate relationships for retrieval evaluation without claiming operational identity.

### 4.2 General visual dataset

Include consented or synthetic images varying:

- Clothing color and type.
- Body appearance and visible accessories.
- Background/context similarity.
- Camera quality and compression.
- Blur and motion.
- Lighting and exposure.
- Occlusion and cropping.
- Pose and viewing angle.
- Multiple people or no suitable person.

### 4.3 Optional face-region dataset

Only after Phase 5B approval:

- Explicitly consented or appropriate synthetic data.
- Multiple images per individual under varied conditions.
- Large non-related comparison population.
- Age bands, gender, and ethically annotated skin-tone slices when consent and sample sizes support them.
- No use of region, name, language, or religion as demographic proxies.

## 5. Metrics

### 5.1 Retrieval metrics

| Metric | Purpose |
|---|---|
| Recall@1 and Recall@5 | Relevant candidate retrieval within top results |
| Precision@1 and Precision@5 | Fraction of displayed candidates labeled relevant |
| Mean reciprocal rank | Ranking quality |
| No-result accuracy | Ability to avoid displaying candidates when none meet policy |
| False-positive identification rate | Non-related searches returning at least one candidate above threshold |
| False-negative identification rate | Related searches failing to return the labeled candidate above threshold |

### 5.2 Calibration and threshold metrics

- Score distributions for related and non-related examples.
- Threshold performance at each representative gallery size.
- Confidence intervals for all primary rates.
- Calibration drift between development and held-out data.
- Result-count distribution per query.
- Threshold stability across model and preprocessing versions.

### 5.3 Slice metrics

Report primary metrics by:

- Input language.
- Age band.
- Gender where appropriately labeled.
- Skin-tone group only when ethically and explicitly annotated.
- Image-quality band.
- Pose, occlusion, and lighting.
- Device/source quality.
- Time gap between images.
- Report type.
- Region only for service coverage analysis, not as a sensitive identity proxy.

### 5.4 System metrics

- Report embedding job latency and failure rate.
- Smart Search end-to-end latency.
- AI service timeout and safe-fallback rate.
- Queue age and retry count.
- Embedding invalidation completion.
- Retention deletion completion.
- Unauthorized request rejection.
- Zero-retention verification.
- Model kill-switch activation time.

### 5.5 Human-review metrics

- View, dismiss, suppress, flag, and contact-request rates.
- Dismissal and quality-incident reason distribution.
- Time from recommendation to review.
- Reappearance rate for suppressed pairs; target zero under the same model version.
- Contact acceptance/decline as workflow outcomes, not as ground truth for identity.

## 6. Test design

### 6.1 Offline model tests

1. Freeze model, preprocessing, and dataset versions.
2. Generate embeddings once under controlled deterministic settings where possible.
3. Evaluate each modality independently.
4. Evaluate combined scoring with missing modalities.
5. Run representative gallery-size experiments.
6. Run slice and quality analyses.
7. Produce an immutable evaluation artifact and limitations report.

### 6.2 Shadow testing

- Run against a synthetic or separately consented local dataset.
- Do not show Phase 5 results to normal users.
- Compare model output with deterministic baseline and evaluator labels.
- Exercise retry, timeout, invalidation, retention, and kill-switch paths.

### 6.3 Security and privacy tests

Verify:

- Search images never create files.
- Query embeddings never create database rows.
- Response serialization cannot expose vectors or private paths.
- Inference service rejects non-loopback or unauthenticated calls.
- Logs contain no image bytes, vectors, raw sensitive text, contact values, or keys.
- Encryption detects modification and uses non-reused nonces.
- Permission withdrawal and lifecycle changes invalidate derived data.
- Retention removes files/vectors and dependent recommendations as specified.

### 6.4 Abuse and misuse tests

- Oversized and malformed files.
- MIME/signature disagreement.
- Images with multiple people or no suitable person.
- Repeated automated searches and rate-limit behavior.
- Attempts to retrieve hidden reports.
- Attempts to search with private paths or internal identifiers.
- Attempts by admin to bypass contact consent.
- Attempts to interpret results as identity decisions in UI text or API fields.

## 7. Release criteria

### 7.1 Required before any Phase 5A activation

- Model license, checksum, and provenance approved.
- Data-processing purpose and retention approved.
- Held-out text and visual evaluation complete.
- False-positive target and approved threshold recorded for representative gallery size.
- No unexplained material slice disparity.
- If a slice lacks enough data, the limitation is explicit and activation scope is restricted.
- Zero-retention, encryption, authorization, deletion, fallback, and kill-switch tests pass.
- Top-result limit and safe explanations pass UI/API checks.
- All existing project validation commands pass.

The numerical false-positive target is deliberately not fixed in this document. It must be chosen after baseline measurement and approved with confidence intervals, gallery-size assumptions, and consequence analysis.

### 7.2 Additional required before Phase 5B activation

- Separate face-region processing-policy approval.
- Dedicated consent/basis and withdrawal design.
- Representative one-to-many evaluation.
- Demographic and quality slice evaluation.
- Independent review of model/license/dataset limitations.
- Verified ability to disable only face-region processing.

## 8. Existing software validation suite

Run from the web directory:

~~~powershell
npm run lint
npm run build
npm run check:phase45
npm run check:terms
npm run check:routes
npm run check:public-reports
npm run check:uploads
~~~

With HUMTRACE_BASE_URL set to http://localhost:3010:

~~~powershell
npm run check:auth-workflows
npm run check:phase3-workflows
npm run check:phase4-workflows
npm run check:phase4-admin-workflows
npm run check:phase45-workflows
~~~

Phase 5 shall add foundation, privacy, retention, model-registry, job, inference-contract, evaluation, scoring, and live workflow checks without removing existing checks.

## 9. Evaluation report template

Every evaluation artifact shall include:

1. Purpose and prohibited uses.
2. Model artifact, version, checksum, and license.
3. Preprocessing and scoring versions.
4. Dataset provenance, permission, size, splits, and limitations.
5. Gallery size and query composition.
6. Overall and slice-level metrics with confidence intervals.
7. Quality failure behavior.
8. Threshold proposal and rationale.
9. Known limitations and unmeasured risks.
10. Reviewer names/roles, approval state, and date.
11. Rollback and disable procedure.

