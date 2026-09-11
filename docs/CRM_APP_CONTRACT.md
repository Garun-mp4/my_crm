# CRM application contract

This document records the first implementation contract for the internal CRM app. It is deliberately narrower than a general-purpose ERP: the product is a research desk for identifying potential website clients and preparing human-reviewed outreach.

## Core objects

| Object | Purpose | Important invariants |
| --- | --- | --- |
| Lead | The potential client and current sales state | A deterministic `dedupeKey` prevents repeated imports; lifecycle changes are checked by the semantic domain functions. |
| Research | A source-backed fact or observation about a lead | Every record carries a source URL, observed time, confidence, provenance, and an evidence hash. |
| Research job | A bounded local/provider execution attempt | Jobs are queued, retryable only when the adapter marks the failure retryable, and never promote AI output beyond review-required evidence. |
| Outreach draft | A proposed first message or follow-up | Drafts start as `NEEDS_REVIEW`; approval is a separate action and does not send a message. |
| CRM activity | Append-only operational history | Activity records preserve actor role, actor identity, source, timestamp, and idempotency key where available. |

The object IDs are stable UUID v4 values declared in `src/objects`. They must not be regenerated during ordinary development because installed workspaces refer to them.

## Approved semantic tools

The public automation boundary is the following explicit tool set:

- `crm_create_lead`
- `crm_list_leads`
- `crm_transition_lead`
- `crm_start_research`
- `crm_run_research_job`
- `crm_retry_research_job`
- `crm_get_research_job`
- `crm_preview_lead_import`
- `crm_import_leads`
- `crm_rollback_import`
- `crm_record_research`
- `crm_create_outreach_draft`
- `crm_approve_outreach_draft`
- `crm_log_activity`

These tools are intentionally domain-shaped. The product must not add a generic `execute_sql`, arbitrary GraphQL, unrestricted object CRUD, or a tool that sends external messages without a separate human-approved delivery workflow.

At the root MCP transport Twenty registers app logic functions as internal `app_*` tool names. The CRM adapter maps those names back to this public `crm_*` contract and filters every other tool out when the app is installed. The standard Twenty generic MCP compatibility surface is retained only for workspaces where this CRM app is not installed.

## Identity and provenance

An MCP API key represents an agent with the permissions of its assigned role and has no implicit human workspace-member identity. A user-authenticated MCP request carries the resolved workspace member as the actor while retaining `FieldActorSource.AGENT`. The CRM audit payload stores the actor role, actor name or ID, source (`web`, `api`, `mcp`, or `job`), and provenance reference.

The distinction is intentional: an agent may create a proposal, but it must not be presented as a human sender. Revocation is handled by removing or disabling the API key/role at the Twenty workspace boundary; semantic tools must fail closed when the authorization context is absent.

## UI contract

The primary interface is a calm research desk, not a generic analytics dashboard. The detailed visual tokens, responsive breakpoints, interaction states, and large-list rules live in `docs/UI_SYSTEM.md` and `docs/DESIGN-elevenlabs.md`.

The core list experience is provided by Twenty's server-backed object views. The custom research desk is a summary surface and must remain bounded: it loads a finite first page, exposes clear loading/empty/error states, and never implies that external outreach was sent.

## Import and export

CSV preview is pure validation plus a bounded workspace duplicate lookup. Commit requires an explicit confirmation flag, records a `Lead import batch`, writes only accepted non-duplicate rows, and stores created lead IDs and row-level errors. A human workspace member can soft-roll back a committed or partial batch by its batch ID. Export uses a stable column order and RFC-style escaping for commas, quotes, and line breaks.

Research execution uses a replaceable adapter boundary. The checked-in `LOCAL_FIXTURE` adapter is deterministic and does not fetch or scrape external sites; it accepts a supplied observation, stores it as `AI_DRAFT`, and leaves the evidence in `REVIEW_REQUIRED`. A transient adapter failure moves the job to `FAILED` with a bounded exponential retry time. A worker or MCP caller must explicitly run or retry a job.

## Change rules

- Keep business invariants in pure domain modules and reuse them from every semantic entry point.
- Add a test for each new lifecycle transition, duplicate rule, authorization boundary, and idempotency rule.
- Keep external AI providers behind replaceable adapters; store prompts, model identifiers, and raw outputs as provenance rather than treating them as trusted facts.
- Do not commit `.env` files, tokens, generated `.twenty/` artifacts, or `node_modules/`.
