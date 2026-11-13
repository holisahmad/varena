# 08 — Database ERD and Data Dictionary

Use UUID/ULID primary keys. Timestamps UTC. Money as BIGINT IDR or NUMERIC(20,0). Foreign keys and unique constraints are mandatory.

## 1. Core entities

### users
- id, email, phone, password_hash, status, email_verified_at, phone_verified_at, last_login_at, created_at

### roles / permissions / user_roles
- role and permission catalog.
- `user_roles` may include scope_type/scope_id for organization or network scope.

### members
- id, user_id, member_code unique, display_name, legal_name, member_status, kyc_status, joined_at, activated_at, sponsor_member_id nullable, created_at
- Do not store sponsor solely here if separate relationship table is used; relationship table is authoritative.

### sponsor_relationships
- id, member_id unique, sponsor_member_id, created_at, created_by, reason
- Sponsor edge immutable except audited correction workflow.

### placement_relationships
- id, member_id unique active edge, parent_member_id, effective_from, effective_to nullable, status, created_by, approved_by
- Ensure one active parent per member.

### placement_history
- id, member_id, old_parent_id, new_parent_id, effective_at, reason, requested_by, approved_by, created_at

### placement_closure (optional optimization)
- ancestor_id, descendant_id, depth, valid_from, valid_to
- Derived/rebuildable; never sole source of truth.

### products / product_variants
- products: id, name, slug, description, status, regulatory_metadata.
- variants: id, product_id, sku, pack_size, unit, price, hpp_snapshot/current_cost, status.

### orders / order_items
- orders: id, order_number, buyer_user_id nullable, consumer_name, consumer_contact, referral_member_id nullable, order_status, subtotal, discount, shipping, tax, total, currency, marketing_plan_version_id, paid_at.
- order_items: id, order_id, product_variant_id, sku_snapshot, name_snapshot, unit_price, hpp_snapshot, quantity, line_total.

### payments
- id, order_id, provider, provider_reference, amount, status, paid_at, webhook_event_id unique, raw_payload_redacted.

### marketing_plans / marketing_plan_versions
- plan_id, version, status, effective_from, effective_to, created_by, approved_by, approval_reference.
- Version rules stored in normalized tables or validated JSON schema; immutable once activated.

### commission_runs
- id, source_order_id, plan_version_id, calculation_status, input_snapshot, result_hash, started_at, completed_at, idempotency_key unique.

### commission_items
- id, commission_run_id, order_item_id nullable, beneficiary_member_id nullable, reward_type, relationship_type, level_number, amount, status, reason_code, formula_snapshot, created_at
- Unique constraints prevent duplicate reward per source/reward/beneficiary/level.

### ledger_accounts
- id, owner_type, owner_id, account_code, account_type, currency, status.

### ledger_transactions
- id, reference_type, reference_id, transaction_type, status, posted_at, created_at, idempotency_key unique.

### ledger_entries
- id, ledger_transaction_id, ledger_account_id, direction (debit/credit), amount, currency, memo, created_at.
- Append-only. For each posted transaction, total debits == total credits.

### withdrawal_requests
- id, member_id, amount, payout_destination_id, status, requested_at, reviewed_by, reviewed_at, rejection_reason, provider_reference, paid_at.

### payout_destinations
- id, member_id, bank/provider, account_holder, encrypted_account_number, masked_account_number, verification_status.

### audit_logs
- id, actor_user_id, action, entity_type, entity_id, before_json_redacted, after_json_redacted, reason, ip_hash, correlation_id, created_at.

### outbox_events
- id, event_type, aggregate_type, aggregate_id, payload, published_at, retry_count, created_at.

## 2. Relationships
- User 1—0..1 Member (or multiple only if approved policy).
- Member 1—1 Sponsor relationship (except root).
- Member 1—1 active placement parent (except root).
- Product 1—many variants.
- Order 1—many order items and payments.
- Order 1—0..many commission runs (re-run only via controlled version/reversal; unique active run).
- Commission run 1—many commission items.
- Ledger transaction 1—many ledger entries.
- Member 1—many withdrawal requests and wallet/ledger accounts.

## 3. Indexes
- sponsor_relationships(sponsor_member_id)
- placement_relationships(parent_member_id, status)
- placement_history(member_id, effective_at desc)
- orders(order_status, paid_at desc)
- orders(referral_member_id, created_at desc)
- commission_items(beneficiary_member_id, status, created_at desc)
- commission_items(source references)
- ledger_entries(ledger_account_id, created_at desc)
- withdrawal_requests(status, requested_at)
- audit_logs(entity_type, entity_id, created_at desc)

## 4. Constraints
- No self sponsor/parent.
- No placement cycle.
- Unique member code, order number, provider webhook event ID.
- Non-negative amount.
- Currency fixed IDR for MVP.
- Posted ledger transaction balanced.
- Activated plan versions immutable.
- Historical order stores marketing plan version and relationship snapshot.
