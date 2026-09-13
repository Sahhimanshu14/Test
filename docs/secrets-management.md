# CDSPrep Secrets Management, Security & Key Rotation Policy

This document establishes the operational rules, secrets management workflows, rotation schedules, and incident response procedures for all credentials in the CDSPrep platform.

---

## 1. Non-Negotiable Core Rules

1. **NEVER commit secrets to Git:**
   * `.env`, `.env.local`, `.env.production`, and credential JSONs are listed in `.gitignore`.
   * CI/CD pipelines run automated static secret scanners (`gitleaks`).
2. **Client Bundle Isolation:**
   * Only variables explicitly prefixed with `NEXT_PUBLIC_` are bundled into frontend JavaScript.
   * `@cdsprep/config` runs fail-fast regex audits at build time. Any `NEXT_PUBLIC_*` variable containing `secret`, `password`, `private`, or `jwt` will immediately abort the build.
3. **Environment Separation:**
   * Development, Staging, and Production MUST use distinct credentials and separate database instances. Production credentials are never used on local machines.
4. **Least Privilege Principle:**
   * Storage IAM tokens are scoped strictly to the specific CDSPrep asset bucket with read/write restrictions.
   * Database users operate with application-level schemas, avoiding superuser privileges in production.

---

## 2. Secrets Management by Environment

```
Development:
  Developer Machine ──> .env (Localhost / Mock providers / zero cost)

CI / Automated Tests:
  GitHub Actions ───> GitHub Encrypted Repository Secrets (Hermetic mock mode)

Staging & Production:
  Infrastructure ───> AWS Secrets Manager / Doppler / Kubernetes Sealed Secrets
                           ↓
                      Injected as Environment Variables into Pod Container
                           ↓
                      Validated by @cdsprep/config at startup
```

### Production Ingestion (Recommended Tooling)
* **Doppler:** Centralized secrets orchestration with encrypted sync to ECS/EKS/Docker.
* **AWS Secrets Manager / SSM Parameter Store:** KMS-encrypted parameters fetched via IAM instance roles.
* **Kubernetes:** `SealedSecrets` or `ExternalSecrets` operator syncing directly into Pod environment variables.

---

## 3. Secret Rotation Protocol

| Credential | Rotation Cadence | Downtime Required? | Procedure |
| :--- | :--- | :--- | :--- |
| **JWT Access Secret** | Every 90 days | Zero Downtime | 1. Support dual verification keys during transition window (15 mins). 2. Switch signing key. 3. Expire old key. |
| **JWT Refresh Secret** | Every 90 days | Forces re-login | Update secret in Vault; users will be required to re-authenticate when refreshing. |
| **PostgreSQL Password** | Every 180 days | Zero Downtime | 1. Create second user or update password. 2. Update connection string in pooler. 3. Reload pooler gracefully. |
| **Redis Password** | Every 180 days | Zero Downtime | Enable multi-user ACL in Redis 7+, switch active credentials in Vault. |
| **OpenAI / AI Key** | Every 90 days | Zero Downtime | 1. Generate new key in platform.openai.com. 2. Deploy updated secret. 3. Revoke old key after 1 hour. |
| **Resend / Email Key** | Every 90 days | Zero Downtime | 1. Create new API key in Resend dashboard. 2. Update config. 3. Delete old key. |
| **S3 / R2 Keys** | Every 90 days | Zero Downtime | 1. Generate new Access Key ID in IAM / Cloudflare. 2. Deploy updated env. 3. Delete old access key. |
| **Razorpay / Stripe** | Every 180 days | Zero Downtime | Rotate in provider portal with grace period support. |

---

## 4. Compromised Secret Incident Response Plan

If any credential is accidentally leaked, committed, or suspected of compromise, execute this procedure immediately:

### Step 1: Revoke and Isolate
* Immediately revoke the compromised key from the provider's developer console (e.g. OpenAI, AWS IAM, Resend, Razorpay).
* Do not wait for code changes to revoke a leaked key.

### Step 2: Issue Emergency Replacement
* Generate a fresh high-entropy key in the provider console.
* Update production secrets manager (Doppler / AWS Secrets Manager).
* Trigger zero-downtime rolling restart of backend API containers.

### Step 3: Audit Access Logs
* Inspect provider audit logs for anomalous activity (e.g. unexpected spikes in OpenAI token consumption, unauthorized S3 downloads, unauthorized email sends).
* Inspect CDSPrep application audit logs (`audit_logs` table) for suspicious administrative actions.

### Step 4: Repository Sanitization (if committed to Git)
* If committed to Git, rotate the key immediately. Rotating the key neutralizes the vulnerability.
* Use `git-filter-repo` or BFG Repo-Cleaner to purge the sensitive commit from Git history before pushing updates.

---

## 5. Pre-Commit Verification Command

Developers can verify environment health before deploying or opening pull requests:

```bash
pnpm verify:integrations
```
