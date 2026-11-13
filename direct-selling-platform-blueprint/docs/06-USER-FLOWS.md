# 06 — User Flows

## 1. Consumer referral purchase
1. Consumer opens member referral URL.
2. Server validates code and records attribution under approved precedence/expiry policy.
3. Consumer views product and claims/terms.
4. Consumer adds item and checks out as guest or consumer account.
5. Server revalidates product price, stock, referral attribution and shipping.
6. Payment provider processes payment.
7. Verified webhook marks payment paid idempotently.
8. Order is processed/fulfilled.
9. Commission engine creates draft/accrual items under the applicable plan version.
10. Refund/chargeback window and eligibility rules determine release/hold.
11. Member sees privacy-safe attributed order and commission status.

## 2. Member onboarding
1. User opens join page/referral link.
2. Completes identity/contact details and consent.
3. Accepts agreement and code of conduct.
4. System creates member application and records sponsor.
5. Authorized operator assigns placement.
6. Approval activates member.
7. Member receives dashboard and referral code.
No mandatory personal product purchase in baseline.

## 3. Spreading/placement
1. Authorized operator selects candidate member.
2. Selects valid target placement parent.
3. System previews resulting subtree and upline path.
4. System checks cycle, permissions, lock rules, and prospective impact.
5. Maker submits reason.
6. Checker approves/rejects.
7. New placement becomes effective at approved timestamp.
8. History/audit recorded.
9. Past transactions remain attached to historical calculation snapshot.

## 4. Commission review
1. Order payment confirmed.
2. Commission run resolves plan version, sponsor and placement chain.
3. Creates one direct sponsor reward (if qualifying).
4. Creates development reward items for up to 10 eligible placement uplines.
5. Unfilled reward slots are recorded as unallocated.
6. Eligibility and fraud checks set pending/held/eligible.
7. Release job posts payable entries to member wallet.
8. Reversal process handles refunds/chargebacks.

## 5. Withdrawal
1. Member submits amount and verified payout destination.
2. Server checks available ledger balance, KYC and thresholds.
3. Request enters under_review.
4. Finance/admin reviews supporting details.
5. Approver approves/rejects.
6. Approved payout is executed manually or through provider.
7. Payment reference/proof is recorded.
8. Ledger records paid/reversal.
9. Member notified.

## 6. Admin exception
- Admin cannot edit amount in ledger.
- Admin submits adjustment case with evidence and reason.
- Independent approver approves.
- System posts compensating entries.
