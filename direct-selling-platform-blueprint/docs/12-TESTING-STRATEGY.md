# 12 — Testing Strategy

## 1. Test pyramid
- Unit: formulas, eligibility, upline resolution, ledger invariants.
- Integration: database transactions, webhooks, payment adapter, queues.
- Feature/API: auth, RBAC, checkout, member, placement, payout.
- E2E: consumer referral checkout, member dashboard, admin approval.
- Load: tree traversal, commission batch, dashboard, checkout.
- Security: access control, IDOR, injection, webhook replay, race conditions.

## 2. Mandatory commission fixtures
A. Member at level 9, 8 eligible corporate upline points:
- Direct sponsor reward Rp50,000.
- Development: 8 x Rp10,000 = Rp80,000.
- Unfilled slots: 2; reserve Rp20,000 separately.

B. 10 eligible placement upline points:
- Direct sponsor reward Rp50,000.
- Development: Rp100,000.
- Confirm whether sponsor may also receive development reward if sponsor is in placement upline; this must be explicit.

C. Sponsor and placement parent differ:
- Direct reward to sponsor.
- Development rewards to placement upline only.

D. Repeat order:
- 1 sachet, 10 eligible points, simulation Rp1,000 each = Rp10,000.
- 10 sachets = Rp100,000.
- Rp2,000 each must fail margin validation under current HPP.

E. 0 eligible upline:
- No development beneficiary.
- Unallocated amount follows configured policy.
- No automatic operational income recognition.

F. Suspended beneficiary:
- Hold/review according to rule; do not silently reassign.

G. Refund:
- Full/partial refund reverses corresponding commission proportionally or according to approved policy.

H. Duplicate webhook:
- Exactly one payment transition and one commission run.

I. Placement change:
- New placement applies prospectively.
- Existing order calculation remains unchanged.

## 3. Ledger invariants
- Posted transaction debit total equals credit total.
- No negative available wallet due to race.
- Reversal references original posting.
- Repeated event cannot create duplicate entries.
- Payout total cannot exceed available liability.
- Daily reconciliation matches subledger and bank/provider statement.

## 4. Acceptance targets
- 100% pass mandatory financial fixtures.
- Zero duplicate commission in idempotency tests.
- Zero unauthorized data access in RBAC/IDOR tests.
- p95 API latency target per NFR under agreed test load.
- Backup restore verified.
