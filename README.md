# CDSPrep — Production-Grade CDS Examination Preparation Platform

> **Prepare Smarter. Practice Better. Crack CDS With Confidence.**

CDSPrep is an enterprise-grade competitive examination preparation platform specifically tailored for the UPSC Combined Defence Services (CDS) examination (IMA, INA, AFA, and OTA).

---

## Monorepo Architecture

This project is structured as a unified TypeScript monorepo orchestrated via **pnpm workspaces** and **Turborepo**:

```text
cdsprep/
├── apps/
│   ├── web/           # Next.js 15+ App Router, Tailwind CSS, shadcn/ui, KaTeX
│   ├── api/           # NestJS 11 REST API, OpenAPI/Swagger, RBAC
│   └── worker/        # Standalone NestJS Worker + BullMQ Queue Consumer
├── packages/
│   ├── ui/            # Shared Tailwind / Radix UI component library
│   ├── database/      # Prisma 6 ORM, PostgreSQL schema & migration utilities
│   ├── types/         # Domain models, enums, API envelope contracts
│   ├── validation/    # Shared Zod validation schemas & typed env validation
│   ├── config/        # Central typed environment & validation schemas
│   ├── ai/            # Decoupled AI provider abstraction, cost tracker & math validator
│   ├── email/         # Transactional email service (Resend, SendGrid) & 8 templates
│   ├── storage/       # S3-compatible cloud object storage (R2, S3, MinIO, Supabase)
│   ├── payments/      # Payment gateway (Razorpay, Stripe) & HMAC webhook verifiers
│   └── search/        # Search engine abstraction (PostgreSQL FTS, OpenSearch)
├── docs/              # 11 Architecture, PRD, and Engineering specifications
├── docker-compose.yml # PostgreSQL 16 & Redis 7 development services
├── .env.example       # Categorized environment variables blueprint
└── turbo.json         # Turborepo task pipeline configuration
```

---

## Prerequisites

- **Node.js**: `v20.x` or higher (tested on `v24.x`)
- **pnpm**: `v9.x` or higher (tested on `v12.x`)
- **Docker & Docker Compose**: For local PostgreSQL and Redis instances

---

## Quick Start & Setup

### 1. Clone & Install Dependencies

```bash
git clone <repo-url> cdsprep
cd cdsprep
pnpm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Ensure required secrets (`DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) are configured.

### 3. Start Local Database & Redis Services

```bash
docker compose up -d
```

This boots:

- **PostgreSQL 16**: `localhost:5432` (database: `cdsprep`)
- **Redis 7**: `localhost:6379`

### 4. Initialize Database & Generate Prisma Client

```bash
pnpm db:push
pnpm db:seed
```

### 5. Start Development Servers

```bash
pnpm dev
```

- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
- **Web Health**: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- **API Health**: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)

---

## Available Scripts

| Command             | Description                                                                |
| :------------------ | :------------------------------------------------------------------------- |
| `pnpm dev`          | Starts all applications (`web`, `api`, `worker`) in development mode       |
| `pnpm build`        | Compiles all packages and builds production bundles                        |
| `pnpm lint`         | Runs ESLint across all apps and packages                                   |
| `pnpm typecheck`    | Executes TypeScript compiler (`tsc --noEmit`) across the entire repository |
| `pnpm test`         | Runs unit & integration test suites via Vitest                             |
| `pnpm format`       | Formats all code using shared Prettier configuration                       |
| `pnpm format:check` | Verifies code formatting compliance                                        |
| `pnpm db:generate`  | Generates the Prisma client from `schema.prisma`                           |
| `pnpm db:migrate`   | Applies database migrations in development                                 |
| `pnpm db:push`      | Pushes the schema directly to PostgreSQL without migration files           |
| `pnpm db:seed`      | Seeds roles, permissions, and core CDS subjects                            |
| `pnpm db:studio`    | Launches Prisma Studio GUI for database inspection                         |
| `pnpm validate:env` | Validates client/server environment schemas against production rules       |
| `pnpm verify:integrations` | Generates a sanitized audit report of all 11 external services and tests |

---

## Health Checks & Observability

Every application service implements standard health probes:

- **Web (`apps/web`)**:
  - `GET /api/health` $\implies$ Returns uptime, status, and environment.
- **API (`apps/api`)**:
  - `GET /api/v1/health` $\implies$ Full diagnostic check including database and Redis latency.
  - `GET /api/v1/health/liveness` $\implies$ Container liveness probe.
  - `GET /api/v1/health/readiness` $\implies$ Container readiness probe.
  - `GET /api/v1/health/integrations` $\implies$ Sanitized status report for all external services.
- **Worker (`apps/worker`)**:
  - Standalone internal health service monitoring memory footprint and active queues (`test-scoring`, `ai-explanation`).

---

## Documentation Index

Comprehensive engineering specifications and integration runbooks:

- [External Services & Integrations Matrix](docs/integration-matrix.md)
- [API Keys & Third-Party Services Setup Runbook](docs/api-keys-setup.md)
- [Secrets Management & Key Rotation Policy](docs/secrets-management.md)
- [Phase 19 Integrations Completion Report](docs/phase-19-report.md)
- [Product Requirements Document (PRD)](docs/PRD.md)
- [Technical Requirements Document (TRD)](docs/TRD.md)
- [Architecture & C4 Diagrams](docs/architecture.md)
- [Database ERD & Schema](docs/database.md)
- [REST API Specifications](docs/api.md)
- [Security Model & STRIDE Threat Analysis](docs/security.md)
- [Testing Strategy & Edge Cases](docs/testing.md)
- [Deployment & DevOps Specifications](docs/deployment.md)
- [AI Engine Architecture](docs/ai.md)
- [Content Management & Legal PYQ Ingestion](docs/content-management.md)
- [Frontend Routes & Examination UX](docs/frontend-routes.md)
