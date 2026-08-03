# Thesis Pilot and Evaluation Plan

## 1. Status and purpose

This is an ethics-ready plan for a local final-year thesis pilot with approximately 50 consenting adult volunteers. It evaluates whether HumTrace retrieves useful possible similarities and avoids false recommendations. It does not approve production deployment, establish identity, or permit operational use with missing-person cases.

The pilot must begin only after the supervisor or institutional reviewer approves the final participant materials and the project owner fills in the responsible researcher, supervisor, institution, contact, storage location, and deletion-date fields.

## 2. Participant information sheet

Each volunteer receives the following information before deciding:

- Project: HumTrace AI final-year thesis pilot.
- Researcher, supervisor, institution, and contact: **fill in before recruitment**.
- Purpose: test local face-pattern and English-description retrieval under controlled conditions.
- Participation: two short capture sessions, eight photographs total, and optional non-sensitive descriptive metadata.
- Processing: photographs may be converted locally into numerical face embeddings for similarity ranking.
- Limits: results can be wrong and never confirm identity.
- Storage: data is pseudonymous, encrypted or access-restricted, kept off GitHub and public folders, and used only for the approved pilot.
- Voluntary participation: refusal has no penalty and participants may stop before or during capture.
- Withdrawal: participants may request deletion using their participant code until the stated anonymization or thesis cut-off date.
- Presentation: allowing a photograph in the private defense presentation is a separate optional choice and is not required for research participation.
- Complaints or questions: contact details and institutional route must be completed before recruitment.

Participants must have time to ask questions and retain a copy of this information.

## 3. Required consent records

### 3.1 Biometric-processing consent

Record an affirmative answer for every item below, with participant code, printed name, signature, researcher signature, and date:

1. I am at least 18 years old and have read the participant information.
2. I voluntarily agree to two capture sessions and eight photographs.
3. I understand that HumTrace will process my face photographs into numerical embeddings for local similarity evaluation.
4. I understand that similarity output can be wrong and does not confirm identity.
5. I understand the storage, access, retention, withdrawal, and deletion procedure.
6. I understand that my raw images and identifiers will not be committed to GitHub or placed in the website's public asset directory.
7. I know how to contact the researcher and request withdrawal.

All seven items are required. A general photography release is not a substitute for explicit biometric-processing consent.

### 3.2 Optional presentation consent

Use a separate checkbox and signature line:

> I optionally allow selected photographs or screenshots containing my image to be shown only during the private thesis defense presentation. I understand that refusing does not affect participation in the evaluation.

Default: **No**. This choice must not be bundled with biometric-processing consent. Public web, social-media, publication, or GitHub use requires new permission and is not covered by this pilot.

## 4. Recruitment and exclusions

- Target approximately 50 adults aged 18 or above.
- Recruit volunteers who can freely consent; do not recruit minors or people unable to consent.
- Do not imply that participation can help locate a real person.
- Do not use operational reports, scraped images, social-media images, or photographs supplied by someone other than the depicted adult.
- Avoid collecting names, religion, national identity numbers, medical data, or exact home addresses in evaluation metadata.
- Participation and presentation consent must not affect grades, employment, or access to services.

## 5. Two-session, eight-photo capture protocol

Assign the pseudonymous participant code before capture. Use the same camera settings where practical, but allow controlled variation needed to test robustness.

### Session 1: reference gallery, four photographs

1. Front-facing, neutral expression, even indoor light.
2. Front-facing, natural expression, same location.
3. Head turned approximately 30 degrees left.
4. Head turned approximately 30 degrees right.

### Session 2: held-time queries, four photographs

Capture on another day or after a meaningful break:

1. Front-facing under different safe lighting.
2. Front-facing with a different non-sensitive background.
3. Slight left pose with ordinary appearance variation such as glasses if normally worn.
4. Slight right pose with ordinary appearance variation.

Capture rules:

- One participant per image; no bystanders.
- No masks unless mask robustness is an explicitly approved sub-test.
- Avoid extreme filters, beauty effects, or image enhancement.
- Check focus and face visibility at capture time without running identity claims.
- Record only the pseudonymous code and approved metadata.
- Delete accidental, duplicate, or bystander-containing captures immediately.

## 6. Pseudonymous metadata template

Use one row per image. Keep the identity-to-code key in a separate restricted location.

| Field | Example or allowed value |
|---|---|
| participant_code | HTV-001 |
| session | 1 or 2 |
| image_number | 1 to 4 |
| capture_date | YYYY-MM-DD |
| age_band | 18-24, 25-34, 35-44, 45+; optional |
| gender_self_description | Optional; participant may decline |
| lighting | even, low, bright, mixed |
| pose | front, left-30, right-30 |
| glasses | yes, no, not recorded |
| image_quality | usable, limited, rejected |
| biometric_consent | yes; required |
| presentation_consent | yes or no; separate |
| withdrawal_status | active, requested, deleted |
| notes | Non-identifying technical note only |

Do not put participant name, email, phone number, or consent signature in this metadata file.

## 7. Secure folder and data-handling plan

~~~text
pilot-private/                    Never commit; restricted access
|-- identity-key/                Code-to-person key and contact record
|-- consent/                     Signed information and consent records
|-- raw/HTV-###/session-1/       Original captures
|-- raw/HTV-###/session-2/
|-- metadata/                    Pseudonymous metadata only
|-- derived/                     Encrypted embeddings and controlled outputs
`-- deletion-log/                Code, scope, date, operator; no image content

evaluation/runtime/              Ignored technical evaluation output
evaluation/reports/              Aggregate public-safe metrics and limitations only
~~~

- Keep raw images and the identity key outside the repository and web `public/` directory.
- Limit access to the named student researcher and approved supervisor or evaluator.
- Use device encryption and a strong account password; keep backups encrypted and access-limited.
- Do not email raw images or use consumer cloud synchronization unless explicitly approved.
- The application database, private report storage, model artifacts, and evaluation runtime remain ignored by Git.
- Record access, export, withdrawal, and deletion events using participant codes.
- Publish only aggregate metrics with no raw image, embedding, private path, or small-group disclosure.

## 8. Withdrawal and deletion procedure

1. The participant submits the participant code to the researcher using the listed contact route.
2. The researcher verifies the request without asking for unnecessary identity information.
3. Mark the code as `withdrawal_requested` and stop new processing immediately.
4. Remove the participant from pending experiments and invalidate cached rankings.
5. Delete all raw session images, derived embeddings, metadata rows, working copies, and identifiable screenshots for that code.
6. Delete the participant's consent/contact record when institutional record-keeping rules permit; otherwise restrict it and record why it must be retained.
7. Check backups and delete at the next documented backup cycle.
8. Add a minimal deletion-log entry containing code, scope, date, and operator—never biometric content.
9. Confirm completion to the participant within the period stated in the approved information sheet.

Aggregate results already included in an irreversibly aggregated analysis may not be separable; this limitation and the withdrawal cut-off date must be stated before consent.

## 9. Development and held-out evaluation design

Split by participant, never by photograph. No person may appear in more than one split.

| Split | Suggested participants | Purpose |
|---|---:|---|
| Development | 30 | Verify pipeline and explore candidate thresholds |
| Validation | 10 | Select and freeze threshold and result-limit policy |
| Held-out test | 10 | Final unbiased thesis result after settings are frozen |

- Session 1 images form the reference gallery; Session 2 images form queries.
- Include unrelated participants as negatives for every query.
- Freeze model version, preprocessing, score combination, threshold, and gallery assumptions before the held-out test.
- Do not tune after viewing held-out identities. Any change creates a new experiment and requires a new untouched test set.
- Report exact sample counts and confidence intervals; approximately 50 volunteers is a small pilot and cannot establish population-wide fairness or production safety.

Primary metrics:

- Recall@1 and Recall@5.
- Precision@1 and Precision@5.
- Mean reciprocal rank.
- False-positive recommendation rate.
- No-result accuracy at the proposed threshold.
- Search latency and quality-limited/no-face/multiple-face rates.
- Results by approved quality conditions; demographic slices only when consented and large enough to avoid misleading claims.

## 10. Separation from Faces94

Faces94 tooling and any prior engineering result remain evaluation-only. Do not import it into the normal application database, expose its images, combine it with volunteer data, or treat it as consent for this use case. The volunteer pilot receives its own dataset version, database, runtime folder, report, and approval decision.

## 11. Release decision and professor-facing explanation

Professor-facing summary:

> HumTrace is a thesis pilot that demonstrates report submission, local similarity retrieval, human review, and consent-based contact. The model produces ranked possible similarities, not identity decisions. Approximately 50 consenting adults provide eight controlled photographs across two sessions. Participants are split by person into development, validation, and untouched held-out groups. Raw images and biometric embeddings remain local and off GitHub. The pilot can support a thesis evaluation, but its small convenience sample does not justify production deployment or population-wide accuracy claims.

The supervisor-facing result should state one of:

- **Engineering demo only:** workflow works; evaluation incomplete.
- **Thesis pilot evaluated:** metrics reported for the approved sample and conditions only.
- **Not approved:** privacy, quality, threshold, or false-positive criteria were not satisfied.

No pilot result authorizes automated identity confirmation, law-enforcement use, public biometric search, or production deployment.
