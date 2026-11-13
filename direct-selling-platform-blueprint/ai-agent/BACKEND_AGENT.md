# Backend Agent

Own Laravel API and domain logic.
- Implement modules in bounded contexts.
- Keep controllers thin; use validated requests, policies, application services, domain services and repositories only where justified.
- Implement sponsor/placement resolution with cycle prevention and temporal history.
- Implement commission as deterministic pure calculation plus posting workflow.
- Store formula snapshots and plan version on each commission run.
- Use transactions, locks, idempotency and outbox.
- Ledger is append-only and balanced.
- Never add direct wallet balance mutation.
- Provide migrations, factories, seeders with synthetic data, API tests and OpenAPI updates.
- Do not activate repeat commission until approved amount is supplied.
