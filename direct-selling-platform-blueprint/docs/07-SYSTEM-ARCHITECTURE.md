# 07 — System Architecture

## 1. Architecture decision
Modular monolith for MVP. One deployable backend with strict domain modules. Avoid microservices until scale/team boundaries justify them.

## 2. Proposed stack
- Frontend: Next.js + TypeScript, responsive web/PWA optional.
- Backend: Laravel API (PHP) with domain/service boundaries.
- Database: PostgreSQL.
- Queue/cache: Redis only when needed for queues, rate limits and cache.
- Worker: Laravel queue worker.
- Storage: S3-compatible object storage for product media and payout evidence.
- Payments: provider adapter (Midtrans/Xendit or selected licensed provider).
- Notifications: email/WhatsApp provider adapter.
- Deployment: Docker Compose initially; managed DB preferred for production if budget allows.
- Observability: structured logs, error tracking, metrics, uptime monitoring.

## 3. Bounded modules
1. Identity & Access
2. Organization & RBAC
3. Member
4. Network (Sponsor, Placement)
5. Catalog & Pricing
6. Inventory
7. Cart & Order
8. Payment
9. Marketing Plan
10. Commission
11. Wallet & Ledger
12. Withdrawal
13. Notification
14. Reporting
15. Audit

## 4. Data flow
Browser -> Next.js -> Laravel API -> domain services -> PostgreSQL.
Payment provider -> signed webhook -> payment adapter -> order state transition -> outbox event -> queue -> commission calculation -> ledger posting.
Admin payout approval -> payout workflow -> provider/manual execution -> reconciliation -> ledger posting.

## 5. Financial correctness
- Use database transactions for order payment state and commission creation.
- Use unique idempotency constraints.
- Use transactional outbox for reliable event dispatch.
- Commission run is deterministic and stores full calculation snapshot.
- Ledger is append-only and balanced.
- Never rely on frontend state for financial decisions.
- Lock relevant rows or use safe concurrency controls when releasing balance.

## 6. Network representation
- `sponsor_relationships`: immutable sponsor edge.
- `placement_relationships`: current placement edge.
- `placement_history`: temporal record of changes.
- For small/medium network, recursive CTE over adjacency list may suffice.
- Add closure table (`placement_closure`) only if measured traversal/report needs justify it.
- Cache is derived data, never the source of truth.
- All upline calculation uses a transaction-consistent placement snapshot/effective timestamp.

## 7. Environment
- local, test, staging, production.
- Separate credentials and payment sandbox/live.
- Secrets through environment/secret manager; never commit `.env`.
- CI runs lint, static analysis, tests, build, migration checks.
- Production DB migrations are reviewed and backed up.

## 8. API conventions
- REST JSON under `/api/v1`.
- UUID/ULID identifiers.
- Cursor pagination for large lists.
- Standard error envelope and validation details.
- Idempotency-Key for create/payment/commission-sensitive requests.
- Correlation ID across logs/events.
- OpenAPI maintained with code.

## 9. Scalability
- Index member edges, order status/date, commission beneficiary/status, ledger account/date.
- Use queue for commission, notification and report generation.
- Paginate large trees; do not load whole downline in browser.
- Export large reports asynchronously.
- Add read replicas only when measured load warrants.
