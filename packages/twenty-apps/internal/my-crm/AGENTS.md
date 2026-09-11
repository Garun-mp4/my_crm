## Scope

This app is the CRM domain layer for the repository. Keep it self-contained and
use Twenty's public application SDK; do not import Enterprise-only modules or
copy code from Enterprise packages.

## Structure

- Organize code by domain under `src/modules/<domain>` when a module needs more
  than one file.
- Keep GraphQL operations in `graphql/` directories and put validation and
  state transitions in pure domain services.
- Every object, field, view, page layout, navigation item, and logic function
  must use a stable UUID v4 universal identifier.
- Keep one business rule implementation shared by UI, HTTP, jobs, and tools.

## Safety

- Do not send external messages automatically. Outreach drafts require an
  explicit human approval transition.
- Do not accept arbitrary SQL or GraphQL from an AI/tool boundary.
- Never commit credentials, generated access tokens, local databases, or
  `.env` files.
- Preserve provenance and idempotency keys for imported or generated data.

## UI

Follow `docs/UI_SYSTEM.md`: calm research-desk styling, semantic status,
predictable list scrolling, responsive layout, and complete loading, empty,
error, and permission-denied states.
