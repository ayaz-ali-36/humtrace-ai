# HumTrace AI Project Documentation

Version: 1.0  
Baseline: Phase 4.5 complete; Phase 5 design only  
Last updated: 2026-07-14

This directory is the documentation baseline for HumTrace AI. It describes the system that is implemented today and the proposed Phase 5 AI-assisted similarity capability. Phase 5 items are design proposals and must not be treated as implemented until they are reviewed, approved, built, and evaluated.

## Status legend

- **Implemented**: present in the Phase 4.5 repository.
- **Phase 5 proposed**: approved design work is still required before implementation.
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

## Non-negotiable safety rules

- The system provides possible recommendations, similarity signals, and AI-assisted suggestions only.
- Human review is required before any follow-up.
- Contact details remain hidden until the receiving reporter accepts a contact request.
- Admin users moderate content and operations; they do not make identity determinations.
- Stored report photographs remain private and are never served from the public asset directory.
- Smart Search photographs have zero persistence.
- No Phase 5 model may be enabled without model, privacy, retention, and evaluation approval.

