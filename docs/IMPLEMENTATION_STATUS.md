# Implementation status

Last updated: 2026-09-11
Branch: `codex/crm-implementation`
Base: `twenty/v2.39.0` (`92359d5a70dee70f4084ddc98e0de0f7685cf358`)

## Working agreement

- `origin` is the only push remote: `https://github.com/Garun-mp4/my_crm.git`.
- `upstream` is `https://github.com/twentyhq/twenty.git` and its push URL is deliberately disabled.
- The original bootstrap commit and upstream history are retained; no reset/rebase/force-push is used.
- No external outreach is sent automatically and no secrets are committed.
- The supplied design asset is copied to `docs/DESIGN-elevenlabs.md`.

## Current gate

M0 passed with bounded environment conditions. Repository bootstrap, license inventory, dependency install, direct shared checks, targeted MCP/ORM tests, and source-level permission/MCP review are recorded in `docs/M0_BASELINE_REPORT.md`. Docker engine availability, full server build artifacts, and a network-backed dependency audit remain release-hardening conditions.

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
- [x] The first implementation ADR is captured by the app contract: domain behavior stays in the internal app, while the root MCP service is changed only for the product-level closed-world boundary.

### M0: baseline, license, and security gate

- [x] License inventory: AGPL core, MIT-compatible packages, commercial/enterprise markers, and third-party notices.
- [x] Verify the exact checkout and source package manifests.
- [x] Verify Node/Yarn requirements and install dependencies reproducibly.
- [x] Run baseline unit/type/lint/build checks or record bounded pre-existing failures.
- [~] Start the documented Docker stack and exercise health/login if the local environment permits it. Docker engine is unavailable on this host; carry forward to release hardening.
- [x] Review authentication, workspace scoping, record/field authorization, system-object behavior, API boundaries, MCP guards/tools, and audit hooks.
- [x] Add regression-test scope and bounded remediation notes for gate findings that affect the new CRM.
- [x] Record M0 pass decision and evidence in `docs/M0_BASELINE_REPORT.md`.

M0 is closed as **PASS WITH BOUNDED ENVIRONMENT CONDITIONS**. The app baseline now has an independent build path: portable Node `v24.5.0`, 7 Vitest files / 20 tests, SDK manifest build, and app typecheck all pass. Root MCP policy tests pass 17/17. Docker health/login, the full server build, and network-backed dependency audit remain release evidence rather than silently claimed successes.

## Milestone ledger

| Milestone | Status | Evidence / next action |
| --- | --- | --- |
| M1 Domain dictionary | Complete | Five explicit objects, stable IDs, contract and design-system docs. |
| M2 Lead state machine | Complete | Blueprint lifecycle, legal transitions, terminal-state tests, semantic transition tool. |
| M3 Permission matrix | Complete | Human researcher, default function, and separately assignable research-agent roles; approval/rollback fail closed for non-human actors. |
| M4 Data model/custom objects | Complete with runtime rehearsal pending | Lead, Research, Outreach Draft, CRM Activity, and Lead Import Batch manifests build successfully; installation/migration still needs Docker. |
| M5 Application/service layer | Implemented at app boundary | Semantic logic functions centralize validation, dedupe, audit, approval, import, and lifecycle behavior; Twenty's generic object UI remains the standard record transport. |
| M6 API contracts | Complete | Zod input schemas plus explicit JSON tool schemas with bounded payloads. |
| M7 Error model | Complete | Typed `ToolResult` machine codes and safe operation-failure messages. |
| M8 Idempotency/duplicates | Complete | Deterministic website/directory/name-city keys, retry-safe tool keys, import duplicate plan, and tracked rollback batch. |
| M9 Research-source policy | Complete | HTTP(S)-only public-source validation, no private-host fetch boundary, and no terms/rate-limit bypass logic. |
| M10 Evidence/provenance | Complete | Source URL, observed time, confidence, provenance, hash, payload, actor and audit activity fields. |
| M11 Research queue/retries | Pending | Provider/job adapter remains the next product slice; current record-research path is synchronous and review-aware. |
| M12 Excel/CSV import | Implemented at app boundary | Preview, existing-workspace duplicate lookup, valid-row commit, row error report, batch tracking, soft rollback, and escaped CSV export are covered by tests/build. XLSX-native parsing remains a follow-up. |
| M13 Lead-list UX | Implemented, browser rehearsal pending | Twenty server-backed views plus 25-row cursor paging in the research desk; synthetic 10k/50k/100k benchmark exists. |
| M14 Lead detail/timeline | Implemented at data/UI contract | Relations, CRM Activity, evidence and responsive state rules are present; browser interaction and permission screenshots require Docker. |
| M15 Outreach drafts/approval | Complete at app boundary | Drafts are `NEEDS_REVIEW`; only an authenticated workspace member can approve; no send tool exists. |
| M16 MCP read tools | Complete | Direct `crm_list_leads` tool only, bounded filters/cursor, no generic catalog or CRUD bridge. |
| M17 MCP research tools | Complete at current scope | `crm_record_research` validates source/provenance and stores review state; asynchronous provider queue remains M11. |
| M18 MCP guarded writes | Complete at current scope | Explicit semantic allowlist covers lead, transition, import, research, draft, approval, rollback, and activity paths with role/audit/idempotency checks. |
| M19 Analytics/dashboard | Initial slice complete | Research desk shows total/research/draft-ready/attention summaries; funnel and data-quality analytics remain a follow-up. |
| M20 Load/security/recovery | Partial | Pure workload tests and backup/restore rehearsal docs exist; staging load, Docker restore, and full security integration checks remain. |
| M21 Release hardening | In progress | Root/upstream strategy, docs, app build, targeted tests, and checks are committed next; runtime E2E and Docker evidence remain. |

## Assumptions

- The first deployment is self-hosted and internal.
- One primary workspace is the default, but multi-user/workspace boundaries remain intact.
- PostgreSQL, Redis, Node, React, and the Twenty toolchain are acceptable.
- External providers may be unavailable; local/mock adapters are required.
- Real contact data is treated as sensitive and access is least-privilege.
- External scraping is never implemented by bypassing terms, authentication, rate limits, or anti-bot controls.

## Known environment note

The host currently reports Node `v22.22.2`, while the checked-in Twenty package requires Node `^24.5.0` and Yarn `4.13.0`. This is an environment compatibility issue to resolve or explicitly bound during M0; it is not a reason to alter the pinned upstream baseline.
