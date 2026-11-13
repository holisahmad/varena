# 09 — API Specification (Initial Contract)

Base path: `/api/v1`. JSON. Auth: secure session or short-lived bearer token; choose one consistent strategy. All endpoints enforce server-side authorization.

## 1. Public
- `GET /products`
- `GET /products/{slug}`
- `GET /r/{referralCode}` — resolve referral landing and attribution token
- `POST /checkout/quote`
- `POST /orders` — Idempotency-Key required
- `GET /orders/{publicToken}` — restricted public order tracking

## 2. Authentication and member
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/forgot-password`
- `POST /auth/verify-contact`
- `GET /me`
- `GET /member/dashboard`
- `GET /member/referral`
- `GET /member/orders`
- `GET /member/commissions`
- `GET /member/wallet`
- `GET /member/withdrawals`
- `POST /member/withdrawals`
- `POST /member/payout-destinations`
- `GET /member/network/summary`
- `GET /member/network/children?cursor=...`
- `GET /member/network/upline`

## 3. Admin and operations
- `GET /admin/members`
- `GET /admin/members/{id}`
- `POST /admin/members/{id}/status-change`
- `POST /admin/placement-change-requests`
- `GET /admin/placement-change-requests`
- `POST /admin/placement-change-requests/{id}/approve`
- `POST /admin/placement-change-requests/{id}/reject`
- `GET /admin/orders`
- `POST /admin/orders/{id}/refund-request`
- `GET /admin/commissions/runs`
- `POST /admin/commissions/simulate`
- `GET /admin/commissions/unallocated`
- `GET /admin/withdrawals`
- `POST /admin/withdrawals/{id}/approve`
- `POST /admin/withdrawals/{id}/reject`
- `POST /admin/withdrawals/{id}/mark-paid`
- `GET /admin/reports/sales`
- `GET /admin/reports/commission-liability`
- `GET /admin/audit-logs`

## 4. Marketing plan
- `GET /admin/marketing-plans`
- `POST /admin/marketing-plans`
- `POST /admin/marketing-plans/{id}/versions`
- `POST /admin/marketing-plan-versions/{id}/simulate`
- `POST /admin/marketing-plan-versions/{id}/submit`
- `POST /admin/marketing-plan-versions/{id}/approve`
- `POST /admin/marketing-plan-versions/{id}/activate`

## 5. Payment webhook
- `POST /webhooks/payments/{provider}`
- Verify provider signature, timestamp/replay window, amount, order reference.
- Idempotent by provider event/reference.
- Respond quickly; dispatch processing through outbox/queue.
- Never trust browser redirect as proof of payment.

## 6. Standard response
Success:
```json
{
  "data": {},
  "meta": { "request_id": "..." }
}
```
Error:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request could not be processed.",
    "details": []
  },
  "meta": { "request_id": "..." }
}
```

## 7. API rules
- Validate all inputs.
- Rate limit auth, referral resolution, checkout, payout and admin endpoints.
- Use cursor pagination.
- Avoid exposing full phone, address, bank account, or personal data.
- Idempotency keys for order creation, payout requests and sensitive operations.
- OpenAPI spec is required before frontend integration.
