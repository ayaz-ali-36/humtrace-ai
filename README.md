# HumTrace AI

HumTrace is a final-year thesis pilot for reporting missing and unidentified persons, reviewing possible similarities, and requesting consent-based contact. It is a local demonstration and research prototype, not a production identity system.

The working application is in [`web/`](./web/). The loopback-only inference service is in [`ai-service/`](./ai-service/), and public-safe evaluation documentation is in [`evaluation/`](./evaluation/).

## Quick start

~~~powershell
cd web
npm install
Copy-Item .env.example .env
npm run db:migrate
npm run db:generate
npm run db:seed
npm run dev
~~~

See [`web/README.md`](./web/README.md) for configuration, demo accounts, AI-service commands, validation, privacy boundaries, and limitations. See [`web/docs/README.md`](./web/docs/README.md) for the complete project documentation.

## Important limits

- Similarity recommendations never confirm identity and always require human review.
- Contact details remain hidden until the receiving reporter accepts a request.
- Local report photographs, databases, model files, `.env`, evaluation runtime data, and volunteer data are ignored and must not be committed.
- `HUMTRACE_DEMO_PUBLIC_REPORT_PHOTOS` is `false` by default and must remain off outside an authorized local presentation.
- Current AI activation is development-only pending the approximately 50-volunteer consented thesis pilot and held-out evaluation.
