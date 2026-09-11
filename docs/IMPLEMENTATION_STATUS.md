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

M0 is in progress. Repository bootstrap is complete. Next checks are license/security inventory, baseline dependency/startup verification, and permission/MCP boundary review. Product milestones begin only after the gate evidence is written below.

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
- [ ] Add an ADR for final core-vs-extension placement after the M0 source review.

### M0: baseline, license, and security gate

- [ ] License inventory: AGPL core, MIT-compatible packages, commercial/enterprise markers, and third-party notices.
- [ ] Verify the exact checkout and source package manifests.
- [ ] Verify Node/Yarn requirements and install dependencies reproducibly.
- [ ] Run baseline unit/type/lint/build checks or record bounded pre-existing failures.
- [ ] Start the documented Docker stack and exercise health/login if the local environment permits it.
- [ ] Review authentication, workspace scoping, record/field authorization, system-object behavior, API boundaries, MCP guards/tools, and audit hooks.
- [ ] Add regression tests or bounded remediation notes for any gate findings that affect the new CRM.
- [ ] Record M0 pass/fail decision and its evidence here before milestone 5.

## Milestone ledger

| Milestone | Status | Evidence / next action |
| --- | --- | --- |
| M0 License/security gate | In progress | Complete the checks above. |
| M1 Domain dictionary | Pending | Define lead, research, evidence, activity, draft, and audit vocabulary. |
| M2 Lead state machine | Pending | Add transition rules and tests. |
| M3 Permission matrix | Pending | Map human and AI-agent scopes to backend enforcement. |
| M4 Data model/custom objects | Pending | Implement migrations and stable identifiers. |
| M5 Application/service layer | Pending | Establish one business path for all transports. |
| M6 API contracts | Pending | Versioned DTOs and validation. |
| M7 Error model | Pending | Typed machine-readable errors and UI mapping. |
| M8 Idempotency/duplicates | Pending | Deterministic keys, matching, merge/undo policy. |
| M9 Research-source policy | Pending | Allowed sources, terms, rate limits, no invented facts. |
| M10 Evidence/provenance | Pending | Source metadata and immutable audit trail. |
| M11 Research queue/retries | Pending | Worker jobs, retry/cancel/status behavior. |
| M12 Excel/CSV import | Pending | Preview, mapping, validation, partial failure report. |
| M13 Lead-list UX | Pending | Search/filter/sort/scroll/performance. |
| M14 Lead detail/timeline | Pending | Evidence, activities, permissions, responsive states. |
| M15 Outreach drafts/approval | Pending | Human approval; no automatic sending. |
| M16 MCP read tools | Pending | Scoped semantic reads and audit. |
| M17 MCP research tools | Pending | Queue/status/evidence tools through services. |
| M18 MCP guarded writes | Pending | Idempotent, authorized draft/activity writes. |
| M19 Analytics/dashboard | Pending | Operational, funnel, and data-quality views. |
| M20 Load/security/recovery | Pending | 10k/50k/100k synthetic checks, security, backup/restore. |
| M21 Release hardening | Pending | CI, docs, Docker, E2E definition-of-done scenario. |

## Assumptions

- The first deployment is self-hosted and internal.
- One primary workspace is the default, but multi-user/workspace boundaries remain intact.
- PostgreSQL, Redis, Node, React, and the Twenty toolchain are acceptable.
- External providers may be unavailable; local/mock adapters are required.
- Real contact data is treated as sensitive and access is least-privilege.
- External scraping is never implemented by bypassing terms, authentication, rate limits, or anti-bot controls.

## Known environment note

The host currently reports Node `v22.22.2`, while the checked-in Twenty package requires Node `^24.5.0` and Yarn `4.13.0`. This is an environment compatibility issue to resolve or explicitly bound during M0; it is not a reason to alter the pinned upstream baseline.
