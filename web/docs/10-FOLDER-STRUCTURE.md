# Folder Structure

## 1. Repository structure

~~~text
humanTrace_AI/
├── .agents/                         Local agent configuration
├── .git/                            Present but empty; Git is not initialized
├── stitch_reference/                Earlier visual/reference material
├── web/                             Next.js application
├── HUMTRACE_CODEX_PHASE_PROMPTS_UPDATED.md
├── PHASE_1_PROGRESS.md
├── PHASE_2_PROGRESS.md
├── PHASE_3_PROGRESS.md
└── PHASE_4_PROGRESS.md
~~~

## 2. Current web application

~~~text
web/
├── app/
│   ├── (auth)/
│   │   └── admin/login/page.js
│   ├── admin/
│   │   ├── dashboard/page.js
│   │   ├── manage/page.js
│   │   ├── staff/page.js
│   │   └── layout.js
│   ├── api/
│   │   ├── admin/
│   │   │   ├── settings/route.js
│   │   │   ├── staff/route.js
│   │   │   └── users/[id]/route.js
│   │   ├── auth/
│   │   │   ├── login/route.js
│   │   │   ├── logout/route.js
│   │   │   ├── me/route.js
│   │   │   └── register/route.js
│   │   ├── contact-requests/
│   │   │   ├── [id]/route.js
│   │   │   └── route.js
│   │   ├── health/route.js
│   │   ├── recommendations/[id]/route.js
│   │   ├── reports/
│   │   │   ├── [publicId]/route.js
│   │   │   └── route.js
│   │   ├── search/recommendations/route.js
│   │   └── track/[publicId]/route.js
│   ├── reporter/
│   │   ├── connection-requests/page.js
│   │   ├── dashboard/page.js
│   │   ├── my-reports/page.js
│   │   ├── profile/page.js
│   │   ├── recommendations/page.js
│   │   └── layout.js
│   ├── report/
│   │   ├── missing/page.js
│   │   └── unidentified/page.js
│   ├── about/page.js
│   ├── browse/page.js
│   ├── contact/page.js
│   ├── login/page.js
│   ├── register/page.js
│   ├── search/page.js
│   ├── track/page.js
│   ├── globals.css
│   ├── layout.js
│   ├── not-found.js
│   └── page.js
├── components/
│   └── ui/kit.jsx                   Shared public, reporter, and admin UI
├── data/
│   └── mock-data.js                 Legacy/demo display data
├── docs/                             Project documentation
├── lib/
│   ├── auth.js                      Sessions and role guards
│   ├── auth-constants.js            Roles, statuses, cookie name
│   ├── constants.js                 Privacy notice and regions
│   ├── database-views.js            Role-specific database view models
│   ├── prisma.js                    Prisma singleton
│   ├── public-reports.js            Public-safe report query
│   ├── recommendations.js           Deterministic scoring and persistence
│   ├── report-validation.js         Zod report validation
│   ├── routes.js                    Page route inventories
│   ├── settings.js                  Persisted system settings
│   ├── upload-storage.js            Private image validation/storage
│   └── utils.js
├── prisma/
│   ├── migrations/                  SQL migration history
│   ├── dev.db                       Local SQLite database
│   ├── schema.prisma                Current data model
│   └── seed.js                      Demo seed
├── public/                           Public static assets; no report images
├── scripts/
│   ├── apply-*-migration.js         Local migration helpers
│   └── check-*.js                   Foundation and workflow checks
├── storage/
│   └── reports/
│       └── [publicId]/               Private report images
├── .env
├── .env.example
├── .eslintrc.json
├── .gitignore
├── jsconfig.json
├── next.config.js
├── package.json
├── package-lock.json
├── PHASE_4_5_PROGRESS.md
├── postcss.config.js
├── README.md
└── tailwind.config.js
~~~

## 3. Proposed Phase 5 additions

Status: Design only.

~~~text
web/
├── app/
│   └── api/
│       └── ai/
│           ├── feedback/route.js           Reporter feedback/suppression
│           └── processing-basis/route.js   Reporter policy control
├── lib/
│   └── ai/
│       ├── candidate-eligibility.js        Opposite-type and lifecycle filters
│       ├── encryption.js                   Authenticated vector encryption
│       ├── feature-flags.js                Independent modality kill switches
│       ├── inference-client.js             Loopback internal service client
│       ├── invalidation.js                 Derived-data lifecycle handling
│       ├── model-registry.js               Approved model resolution
│       ├── retention.js                    Expiry/deletion rules
│       ├── scoring.js                      Calibrated modality combination
│       └── safe-explanations.js            Public/reporter explanation allowlist
├── services/
│   └── ai/
│       ├── app/                            Local Python inference package
│       ├── models/                         Local approved artifacts, ignored
│       ├── tests/
│       ├── requirements.lock               Reviewed pinned dependencies
│       └── README.md
├── workers/
│   ├── ai-jobs.js                          Idempotent embedding/backfill worker
│   └── retention.js                        Scheduled deletion worker
├── evaluation/
│   ├── configs/                            Versioned evaluation configurations
│   ├── fixtures/                           Synthetic/consented local fixtures
│   ├── reports/                            Generated evaluation artifacts
│   └── scripts/                            Offline metric runners
├── prisma/
│   └── migrations/
│       └── [timestamp]_phase5_ai_foundation/
└── scripts/
    ├── check-phase5-foundation.js
    ├── check-phase5-privacy.js
    ├── check-phase5-retention.js
    ├── check-phase5-evaluation.js
    └── check-phase5-workflows.js
~~~

The exact Phase 5 structure may change during design review. The public web application shall not expose the internal inference service directly.

## 4. Ownership boundaries

| Directory | Data/code sensitivity | Rule |
|---|---|---|
| public/ | Public | Never store report images, vectors, or private exports |
| storage/reports/ | Highly sensitive | Server-only access; retention controlled |
| prisma/dev.db | Sensitive | Local database; never publish |
| services/ai/models/ | Restricted | Approved local artifacts; no unreviewed downloads |
| evaluation/fixtures/ | Restricted | Synthetic or separately consented data only |
| evaluation/reports/ | Internal | Metrics and limitations; no raw operational content |
| docs/ | Public-safe project documentation | No credentials, contact data, or report images |

