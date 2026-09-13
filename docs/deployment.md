# Production Deployment & Operations Manual — CDSPrep

**Document:** CDSPrep High-Availability Production Deployment Guide  
**Platform Version:** 1.0.0  
**Target Infrastructure:** Containerized Linux Host (Ubuntu 22.04+ / Debian 12 / AWS ECS / EKS / Docker Swarm)  
**Security Classification:** Highly Confidential  

---

## 1. Infrastructure Requirements

### 1.1 Compute & Sizing Recommendations

| Component | Minimum (Staging / < 1,000 MAU) | Production Tier 1 (1,000 – 25,000 MAU) | Production Tier 2 (High Concurrency Exam Days) |
| :--- | :--- | :--- | :--- |
| **Edge Reverse Proxy** | 1 vCPU, 512 MB RAM | 2 vCPU, 1 GB RAM | 4 vCPU, 2 GB RAM (Multi-AZ Load Balancer) |
| **Next.js Web (`apps/web`)** | 1 vCPU, 1 GB RAM | 2 vCPU, 2 GB RAM | 4 vCPU, 4 GB RAM (2–4 Replicas) |
| **NestJS API (`apps/api`)** | 1 vCPU, 1.5 GB RAM | 4 vCPU, 4 GB RAM | 8 vCPU, 8 GB RAM (2–4 Replicas) |
| **BullMQ Worker (`apps/worker`)**| 1 vCPU, 1 GB RAM | 2 vCPU, 2 GB RAM | 4 vCPU, 4 GB RAM (Dedicated Workers) |
| **PostgreSQL 16** | 2 vCPU, 2 GB RAM, 20 GB SSD | 4 vCPU, 8 GB RAM, 100 GB NVMe | 8 vCPU, 32 GB RAM, 500 GB NVMe (Primary + Read Replica) |
| **Redis 7** | 1 vCPU, 512 MB RAM | 2 vCPU, 2 GB RAM | 4 vCPU, 8 GB RAM (Cluster / Sentinel with AOF) |

### 1.2 Network & Ports

- **External Ingress:**
  - Port `80` (HTTP) — Redirects immediately to HTTPS.
  - Port `443` (HTTPS) — TLS 1.2/1.3 termination at Reverse Proxy/CDN.
- **Internal Network (Strictly Isolated Bridge / VPC):**
  - Web: Port `3000` (Internal only).
  - API: Port `4000` (Internal only).
  - PostgreSQL: Port `5432` (Internal only, never exposed to public internet).
  - Redis: Port `6379` (Internal only, protected by password and internal subnet).

---

## 2. Production Environment Variables Reference

Never commit production secrets to Git. Copy `.env.production.example` to `.env.production` on the production host with restricted permissions (`chmod 600 .env.production`).

### 2.1 Configuration Matrix

| Variable | Description | Example / Allowed Values | Security Constraints |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Application environment mode | `production` | Strict CORS & error masking active |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/cdsprep?schema=public&connection_limit=25` | Strong password, internal host |
| `REDIS_URL` | Redis authenticated connection | `redis://:pass@host:6379` | Password required |
| `REDIS_PASSWORD` | Standalone Redis server password | `Random64CharString` | Min 32 chars |
| `JWT_SECRET` | Secret for Access Tokens (15m) | `openssl rand -hex 32` | Min 64 hex characters |
| `JWT_EXPIRES_IN` | Access token lifespan | `15m` | Keep short for security |
| `JWT_REFRESH_SECRET` | Secret for Refresh Tokens (7d) | `openssl rand -hex 32` | Distinct from `JWT_SECRET` |
| `JWT_REFRESH_EXPIRES_IN`| Refresh token lifespan | `7d` | Token rotation enforced |
| `CORS_ORIGIN` | Allowed CORS origins | `https://cdsprep.com,https://www.cdsprep.com` | **Wildcard (`*`) is prohibited** |
| `NEXT_PUBLIC_API_URL` | Client-facing API URL | `https://cdsprep.com/api/v1` | HTTPS enforced |
| `S3_ENDPOINT` | S3 / MinIO API endpoint | `https://s3.ap-south-1.amazonaws.com` | HTTPS |
| `S3_BUCKET` | Cloud asset storage bucket | `cdsprep-production-assets` | Private ACL |
| `OPENAI_API_KEY` | OpenAI API Token | `sk-proj-...` | Keep private |
| `GEMINI_API_KEY` | Google Gemini API Token | `AIza...` | Keep private |
| `SMTP_HOST` | Transactional email relay host | `smtp.sendgrid.net` / `email-smtp.ap-south-1.amazonaws.com` | Port 587 (TLS) |

---

## 3. Database Setup & Connection Pooling

### 3.1 PostgreSQL 16 Provisioning

Initialize PostgreSQL with UTF-8 encoding and optimized configuration:

```sql
CREATE DATABASE cdsprep WITH ENCODING 'UTF8' LC_COLLATE = 'en_US.UTF-8' LC_CTYPE = 'en_US.UTF-8';
CREATE USER cdsprep_admin WITH ENCRYPTED PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE cdsprep TO cdsprep_admin;
ALTER DATABASE cdsprep OWNER TO cdsprep_admin;
```

### 3.2 Connection Pooling Formula & PgBouncer

To prevent database connection exhaustion under sudden concurrent exam traffic, configure Prisma and PgBouncer using the sizing formula:

$$\text{Max Connections} = (\text{CPU Cores} \times 2) + \text{Disk Spindle Count}$$

- **Prisma Connection Limit**: Sized in `DATABASE_URL`:
  ```text
  postgresql://cdsprep_admin:password@postgres:5432/cdsprep?schema=public&connection_limit=25&pool_timeout=10
  ```
- **PgBouncer Configuration (`pgbouncer.ini`)**:
  - `pool_mode = transaction`
  - `max_client_conn = 1000`
  - `default_pool_size = 25`
  - `reserve_pool_size = 5`

---

## 4. Production Migration Strategy

### 4.1 Zero-Downtime Expand-and-Contract Pattern

Never apply destructive schema migrations (dropping columns, renaming columns) in a single deploy step. Follow the **Expand and Contract** pattern:

1. **Phase 1 (Expand)**: Add new nullable columns or tables. Deploy new API code that writes to both old and new columns.
2. **Phase 2 (Backfill)**: Run asynchronous background migration via worker to backfill data from old columns to new columns.
3. **Phase 3 (Contract)**: Update code to read and write exclusively from new columns.
4. **Phase 4 (Cleanup)**: Drop deprecated columns in a future release.

### 4.2 Applying Production Migrations

Run non-interactive deployment migrations before booting new containers:

```bash
# Using automated migration script:
./scripts/db-migrate-prod.sh

# Or via pnpm command:
pnpm --filter @cdsprep/database prisma migrate deploy
```

> [!CAUTION]
> **Production Safety Rule**: Never run `prisma db push` or `prisma migrate dev` on a production database! Always use `prisma migrate deploy`.

---

## 5. Docker Deployment

### 5.1 Multi-Stage Container Architecture

CDSPrep services run under unprivileged, non-root users:
- **`apps/api`**: Runs as user `nestjs` (UID 1001) on `node:22-alpine`.
- **`apps/web`**: Runs as user `nextjs` (UID 1001) on `node:22-alpine` using Next.js standalone tracing.
- **`apps/worker`**: Runs as user `worker` (UID 1001) on `node:22-alpine`.

### 5.2 Deploying via Docker Compose

1. Clone repository on production server:
   ```bash
   git clone https://github.com/your-org/cdsprep.git /opt/cdsprep
   cd /opt/cdsprep
   ```
2. Copy and populate production secrets:
   ```bash
   cp .env.production.example .env.production
   chmod 600 .env.production
   ```
3. Build and launch all production services:
   ```bash
   docker compose --env-file .env.production -f docker-compose.prod.yml build
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d
   ```
4. Verify service health:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

---

## 6. CI/CD Automation

Continuous Integration and Continuous Deployment are managed via GitHub Actions:

- **`.github/workflows/ci.yml`**:
  1. `security-audit`: Runs `pnpm audit --audit-level=high` on locked dependencies.
  2. `lint-and-typecheck`: Runs `pnpm lint`, `pnpm typecheck`, and `pnpm format:check`.
  3. `test`: Runs full unit & integration tests against Postgres 16 and Redis 7 service containers.
  4. `e2e`: Executes full end-to-end cadet examination workflows.
  5. `build`: Executes production compilation.
- **`.github/workflows/deploy.yml`**:
  - Gated strictly upon successful completion of the CI workflow on `main`.
  - Builds multi-stage Docker images tagged with Git commit short SHA.
  - Pushes images to container registry (GHCR/ECR).
  - Triggers zero-downtime rolling deployment with healthcheck validation.

---

## 7. Rollback Procedures

### 7.1 Container Application Rollback

If a newly deployed build exhibits defects:
1. Re-tag or point `docker-compose.prod.yml` to previous stable commit SHA:
   ```bash
   export IMAGE_TAG="prev-commit-sha"
   docker compose -f docker-compose.prod.yml up -d
   ```
2. In Kubernetes / ECS:
   ```bash
   kubectl rollout undo deployment/cdsprep-api
   kubectl rollout undo deployment/cdsprep-web
   ```

### 7.2 Database Rollback Strategy

- Because migrations are designed according to the **Expand and Contract** pattern, reverting application code to the previous release will not break database compatibility.
- If a migration must be reverted, create a forward migration that inverts the change (`prisma migrate diff` -> `prisma migrate deploy`).

---

## 8. Backups & Retention Policy

### 8.1 Automated Database Backup Script

Automated backups are executed by `./scripts/db-backup.sh`:
- Generates timestamped, compressed custom dumps (`.dump`) and gzipped SQL dumps (`.sql.gz`).
- Computes SHA256 integrity checksums.
- Automatically purges backups older than `RETENTION_DAYS` (default: 30 days).

```bash
# Execute manual backup:
./scripts/db-backup.sh /var/backups/cdsprep

# Configure automated cron job (Runs daily at 02:00 UTC):
0 2 * * * cd /opt/cdsprep && ./scripts/db-backup.sh /var/backups/cdsprep >> /var/log/cdsprep_backup.log 2>&1
```

### 8.2 Offsite Backup Replication

Synchronize local database backups to an isolated S3 bucket with Object Lock (WORM) enabled:
```bash
aws s3 sync /var/backups/cdsprep s3://cdsprep-offsite-backups/postgres/ --sse aws:kms
```

---

## 9. Monitoring & Observability

### 9.1 Health Check Endpoints

| Endpoint | Probe Type | Purpose | Healthy Status | Degraded / Unhealthy Status |
| :--- | :--- | :--- | :--- | :--- |
| `GET /api/health` | Liveness | Verifies server process is up and running | HTTP 200 `{ status: "ok" }` | HTTP 500 / Process Down |
| `GET /api/ready` | Readiness | Actively queries PostgreSQL (`SELECT 1`) & pings Redis | HTTP 200 `{ ready: true }` | HTTP 503 `{ ready: false }` |

### 9.2 Latency & Metrics Tracking

- **API Latency**: Monitored via `LoggingInterceptor` and Nginx `json_analytics` format (`$request_time`, `$upstream_response_time`).
- **Database Latency**: Monitored on every health probe and logged via Prisma query event metrics.
- **Queue Failures**: Monitored via BullMQ `dead-letter-queue` listener in `apps/worker`.
- **Authentication Failures**: Monitored via security audit logging on `AUTH_FAILED_ATTEMPT` with IP tracking.
- **Test Submission Failures**: Monitored via atomic single-winner locking in `AttemptsService.submit`.

---

## 10. Disaster Recovery Runbook

### 10.1 Recovery Targets

- **Recovery Point Objective (RPO)**: $\le 15 \text{ minutes}$ (via WAL archiving + daily backups).
- **Recovery Time Objective (RTO)**: $\le 30 \text{ minutes}$ for complete infrastructure rebuild.

### 10.2 Complete Database Restoration Runbook

In the event of database corruption or primary hardware loss:

1. Provision a clean PostgreSQL 16 instance.
2. Transfer the latest verified backup archive and checksum file to the host.
3. Run the interactive restore script:
   ```bash
   ./scripts/db-restore.sh /var/backups/cdsprep/cdsprep_backup_20260913_120000.sql.gz
   ```
4. Verify checksum validation passes and confirm prompt by typing `RESTORE`.
5. Run the readiness probe:
   ```bash
   curl -I https://cdsprep.com/api/ready
   ```
6. Confirm HTTP 200 OK response with `{ status: "ok", ready: true }`.
