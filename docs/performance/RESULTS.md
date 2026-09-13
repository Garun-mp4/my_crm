# GarunCRM optimization results

Status: interim handoff for continuation in GitHub Codespaces.

Date: 2026-09-13
Baseline commit: `fa52a4217af48102148c29372bc6820d9c2481f0`
Working branch at handoff: `codex/docker-compose-runtime`

## Completed and verified

- The CRM app test run passed **59/59 tests across 12 files**.
- Changed-file oxlint and oxfmt checks passed with no warnings or errors.
- `tsgo -p tsconfig.json --noEmit` passed for the CRM app source.
- The Compose configuration was validated with `docker compose config --quiet`.
- The Research desk now uses one bounded list request and four aggregate `totalCount` requests instead of potentially 401 requests for the initial view.
- Lead import lookup now batches identity filters, follows all candidate pages, canonicalizes matches client-side, and fails closed on malformed responses.
- The worker uses the direct compiled Node entrypoint; Compose services use bounded json-file logging and a 30-second stop grace period.
- Nginx gzip delivery and backend-aware `/healthz` behavior were verified during the local runtime checks.

## Not complete at handoff

The final Docker runtime gate was interrupted while local Docker Desktop storage was being reclaimed. The final server/sync image rebuild, complete seven-service Compose smoke test, persistence restart check, and final post-test Docker cache cleanup still need to be run in the Codespace. The final measurements should be appended here rather than inferred from the interim checks.

The local Windows Docker data disk was not used as a source of truth for the Codespace. Do not delete named database or Redis volumes during the continuation; only unused image/build cache may be pruned unless the user explicitly changes that requirement.

## Required final evidence

Record the actual Codespace values for image sizes, `docker system df`, root-disk free space, Compose startup/readiness, service health, worker process tree, log rotation/stop timeout, database counts before and after a Compose restart, gzip response headers, and the final cache-prune result. Mark any comparison as non-equivalent when the Codespace data or Docker storage differs from the local baseline.
