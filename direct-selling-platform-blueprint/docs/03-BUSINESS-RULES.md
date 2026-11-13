# 03 — Business Rules

## 1. Organization and network
- Corporate hierarchy:
  1 Owner
  2 Koperasi
  3 Operasional
  4 Admin 1
  5 Admin 2
  6 Leader 1
  7 Leader 2
  8 Leader 3
  9+ Mitra network
- The first member network is placed below Level 8 / Leader 3.
- Corporate hierarchy is not the same as member genealogy.
- Sponsor tree and placement tree are separate.
- Sponsor: member who directly invited the new member; immutable baseline.
- Placement parent: node under which member is placed; one active parent at a time.
- Spreading may place recruits directly below sponsor or under another member, subject to authority, approval and audit.
- Placement changes apply prospectively; they do not rewrite historical transactions or earned commissions.
- No cycles, self-parenting, duplicate parent, or orphan placement except explicitly approved root node.

## 2. First pack purchase baseline
Product example:
- Product: Kopi Sehat pack.
- Pack contents: 10 sachets.
- Retail pack price: Rp500,000.
- HPP pack: Rp300,000.
- Direct sponsor reward: Rp50,000.
- Development reward: Rp10,000 per eligible placement upline, maximum 10 recipients.
- Development allocation cap: Rp100,000.
- If fewer than 10 eligible upline points exist, actual available points receive Rp10,000 each. The unfilled portion is recorded as unallocated, subject to approved accounting/legal policy.
- Example at level 9 with 8 corporate upline points: sponsor reward Rp50,000; 8 x Rp10,000 = Rp80,000; unfilled development allocation Rp20,000. Do not silently classify this Rp20,000 as profit.
- If sponsor is also one of the development beneficiaries, whether both rewards can be received is a policy decision that must be explicitly approved. Baseline engine must support distinct reward types and avoid accidental deduplication or accidental double payment.

Illustrative first pack economics:
Price 500,000 - HPP 300,000 - direct sponsor 50,000 - development allocation reserve 100,000 = residual 50,000 before overhead/tax/payment/logistics.
The residual assumes the full Rp100,000 development allocation is reserved. If some points are unavailable, the unallocated amount must be separately classified.

## 3. Repeat purchase baseline
- Price: Rp45,000 per sachet.
- HPP: Rp30,000 per sachet (assumed pro-rata; confirm whether actual sachet packaging/fulfilment changes HPP).
- Gross margin before commission: Rp15,000 per sachet.
- 10 eligible placement upline points can receive repeat-purchase bonus.
- Rp2,000 x 10 = Rp20,000, causing Rp5,000 loss per sachet before overhead.
- Therefore Rp2,000 per point is NOT approved for production.
- Rp1,000 per point is a simulation placeholder only: Rp10,000 total commission, Rp5,000 residual before overhead.
- Production requires approved amount and a margin floor after payment fees, tax, fulfilment, returns, and operating reserve.
- Commission is calculated per qualifying sachet quantity, with fractional/partial refund handling defined.

## 4. Eligibility baseline
- No mandatory personal purchase to unlock withdrawal.
- Eligibility is based on verified product sales, valid member status, non-fraudulent transactions and approved marketing plan.
- Consumer purchases do not require member registration.
- The exact retail sale qualification and evidence model requires legal/business approval.
- Suspended, fraud-flagged, terminated, or KYC-incomplete accounts may be held for review. Do not redirect their money automatically to operational account.
- An account's status and a specific transaction's eligibility are separate facts.

## 5. Payout
- System calculates withdrawable balance.
- Member requests payout.
- Admin/finance reviews and approves.
- Payment execution occurs only after approval.
- Record payout provider/bank reference and proof.
- Failed payout returns amount to payable liability through reversal, not silent balance edit.

## 6. Unallocated, held and forfeited money
These are distinct:
- Unallocated: no eligible beneficiary exists for a reward slot.
- Held: beneficiary or transaction is under review.
- Rejected: claim is rejected with reason.
- Expired/forfeited: only if contract, consumer/MLM rules, accounting and legal review approve.
- Operational allocation: separate company account classification, only after lawful recognition and approval.
Never treat all of these states as interchangeable.

## 7. Required configuration
All amounts, level caps, eligibility, effective dates and product mappings belong to versioned Marketing Plan configuration. Never hard-code production amounts.
