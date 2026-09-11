# ADR-0002: Keep the CRM MCP boundary semantic and app-scoped

Status: accepted

## Context

Twenty's logic-function provider registers installed app functions with an
internal `app_` prefix. The upstream MCP server also has a generic catalog and
tool-execution surface. The CRM requires a narrow semantic contract, while the
upstream behavior should remain available for workspaces where this app is not
installed.

## Decision

The root MCP service checks the installed application universal identifier
`5c2d8b32-99bf-4af7-9e0d-2f7cb1d0f7f1` through Twenty's application service.

- When My CRM is installed, the service requests only the internal
  `app_crm_*` logic-function names, exposes them publicly as `crm_*`, and
  omits the generic catalog/execute/learn bridge.
- When My CRM is not installed, the original Twenty compatibility tool surface
  remains available.
- A CRM workspace with a missing or insufficient role therefore fails closed
  with an empty semantic tool set; it never falls back to generic CRUD.

The application itself remains the business boundary. MCP, UI, and future job
transports invoke the same validated logic functions, and no raw SQL,
arbitrary GraphQL, or automatic external messaging is exposed.

## Consequences

This adds a small root Twenty patch and a dependency on `ApplicationModule` in
the MCP module, but keeps upstream behavior intact outside the CRM app and
makes the security mode switch explicit and testable. The internal `app_`
prefix is treated as an implementation detail and is not part of the client
contract.
