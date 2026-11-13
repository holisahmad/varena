# 04 — Marketing Plan Configuration

## 1. Purpose
Administer approved reward rules without code changes while preserving deterministic historical calculation.

## 2. Configuration schema (conceptual)
- plan_id, version, name, status
- effective_from, effective_to
- currency = IDR
- qualifying_order_types
- product/SKU eligibility
- first_pack_direct_reward_amount = 50000 (draft baseline)
- first_pack_development_reward_per_level = 10000 (draft baseline)
- first_pack_development_max_levels = 10
- repeat_reward_per_sachet_per_level = null until approved
- repeat_max_levels = 10
- eligible_relationship = placement_upline for development
- direct_reward_relationship = sponsor
- member eligibility policy
- consumer retail qualification policy
- refund/clawback policy
- release/hold period
- payout threshold and fee
- unallocated funds policy
- margin floor/reserve policy

## 3. Workflow
1. Draft plan by authorized maker.
2. Run built-in simulation against fixture scenarios.
3. Show unit economics and maximum commission liability.
4. Submit for checker approval.
5. Approver reviews legal/business sign-off reference.
6. Activate with effective timestamp.
7. Existing orders retain plan version snapshot.
8. Changes create new version; no destructive edits to active historical version.

## 4. Simulation requirements
- 0–10 upline recipients.
- Sponsor equal to/ different from placement upline.
- Member suspended/inactive.
- Consumer checkout.
- First pack and repeat sachet quantity.
- Partial refund/full refund.
- Multiple orders and duplicate webhook.
- Margin sensitivity and operational reserve.
- Unallocated allocation scenarios.

## 5. Guardrails
- Block activation if expected contribution margin falls below configured minimum.
- Block negative unit economics unless an authorized override with reason and executive approval exists.
- Display direct sponsor reward separately from development reward.
- Display gross commission liability, paid, held, unallocated and reversed.
- Do not allow changing a plan's effective dates to rewrite existing calculations.
