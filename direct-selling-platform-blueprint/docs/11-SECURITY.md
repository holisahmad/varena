# 11 — Security and Privacy

## 1. Authentication
- Secure password hashing using framework standard (Argon2id/bcrypt).
- MFA required for privileged roles.
- Session rotation, secure cookies, CSRF protection where applicable.
- Rate limit login, OTP, password reset, referral and payout endpoints.
- Re-authentication for bank changes, payout approval, role changes and marketing plan activation.

## 2. Authorization
- RBAC plus scope checks (organization, assigned task, authorized network).
- Deny by default.
- Do not assume a leader can access all descendants' PII.
- Separate maker and checker.
- Privileged role assignment requires audit and approval.

## 3. Financial integrity
- Append-only ledger.
- Double-entry balancing.
- Idempotency for webhooks and posting.
- Transaction isolation/locking for concurrent withdrawal.
- No direct balance update endpoint.
- Reconciliation daily.
- Signed payment webhook and replay protection.

## 4. Application security
- Validate and normalize input.
- ORM parameterization.
- Output encoding and CSP.
- CSRF/XSS/SQLi/SSRF protections.
- File upload MIME/content/size scanning.
- Secrets manager/environment secrets.
- Dependency scanning and patch process.
- Secure headers and TLS.

## 5. Privacy
- Collect minimum necessary data.
- Define retention/deletion policy.
- Mask phone, address, bank details.
- Encrypt sensitive payout details.
- Access logging for sensitive records.
- Consent and privacy notices.
- Support data subject requests according to applicable law.

## 6. Audit events
At minimum:
- login failure/success for privileged account,
- member status changes,
- sponsor correction,
- placement change request/approval,
- marketing plan changes,
- commission adjustments/reversals,
- payout destination changes,
- withdrawal approvals/rejections/paid,
- refund and ledger adjustment,
- export of personal/financial data.

## 7. Go-live security gate
- Threat model reviewed.
- SAST/dependency scan.
- DAST or penetration test.
- No critical/high findings.
- Backup restore test.
- Incident response contact and runbook.
