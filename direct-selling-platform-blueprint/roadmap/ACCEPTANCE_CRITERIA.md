# Acceptance Criteria

## Business
- Sponsor and placement are independent and correctly represented.
- Direct referral reward goes to sponsor.
- Development reward follows placement upline.
- Maximum 10 development recipients.
- First-pack reward follows approved versioned plan.
- Repeat reward cannot activate while margin test fails.
- Consumer can buy without joining.
- Personal purchase is not required for withdrawal under baseline.
- Unallocated/held/forfeited funds have distinct statuses.

## Network
- No self-parent or cycle.
- Every active member has one sponsor where required and one active placement parent except root.
- Placement history is retained.
- Placement change has maker, checker, reason, effective time.
- Historical commissions do not change after placement update.

## Money
- No floating point arithmetic.
- Ledger is append-only.
- Every posted ledger transaction balances.
- Duplicate webhook cannot duplicate commission.
- Refund creates traceable reversal.
- Payout cannot exceed available balance.
- Admin cannot edit wallet balance directly.

## Experience
- Core consumer flow works at 360px viewport.
- Core member flow works at 360px viewport.
- Desktop admin workflow works at 1280px viewport.
- Loading, empty, error, success and disabled states exist.
- Keyboard focus and contrast reviewed.

## Security/operations
- RBAC and object-level authorization tested.
- MFA for privileged users.
- Secrets not committed.
- Backup restore tested.
- Audit trail for sensitive actions.
- Monitoring and incident runbooks ready.
