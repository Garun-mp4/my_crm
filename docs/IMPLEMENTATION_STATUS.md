# Implementation status

Last updated: 2026-09-11
Branch: `main`
Base: `twenty/v2.39.0` (`92359d5a70dee70f4084ddc98e0de0f7685cf358`)

## Working agreement

- `origin` is the only push remote: `https://github.com/Garun-mp4/my_crm.git`.
- `upstream` is `https://github.com/twentyhq/twenty.git` and its push URL is deliberately disabled.
- The original bootstrap commit and upstream history are retained; no reset/rebase/force-push is used.
- No external outreach is sent automatically and no secrets are committed.
- The supplied design asset is copied to `docs/DESIGN-elevenlabs.md`.

## Current gate

M0 passed with bounded environment conditions. Repository bootstrap, license inventory, dependency install, direct shared checks, targeted MCP/ORM tests, and source-level permission/MCP review are recorded in `docs/M0_BASELINE_REPORT.md`. The later runtime follow-up has now exercised Docker PostgreSQL/Redis, the Windows server build, app installation, authenticated logic-function execution, and the installed-app MCP boundary. Browser rehearsal, staging load/security checks, and a network-backed dependency audit remain release-hardening evidence.

## Evidence ledger

### Repository bootstrap

- [x] Verified the user's repository initially contained its own `main` history and `README.md`; it was not reinitialized.
- [x] Added the official Twenty repository as `upstream` and fetched tags.
- [x] Confirmed `twenty/v2.39.0` resolves to `92359d5a70dee70f4084ddc98e0de0f7685cf358`.
- [x] Created `codex/crm-implementation` from the original `main` commit.
- [x] Merged the fixed upstream tag with `--allow-unrelated-histories`, preserving both roots.
- [x] Resolved only the README add/add conflict. The original `# my_crm` identity remains in the new README and the original blob remains in the first parent.
- [x] Pushed the working branch to `origin`.
- [x] Set `upstream` push URL to `DISABLED`; it must never be used for pushes.

### Design and planning

- [x] Preserved the supplied ElevenLabs design-system reference in `docs/DESIGN-elevenlabs.md`.
- [x] Added the accepted implementation contract in `docs/IMPLEMENTATION_BLUEPRINT.md`.
- [x] ADR-0002 records the app-scoped MCP boundary: domain behavior stays in the internal app, while the root MCP service changes only for the product-level closed-world boundary.

### M0: baseline, license, and security gate

- [x] License inventory: AGPL core, MIT-compatible packages, commercial/enterprise markers, and third-party notices.
- [x] Verify the exact checkout and source package manifests.
- [x] Verify Node/Yarn requirements and install dependencies reproducibly.
- [x] Run baseline unit/type/lint/build checks or record bounded pre-existing failures.
- [x] Start the documented Docker stack and exercise health/login when the local environment permits it. The initial M0 run was bounded by Docker availability; the follow-up runtime rehearsal passed with Docker Desktop.
- [x] Review authentication, workspace scoping, record/field authorization, system-object behavior, API boundaries, MCP guards/tools, and audit hooks.
- [x] Add regression-test scope and bounded remediation notes for gate findings that affect the new CRM.
- [x] Record M0 pass decision and evidence in `docs/M0_BASELINE_REPORT.md`.

M0 is closed as **PASS WITH BOUNDED ENVIRONMENT CONDITIONS**. The app baseline has an independent build path: portable Node `v24.5.0`, 11 unit-test files / 27 tests, SDK manifest build, app lint pass, and a server-backed integration suite. Root MCP policy tests pass 22/22. The runtime follow-up also passed Docker health, user login, full server compilation, app sync, authenticated lead creation/idempotency, and installed-app MCP listing. Browser/load/security hardening and network-backed dependency audit remain explicitly open.

## Runtime follow-up

- [x] Docker Desktop development PostgreSQL and Redis containers are healthy.
- [x] Twenty server compiles on Windows with SWC (`8,330` files); required runtime assets are copied into `dist`.
- [x] `/healthz` returns `200` and the seeded test user can authenticate as a workspace member.
- [x] My CRM app sync uploads all `32` application files, applies metadata, and generates its API client.
- [x] Authenticated `crm_create_lead` execution passes creation, same-payload retry, and different-payload `IDEMPOTENCY_CONFLICT` checks; the audit activity is persisted.
- [x] Installed-app MCP `tools/list` returns exactly the 14 semantic CRM tools and does not expose the generic Twenty bridge.
- [x] PostgreSQL custom-format backup and restore rehearsal completed in a disposable database; the restored database contained the expected core schema.
- [x] Windows resource-path normalization and Twenty rich-text mapping have regression coverage and passed runtime verification.
- [ ] Browser responsive/accessibility rehearsal, staging load at 10k/50k/100k rows, and full security-negative integration checks remain before release.

## Milestone ledger

| Milestone | Status | Evidence / next action |
| --- | --- | --- |
| M1 Domain dictionary | Complete | Six explicit objects, stable IDs, contract and design-system docs. |
| M2 Lead state machine | Complete | Blueprint lifecycle, legal transitions, terminal-state tests, semantic transition tool. |
| M3 Permission matrix | Complete | Human researcher, default function, and separately assignable research-agent roles; sensitive lead contact fields are denied to the agent role; approval/rollback fail closed for non-human actors. |
| M4 Data model/custom objects | Complete with browser rehearsal pending | Lead, Research, Research Job, Outreach Draft, CRM Activity, and Lead Import Batch manifests build, install, and migrate successfully in the disposable Docker workspace. |
| M5 Application/service layer | Implemented at app boundary | Semantic logic functions centralize validation, dedupe, audit, approval, import, and lifecycle behavior; Twenty's generic object UI remains the standard record transport. |
| M6 API contracts | Complete | Zod input schemas plus explicit JSON tool schemas with bounded payloads. |
| M7 Error model | Complete | Typed `ToolResult` machine codes and safe operation-failure messages. |
| M8 Idempotency/duplicates | Complete | Deterministic website/directory/name-city keys, database uniqueness on dedupe/idempotency fields, stored payload hashes, explicit `IDEMPOTENCY_CONFLICT` handling, retry-safe tool keys, import duplicate plan, and tracked rollback batch. |
| M9 Research-source policy | Complete | HTTP(S)-only public-source validation, no private-host fetch boundary, and no terms/rate-limit bypass logic. |
| M10 Evidence/provenance | Complete | Source URL, observed time, confidence, provenance, hash, payload, actor and audit activity fields. |
| M11 Research queue/retries | Complete at app boundary | Research Job object, local fixture adapter, queued/running/succeeded/failed state, bounded exponential retry metadata, explicit run/retry tools, idempotent evidence persistence, and adapter/state tests are implemented. A real background worker remains deployment wiring. |
| M12 Excel/CSV import | Implemented at app boundary | Preview, existing-workspace duplicate lookup, valid-row commit, row error report, batch tracking, soft rollback, and escaped CSV export are covered by tests/build. XLSX-native parsing remains a follow-up. |
| M13 Lead-list UX | Implemented, browser rehearsal pending | Twenty server-backed views plus 25-row cursor paging in the research desk; synthetic 10k/50k/100k benchmark exists. |
| M14 Lead detail/timeline | Implemented at data/UI contract | Relations, CRM Activity, evidence and responsive state rules are present; browser interaction and permission screenshots require Docker. |
| M15 Outreach drafts/approval | Complete at app boundary | Drafts are `NEEDS_REVIEW`; only an authenticated workspace member can approve; no send tool exists. |
| M16 MCP read tools | Complete | `crm_list_leads` and `crm_get_research_job` are bounded reads; the external MCP names are normalized from Twenty's internal `app_` logic-function names. No generic catalog or CRUD bridge is exposed in CRM mode. |
| M17 MCP research tools | Complete at current scope | `crm_record_research` plus `crm_start_research`, `crm_run_research_job`, and `crm_retry_research_job` validate source/provenance and expose visible retry state through the same app services. |
| M18 MCP guarded writes | Complete at current scope | Explicit 14-tool semantic allowlist covers lead, transition, queue/retry, import, research, draft, approval, rollback, and activity paths with role/audit/idempotency checks. |
| M19 Analytics/dashboard | Initial slice complete | Research desk shows total/research/draft-ready/attention summaries; funnel and data-quality analytics remain a follow-up. |
| M20 Load/security/recovery | Partial | Pure workload tests and a disposable PostgreSQL backup/restore rehearsal pass; staging load, browser performance, and full security integration checks remain. |
| M21 Release hardening | In progress | Root/upstream strategy, docs, app build, unit tests, server-backed app integration, MCP boundary checks, Docker health/login, and Windows runtime fixes are in place; browser E2E, staging load, and network/security evidence remain. |

## Assumptions

- The first deployment is self-hosted and internal.
- One primary workspace is the default, but multi-user/workspace boundaries remain intact.
- PostgreSQL, Redis, Node, React, and the Twenty toolchain are acceptable.
- External providers may be unavailable; local/mock adapters are required.
- Real contact data is treated as sensitive and access is least-privilege.
- External scraping is never implemented by bypassing terms, authentication, rate limits, or anti-bot controls.

## Known environment note

The default shell reports Node `v22.22.2`, while the checked-in Twenty package requires Node `^24.5.0` and Yarn `4.13.0`. Reproducible implementation and runtime checks use the portable Node `v24.5.0` toolchain; the default-shell mismatch remains a deployment prerequisite and is not a reason to alter the pinned upstream baseline.
