# 13 — Deployment and Operations

## 1. Environments
- Local development
- CI test
- Staging with payment sandbox
- Production with live provider credentials

## 2. Deployment shape
- Reverse proxy / TLS
- Next.js web
- Laravel API
- Queue worker
- Scheduler
- PostgreSQL
- Redis (if used)
- Object storage
- Monitoring/logging

For MVP, Docker Compose can standardize deployment. Prefer managed PostgreSQL and automated backups for production if budget allows. Do not host the only database copy on a developer laptop.

## 3. CI/CD
- Format/lint
- Typecheck/static analysis
- Unit/integration tests
- Security/dependency scan
- Build
- Migration validation
- Deploy staging
- Smoke tests
- Manual production approval
- Deploy production
- Post-deploy health check

## 4. Backups
- Automated daily backups.
- Point-in-time recovery where available.
- Encrypted offsite copy.
- Restore test at least quarterly.
- Define retention and access.

## 5. Monitoring
- API error rate/latency.
- Queue depth and failed jobs.
- Payment webhook failures.
- Commission run failures.
- Ledger imbalance alert (must be zero).
- Payout failures.
- DB storage/connections.
- Uptime and certificate expiry.

## 6. Operational runbooks
- Payment webhook delayed.
- Duplicate payment event.
- Commission run failure.
- Refund/chargeback.
- Payout failed.
- Suspected account takeover.
- Ledger reconciliation mismatch.
- Database restore/disaster recovery.
