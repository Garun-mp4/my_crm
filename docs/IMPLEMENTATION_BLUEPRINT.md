# my_crm implementation blueprint

Status: accepted working contract

This document records the implementation contract for the internal lead-research CRM. It is intentionally narrower than an ERP or a general-purpose CRM. The technical base is the upstream Twenty repository at the immutable baseline `twenty/v2.39.0`; the repository history is retained in the bootstrap merge commit.

## Product outcome

my_crm is a self-hosted browser CRM for discovering, researching, qualifying, and following up with potential website-development clients. It replaces the current Excel workflow with a calm research desk: a fast, readable lead list; a reliable lead detail/timeline; evidence-backed website and directory research; draft outreach that always requires human approval; and useful operational statistics.

The first workspace is internal and single-workspace by default, but the implementation must not break Twenty's multi-user/workspace model. External messages are never sent automatically by the CRM.

## Requirements

### Mandatory

- Leads with stable identity, company name, contact/person, locality, category, website, directory URL, phone, email, Telegram/WhatsApp/VK contact channels, rating, review count, status, owner, source, notes, and timestamps.
- A lead lifecycle: `new`, `researching`, `researched`, `qualified`, `draft_ready`, `contacted`, `replied`, `meeting`, `won`, `lost`, `do_not_contact`, and `duplicate`.
- Search, filter, sort, saved views, predictable scrolling, keyboard-friendly navigation, and server-side pagination for large lists.
- Lead detail with facts, research evidence, provenance, activity timeline, duplicate warnings, outreach drafts, and approval state.
- Research records that distinguish observed facts, generated analysis, assumptions, and missing data. Unsupported facts must not be invented.
- Safe import/export for the existing Excel/CSV workflow with preview, mapping, validation, duplicate detection, idempotency, error report, and rollback/undo strategy.
- Backend authorization for workspace, record, field/sensitive contact data, research, and outreach actions.
- Audit history for important reads/writes, actor identity, source, timestamp, before/after values where safe, and correlation/idempotency keys.
- MCP tools with semantic allowlisted operations only. MCP must use the same application services as the web/API and must not provide arbitrary SQL, GraphQL, or generic CRUD escape hatches.
- Draft outreach templates with human approval. Sending real messages remains outside the automatic workflow.
- Tests for domain rules, authorization negatives, imports, duplicates, audit/provenance, MCP scopes, and critical browser flows.
- Reproducible local/Docker setup, migrations, health checks, backups/restore documentation, CI checks, and release evidence.

### Desirable

- Virtualized or otherwise bounded rendering for very large lead lists; a good server-side pagination strategy is acceptable if measured.
- Bulk actions with explicit confirmation and partial-failure reporting.
- Research queue with retries, exponential backoff, cancellation, and visible job state.
- Pluggable providers for website inspection, directory observations, AI analysis, and contact-channel normalization.
- Dashboard for funnel conversion, research throughput, outreach response, source quality, and data quality.
- Import from XLSX as well as CSV, with a downloadable rejected-row report.
- Keyboard shortcuts, column visibility, density preference, saved filters, and responsive tablet/mobile detail views.
- OpenTelemetry/Sentry-compatible observability hooks without committing credentials.

### Secondary

- Calendar, email sync, full marketing automation, billing, team chat, and public self-service portals are out of initial scope.
- Automatic scraping, rate-limit bypass, CAPTCHA bypass, or any data collection that violates a source's terms is out of scope.
- A pixel-perfect clone of the supplied marketing design is not the goal. The design system is adapted to dense CRM workflows.

### Decisions still open

- Final field vocabulary and whether some research evidence is a separate object or a structured activity subtype.
- Retention period for raw website captures and contact details.
- Whether a future deployment needs multiple workspaces/tenants.
- Which real AI provider(s), if any, will be enabled after the local/mock adapters are complete.
- Whether outbound email is ever enabled, and which provider and consent policy would govern it.

## Architecture contract

Twenty remains the primary base. Custom business behavior is implemented behind shared application/domain services. Web controllers, GraphQL resolvers, MCP tools, jobs, and import handlers are transport adapters; they do not duplicate business rules. Sensitive writes go through the same authorization, validation, idempotency, and audit pipeline regardless of transport.

The preferred extension boundary is a versioned internal application module inside the monorepo where it is sufficient. Core Twenty changes are allowed when required for security, authorization, persistence, routing, or first-class UX, but each such change needs a focused test and an upstream-drift note. Reusable domain types and policies belong in a shared package, not in UI components.

### Data and services

- PostgreSQL is the source of truth; Redis/BullMQ may be used for asynchronous research jobs.
- Domain objects are modeled with explicit lifecycle values and stable identifiers.
- An application service owns each business operation: create/update lead, research lead, import rows, deduplicate, create/approve draft, and export.
- Integrations are adapters with typed boundaries and safe local/mock implementations.
- Every mutating command accepts an idempotency key where retries are possible.
- All external evidence stores source URL, retrieval timestamp, content hash or snapshot reference where legally appropriate, extractor/provider, and confidence/provenance.

### Authorization and identity

Authorization is enforced on the backend and checked again inside application services. The policy matrix covers workspace membership, lead visibility/editing, sensitive contacts, research evidence, imports/exports, outreach drafts, approvals, AI execution, MCP, and audit access. The Codex/AI agent is a separate actor from a human administrator, receives scoped credentials, and can be revoked. Permission failures must be tested as negative cases.

### MCP contract

Expose semantic tools such as `search_leads`, `get_lead`, `create_research_job`, `get_research_status`, `create_outreach_draft`, `approve_outreach_draft`, and `record_activity`, with explicit schemas and scopes. Do not expose arbitrary SQL, arbitrary GraphQL documents, unrestricted object CRUD, or a tool that silently sends external messages. Tool results are filtered by the caller's workspace and field permissions and include audit/correlation metadata where appropriate.

## Design-system contract

`docs/DESIGN-elevenlabs.md` is the preserved source asset. Its visual language is adapted into a lead-research desk:

- off-white canvas, near-black ink, muted stone text, hairline borders, white surfaces;
- restrained atmospheric mint/peach/lavender/sky/rose accents for status and context, not gradients in dense data tables;
- Inter for UI/body and the display serif only for page-level headings;
- 4px spacing base, 48px minimum touch targets, 64px top navigation, responsive desktop/tablet/mobile breakpoints;
- one depth strategy: hairlines plus a subtle shadow, no competing card elevations;
- full loading, empty, error, focus, selected, disabled, permission-denied, and offline/retry states;
- one intentional scroll container per dense list, sticky header where useful, preserved query/selection state, and no scroll-jump behavior.

UI work must use tokens and replaceable primitives. The final product should feel like a calm research desk, not a generic dashboard or a decorated spreadsheet.

## Milestones

1. License inventory and legal/technical gate.
2. Security audit of the chosen tag.
3. Local and Docker startup.
4. Baseline CI and upstream strategy.
5. Domain dictionary.
6. Lead state machine.
7. Permission matrix.
8. Data model and custom objects.
9. Application/service-layer conventions.
10. API contracts.
11. Error model.
12. Idempotency and duplicates.
13. Research-source policy.
14. Evidence and provenance.
15. Research queue and retries.
16. Excel/CSV import.
17. Lead-list UX.
18. Lead detail and timeline.
19. Outreach drafts and approval.
20. MCP read tools.
21. MCP research tools.
22. MCP guarded write tools.
23. Analytics/dashboard.
24. Load tests, security tests, migration rehearsal, and release hardening.

The order may be adjusted when dependency evidence requires it, but no required behavior is silently dropped. Each milestone must leave tests, documentation, and a Git checkpoint where applicable.

## M0 gate

Before substantial product work, verify:

- the checkout is exactly `twenty/v2.39.0` as the upstream baseline;
- `origin` is the owner's repository and `upstream` is fetch-only;
- AGPL/commercial/third-party license boundaries are inventoried;
- enterprise/commercial files are not used without an explicit license decision;
- local dependencies, baseline tests/build, and Docker startup are measured;
- current authentication, workspace scoping, system-object authorization, API, MCP, and permission boundaries are reviewed;
- known authorization/security gaps have either a regression test and fix plan or a documented block;
- design and implementation documents are present in this repository.

M0 can pass with a documented, bounded baseline failure only when the failure is external or pre-existing, its cause is recorded, and the changed path has an independent verification plan. A hard legal or technical blocker would trigger a fresh decision; it does not justify silently switching foundations.

## Project Definition of Done

The project is complete when a clean checkout can boot through documented Docker/local commands, migrations are repeatable, CI runs formatting/lint/typecheck/unit/integration/security checks, and the following scenario passes:

1. Import a representative lead file with mapped fields and one intentional invalid/duplicate row.
2. Review the preview, see deterministic validation/duplicate results, and commit only valid rows.
3. Search/filter a large synthetic dataset without scroll jumps and open a lead detail.
4. Run a local research adapter, persist evidence/provenance, and see a failed/retryable job clearly.
5. Generate an outreach draft from verified facts, edit it, and require a human approval state; no message is sent.
6. Run the same read/research/draft operation through a scoped MCP identity and verify audit entries and permission negatives.
7. Export the resulting records and restore a database backup in a clean test environment.

No secrets, real external outreach, force-push, upstream push, or unlicensed commercial asset is part of the definition of done.
