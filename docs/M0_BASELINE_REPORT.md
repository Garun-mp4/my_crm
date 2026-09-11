# M0 baseline, license, and security report

Date: 2026-09-11
Baseline: `twenty/v2.39.0`
Commit: `92359d5a70dee70f4084ddc98e0de0f7685cf358`
Decision: **PASS WITH BOUNDED ENVIRONMENT CONDITIONS**

The gate is sufficient to continue product implementation. The bounded conditions below are recorded as release work, not hidden as successful checks.

## Repository and upstream

- The worktree started as the user's one-commit repository and was not reinitialized.
- `origin` is `https://github.com/Garun-mp4/my_crm.git` for fetch/push.
- `upstream` is `https://github.com/twentyhq/twenty.git` for fetch only; its push URL is `DISABLED`.
- `codex/crm-implementation` contains a no-fast-forward merge preserving the user's first commit and the complete Twenty tag history.
- `docs/IMPLEMENTATION_BLUEPRINT.md`, `docs/IMPLEMENTATION_STATUS.md`, and the supplied design reference are committed.

## License inventory

The root `LICENSE` states that the project is mostly AGPLv3 with a Twenty Application Exception. It separately identifies MIT packages, including `twenty-sdk`, `twenty-client-sdk`, `create-twenty-app`, `twenty-shared`, `twenty-ui`, and applications under `packages/twenty-apps`.

The baseline contains **352 source files** with the exact `/* @license Enterprise */` marker. The inventory is concentrated in SSO/custom-domain, billing, cloud/DNS, row-level-permission, audit/event-log, and related enterprise paths. These files remain in the upstream-derived tree for history and build compatibility, but my_crm code must not copy, import, or depend on them without a separate commercial-license decision.

The application will use custom, non-system CRM objects and MIT/AGPL-compatible code paths. This is a technical inventory, not legal advice; commercial distribution or offering the modified instance as a service requires a legal review of AGPL obligations, the Application Exception, trademarks, and third-party notices.

## Dependency and baseline checks

| Check | Result | Evidence |
| --- | --- | --- |
| Node requirement | Pass using portable Node `v24.5.0` | Root engine requires `^24.5.0`; host default was `v22.22.2`. |
| Package manager | Pass | Checked-in Yarn `4.13.0`; `install --immutable` completed. |
| Immutable install | Pass with warnings | 4411 packages added, roughly 2.85 GiB; peer warnings and disabled build scripts are baseline/toolchain warnings. |
| shared typecheck | Pass | Direct `tsgo -p packages/twenty-shared/tsconfig.json --noEmit`. |
| shared build | Pass by bounded direct build | Vite + TypeScript declaration build + `tsc-alias`; Nx's barrel-generation target became non-terminating on this Windows host and was stopped after evidence collection. |
| shared lint | Pass | oxlint: 0 warnings/errors on 1018 files. |
| shared format | Pass | oxfmt check on 1018 files. |
| MCP/ORM tests | Pass | 3 suites, 22 tests, including MCP auth/tool executor and writability checks. |
| server typecheck | Bounded baseline failure | 12 missing build artifacts for `twenty-emails`, `twenty-client-sdk/generate`, and `twenty-sdk/front-component-renderer`; build those dependencies before a release gate. |
| dependency audit | Bounded external failure | Yarn audit request ended with `ECONNRESET`; rerun in CI/network with captured advisories. |
| Docker dev services | Bounded host failure | Docker Desktop was launched but the Linux engine/named pipe never became available; compose could not start Postgres/Redis. |

## Security and permission review

### Authentication and workspace scope

The MCP controller is guarded by `McpAuthGuard`, `WorkspaceAuthGuard`, and `NoPermissionGuard`. The MCP auth guard delegates JWT validation and emits an RFC 9728-style `WWW-Authenticate` response. The protocol resolves a role from either the authenticated workspace member or API key, and builds an actor context for tool execution.

### MCP boundary

The upstream MCP layer uses a tool registry, semantic tool schemas, tool annotations, and an excluded-tool set rather than exposing raw SQL or raw GraphQL directly. It also contains a generic `execute_tool` bridge to registered tools. my_crm must add an explicit allowlist and scoped semantic tools for lead research; it must not rely on a broad generic bridge for sensitive CRM writes. All custom tool calls will use the same application services as web/API/import jobs and will be audited.

### Record and field permissions

The Twenty ORM calls `validateOperationIsPermittedOrThrow` and checks object and restricted-field permissions for ordinary custom objects. At this tag, `permissions.utils.ts` intentionally returns early for system objects other than workspace members. This is a baseline design risk for generic system-object access, not a reason to store CRM data in system objects. my_crm stores lead/research/draft records in custom objects and will add negative tests proving denied custom-object reads/writes do not pass through the MCP or service boundary.

### Enterprise boundary

No new code may import the 352 marked files. SSO, custom-domain, billing, ClickHouse audit-log, and row-level-permission enterprise paths are not prerequisites for the initial internal CRM. The product will implement its own application-level audit/provenance records on AGPL-compatible paths and document the distinction from Twenty's enterprise audit features.

## Conditions carried forward

1. Build all server package dependencies and run the server typecheck/build in CI or a host with the generated package artifacts.
2. Start Postgres/Redis through Docker and exercise migrations/health/login before release hardening.
3. Re-run Yarn/npm security audit on a stable network and review advisories.
4. Add custom-object authorization negative tests before enabling CRM MCP write tools.
5. Revisit Nx barrel-generation performance on Windows or document a supported WSL/Linux development path.

None of these conditions authorizes using the commercial files, pushing to upstream, committing credentials, or sending real external outreach.
