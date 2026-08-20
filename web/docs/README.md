# HumTrace AI Project Documentation

Version: 1.3
Baseline: Phase 5 local engineering implemented; approximately 50-volunteer thesis pilot planned; normal activation evaluation pending
Last updated: 2026-08-19

This directory describes the current application and preserves relevant design history. The implemented Phase 5 scope is English all-MiniLM-L6-v2 text similarity plus DeepFace FaceNet face similarity through a root-level internal FastAPI service. The final evaluation is not approved, so normal user-visible model activation remains gated.

The implemented system does not generate, synthesize, edit, or enhance images. It only analyzes user-supplied photographs for possible similarity and never confirms identity.

## Status legend

- **Implemented**: present in the current repository.
- **Phase 5 engineering implemented**: code and local model smoke tests are complete; representative release evaluation is still required.
- **Out of scope**: intentionally excluded from the current local demo.

## Documents

1. [Software Requirements Specification](./01-SOFTWARE-REQUIREMENTS-SPECIFICATION.md)
2. [System Architecture](./02-SYSTEM-ARCHITECTURE.md)
3. [ER Diagram](./03-ER-DIAGRAM.md)
4. [Database Schema](./04-DATABASE-SCHEMA.md)
5. [AI Pipeline Design](./05-AI-PIPELINE-DESIGN.md)
6. [Sequence Diagrams](./06-SEQUENCE-DIAGRAMS.md)
7. [API Specification](./07-API-SPECIFICATION.md)
8. [Frontend Wireframes](./08-FRONTEND-WIREFRAMES.md)
9. [Evaluation Plan](./09-EVALUATION-PLAN.md)
10. [Folder Structure](./10-FOLDER-STRUCTURE.md)
11. [Approved UI Baseline](./11-APPROVED-UI-BASELINE.md)

## Non-negotiable safety rules

- The system provides possible recommendations, similarity signals, and AI-assisted suggestions only.
- Human review is required before any follow-up.
- Contact details remain hidden until the receiving reporter accepts a contact request.
- Admin users moderate content and operations; they do not make identity determinations.
- Stored report photographs remain outside the public asset directory. Anonymous access is disabled by default; a local presentation-only switch may serve eligible public-report photographs through a controlled no-store route and must remain off for deployment.
- Smart Search photographs have zero persistence.
- No Phase 5 model may be enabled without model, privacy, retention, and evaluation approval.
