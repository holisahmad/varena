-- ============================================================================
-- VARENA Direct Selling Enterprise Platform
-- PostgreSQL Production DDL & High-Concurrency Indexes
-- Compatible with PostgreSQL 15, 16, 17+
-- ============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Identity & RBAC
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "email" TEXT NOT NULL UNIQUE,
    "phone" TEXT UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "roles" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "description" TEXT
);

CREATE TABLE IF NOT EXISTS "user_roles" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "roleId" TEXT NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_roles_userId_roleId_key" UNIQUE ("userId", "roleId")
);

-- ----------------------------------------------------------------------------
-- 2. Member & Network (Sponsor vs. Placement)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "members" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "userId" TEXT NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
    "memberCode" TEXT NOT NULL UNIQUE,
    "displayName" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "nik" TEXT,
    "memberStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "kycStatus" TEXT NOT NULL DEFAULT 'VERIFIED',
    "bankName" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountHolder" TEXT,
    "bankLockedAt" TIMESTAMP(3),
    "stockistType" TEXT NOT NULL DEFAULT 'NONE',
    "stockistCity" TEXT,
    "stockistInventory" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "sponsor_relationships" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "memberId" TEXT NOT NULL UNIQUE REFERENCES "members"("id") ON DELETE CASCADE,
    "sponsorMemberId" TEXT NOT NULL REFERENCES "members"("id") ON DELETE RESTRICT,
    "reason" TEXT DEFAULT 'INITIAL_REGISTRATION',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "sponsor_relationships_sponsorMemberId_idx" ON "sponsor_relationships"("sponsorMemberId");

CREATE TABLE IF NOT EXISTS "placement_relationships" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "memberId" TEXT NOT NULL UNIQUE REFERENCES "members"("id") ON DELETE CASCADE,
    "parentMemberId" TEXT NOT NULL REFERENCES "members"("id") ON DELETE RESTRICT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdBy" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "placement_relationships_parentMemberId_status_idx" ON "placement_relationships"("parentMemberId", "status");

CREATE TABLE IF NOT EXISTS "placement_histories" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "memberId" TEXT NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
    "oldParentId" TEXT,
    "newParentId" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "placement_histories_memberId_effectiveAt_idx" ON "placement_histories"("memberId", "effectiveAt");

-- ----------------------------------------------------------------------------
-- 3. Catalog, Inventory & Orders
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "products" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'HERBAL_BEVERAGE',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "bpomNumber" TEXT,
    "halalNumber" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "product_variants" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "sku" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "packSize" INTEGER NOT NULL DEFAULT 10,
    "unit" TEXT NOT NULL DEFAULT 'box',
    "price" INTEGER NOT NULL,
    "hpp" INTEGER NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 1000,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "orders" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "orderNumber" TEXT NOT NULL UNIQUE,
    "buyerUserId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "buyerName" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "buyerEmail" TEXT,
    "shippingAddress" TEXT NOT NULL,
    "referralMemberId" TEXT REFERENCES "members"("id") ON DELETE SET NULL,
    "orderStatus" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "orderType" TEXT NOT NULL DEFAULT 'FIRST_PACK',
    "subtotal" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "shippingCost" INTEGER NOT NULL DEFAULT 0,
    "shippingExpense" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "marketingPlanVersionId" TEXT,
    "paidAt" TIMESTAMP(3),
    "courierName" TEXT,
    "trackingNumber" TEXT,
    "fulfillmentSource" TEXT NOT NULL DEFAULT 'CENTRAL_WAREHOUSE',
    "stockistMemberId" TEXT,
    "shippedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "orders_orderStatus_paidAt_idx" ON "orders"("orderStatus", "paidAt");
CREATE INDEX IF NOT EXISTS "orders_referralMemberId_idx" ON "orders"("referralMemberId");

CREATE TABLE IF NOT EXISTS "order_items" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
    "productVariantId" TEXT NOT NULL REFERENCES "product_variants"("id") ON DELETE RESTRICT,
    "skuSnapshot" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "hppSnapshot" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotal" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "orderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
    "provider" TEXT NOT NULL DEFAULT 'MANUAL_TRANSFER',
    "providerReference" TEXT,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "webhookEventId" TEXT UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. Marketing Plan & Commission Engine
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "marketing_plans" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "planCode" TEXT NOT NULL UNIQUE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "firstPackDirectReward" INTEGER NOT NULL DEFAULT 50000,
    "firstPackDevReward" INTEGER NOT NULL DEFAULT 10000,
    "firstPackDevMaxLevels" INTEGER NOT NULL DEFAULT 10,
    "repeatDevReward" INTEGER NOT NULL DEFAULT 2000,
    "repeatDevMaxLevels" INTEGER NOT NULL DEFAULT 10,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvalReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "commission_runs" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "sourceOrderId" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
    "planVersionId" TEXT NOT NULL REFERENCES "marketing_plans"("id") ON DELETE RESTRICT,
    "calculationStatus" TEXT NOT NULL DEFAULT 'COMPLETED',
    "idempotencyKey" TEXT NOT NULL UNIQUE,
    "totalCommission" INTEGER NOT NULL DEFAULT 0,
    "unallocatedAmount" INTEGER NOT NULL DEFAULT 0,
    "inputSnapshot" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "commission_items" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "commissionRunId" TEXT NOT NULL REFERENCES "commission_runs"("id") ON DELETE CASCADE,
    "beneficiaryMemberId" TEXT REFERENCES "members"("id") ON DELETE SET NULL,
    "rewardType" TEXT NOT NULL,
    "levelNumber" INTEGER NOT NULL DEFAULT 0,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ELIGIBLE',
    "reasonCode" TEXT,
    "formulaSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "commission_items_beneficiaryMemberId_status_idx" ON "commission_items"("beneficiaryMemberId", "status");
CREATE INDEX IF NOT EXISTS "commission_items_commissionRunId_idx" ON "commission_items"("commissionRunId");

-- ----------------------------------------------------------------------------
-- 5. Double-Entry Ledger & Wallet
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ledger_accounts" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT,
    "accountCode" TEXT NOT NULL UNIQUE,
    "accountType" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "balance" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fk_ledger_accounts_member" FOREIGN KEY ("ownerId") REFERENCES "members"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "ledger_transactions" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "idempotencyKey" TEXT NOT NULL UNIQUE,
    "memo" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ledger_entries" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "transactionId" TEXT NOT NULL REFERENCES "ledger_transactions"("id") ON DELETE CASCADE,
    "accountId" TEXT NOT NULL REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT,
    "direction" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ledger_entries_accountId_createdAt_idx" ON "ledger_entries"("accountId", "createdAt");
CREATE INDEX IF NOT EXISTS "ledger_entries_transactionId_idx" ON "ledger_entries"("transactionId");

-- ----------------------------------------------------------------------------
-- 6. Withdrawal & Payout
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "withdrawal_requests" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "memberId" TEXT NOT NULL REFERENCES "members"("id") ON DELETE CASCADE,
    "amount" INTEGER NOT NULL,
    "fee" INTEGER NOT NULL DEFAULT 0,
    "netAmount" INTEGER NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumberMasked" TEXT NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "rejectionReason" TEXT,
    "providerReference" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "withdrawal_requests_status_requestedAt_idx" ON "withdrawal_requests"("status", "requestedAt");
CREATE INDEX IF NOT EXISTS "withdrawal_requests_memberId_status_idx" ON "withdrawal_requests"("memberId", "status");

-- ----------------------------------------------------------------------------
-- 7. Security, Audit & Outbox
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    "actorUserId" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "reason" TEXT,
    "ipAddress" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
