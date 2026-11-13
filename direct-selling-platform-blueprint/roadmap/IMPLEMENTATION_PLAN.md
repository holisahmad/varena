# Implementation Plan

Delivery is gated by acceptance criteria, not calendar optimism. Estimated duration depends on team capacity and external provider/legal readiness.

## Phase 0 — Discovery and feasibility
Deliverables:
- Approved business rules.
- Legal/accounting review record.
- Unit economics by SKU.
- Product claim/label approval.
- Attribution and refund policy.
Exit gate: no unresolved core money-flow rule.

## Phase 1 — Repository and foundation
- Repository audit, coding standards, CI.
- Next.js shell and Laravel API skeleton.
- PostgreSQL migrations, auth, RBAC, audit.
Exit gate: secure login and permission tests.

## Phase 2 — Catalog and consumer checkout
- Products, variants, prices, inventory.
- Referral landing and attribution.
- Guest checkout and payment sandbox.
Exit gate: complete consumer purchase end-to-end.

## Phase 3 — Member and network
- Member onboarding.
- Sponsor tree.
- Placement tree/history.
- Spreading workflow and approvals.
Exit gate: test fixtures prove sponsor/placement separation.

## Phase 4 — Commission engine
- Versioned marketing plans.
- Simulation engine.
- First purchase commission.
- Repeat commission only after amount approval.
- Refund reversal.
Exit gate: all financial fixtures pass.

## Phase 5 — Wallet and payout
- Double-entry ledger.
- Wallet views.
- Withdrawal request.
- Admin maker-checker approval.
- Manual/provider payment adapter.
Exit gate: ledger balance and payout reconciliation.

## Phase 6 — Reporting and notifications
- Sales, margin, liability and network reports.
- Email/WhatsApp/in-app notifications.
- Async exports.
Exit gate: reports reconcile with ledger and orders.

## Phase 7 — Hardening and UAT
- Security test, load test, accessibility.
- Backup restore.
- User acceptance.
- Support and incident runbooks.
Exit gate: no critical/high security issues; UAT signed.

## Phase 8 — Controlled launch
- Limited cohort.
- Daily finance reconciliation.
- Monitor order, commission, payout, support.
- Expand only after stable operation.

## Phase 9 — Optimization
- Performance and UX improvements based on telemetry.
- Warehouse/ERP integration if needed.
- Advanced analytics only when justified.
