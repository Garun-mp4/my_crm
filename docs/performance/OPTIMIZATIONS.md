# GarunCRM optimization register

The register contains only changes supported by the baseline evidence. Each item is scoped, reversible, and leaves the CRM data model, queues, Redis policy, and dependency lockfile intact.

| ID | Area | Change | Risk | Rollback |
| --- | --- | --- | --- | --- |
| `RUNTIME-001` | Worker | Start the queue worker at `node dist/queue-worker/queue-worker`, removing the Yarn launcher chain. | Low; the compiled entrypoint is unchanged. | Restore `command: ["yarn", "worker:prod"]`. |
| `EDGE-001` | Front delivery | Enable gzip for JS/JSON/WASM/SVG/CSS/text responses with a 1 KiB threshold. | Low; clients negotiate `Content-Encoding`. | Remove the gzip directives from `nginx.conf`. |
| `HEALTH-001` | Health | Proxy front `/healthz` to the backend health endpoint. | Moderate; front health now correctly fails when the backend is unavailable. | Restore the prior static `200 ok` location. |
| `OPS-001` | Logging | Cap each Compose json-file log at 25 MB × 3 files. | Low/moderate; oldest logs rotate out. | Remove the shared `logging` anchor/service settings. |
| `OPS-002` | Shutdown | Set a 30-second Compose stop grace period for all services. | Low/moderate; a genuinely hung container takes longer to force-stop. | Remove `stop_grace_period` from the services. |
| `UI-001` | Research desk | Replace four page-count scans with four bounded `totalCount` queries. | Moderate; depends on the Core API returning a valid non-negative integer. | Restore the old cursor count loop and safety bound. |
| `DATA-001` | Lead import | Build identity prefilters in 50-row/128 KiB batches, paginate every candidate page, canonicalize client-side, and fail closed on malformed page/edge data. | Moderate/high; more queries are possible, but duplicate prevention is safer and response truncation is avoided. | Restore the previous single first-500 lookup after preserving the regression tests for a future replacement. |

## Evidence and validation by item

### RUNTIME-001 — direct worker entrypoint

Evidence: the baseline worker had a Yarn wrapper → Yarn CJS → Node process tree with 33 process rows. After recreation, `docker top my-crm-worker-1` showed one `node dist/queue-worker/queue-worker` row. The queue count, processor registrations, retry settings, and Redis policy were not changed.

Affected functionality: BullMQ/CRM queue processing and its existing environment variables. No queue was disabled.

Validation: Compose config passed; the recreated worker remained running and the direct command was visible in `docker inspect`/`docker top`.

### EDGE-001 — negotiated compression

Evidence: the large seeded JavaScript asset was 3,944,025 bytes with identity encoding and 1,161,352 bytes with gzip, a 70.6% reduction for that response. The compressed response returned `200`, `Content-Encoding: gzip`, and `Vary: Accept-Encoding`.

Affected functionality: static asset delivery only. HTML fallback and API proxy routes remain unchanged.

Validation: `nginx -t` passed in the front container and both identity and gzip curl checks returned 200.

### HEALTH-001 — backend-aware health

Evidence: before the change, front `/healthz` returned a static text response even if the backend was down. After the change it returned the backend JSON health payload. Stopping only the server caused the front health request to time out; starting the server restored a 200 response after it became healthy.

Affected functionality: Docker health reporting and operational probes; normal application routes are unchanged.

Validation: healthy front/backend checks, an intentional server outage check, and recovery check passed. The outage was performed with `docker compose stop server`/`start server`; no volumes were removed.

### OPS-001 and OPS-002 — bounded operations

Evidence: the baseline had no explicit json-file cap and used the default one-second stop timeout; its stop events ended in SIGKILL. The new container inspection showed `json-file`, `max-size=25m`, `max-file=3`, and `StopTimeout=30` for all seven services.

Affected functionality: log retention and graceful shutdown behavior only. Database and Redis volumes remain attached.

Validation: `docker compose config --quiet` and post-restart `docker inspect` checks passed.

### UI-001 — aggregate summary counts

Evidence: the old code could scan four counters × 100 pages of 200 rows. The new code sends one `totalCount` request per counter in parallel and validates the response. The initial Research desk request is therefore four aggregate calls plus one 25-row list call rather than up to 401 calls.

Affected functionality: Research desk summary cards; the list remains server-backed, 25 rows per page, and cursor-based.

Validation: app lint/typecheck passed; the authenticated browser rendered the Research desk with `All leads 217`, `In research 0`, `Draft ready 0`, `Needs attention 150`, and 25 visible rows.

### DATA-001 — bounded, complete import lookup

Evidence: the old lookup fetched only the first 500 records and tolerated malformed edges. The new lookup uses a broad prefilter as a candidate superset, caps each filter at 50 import rows and 128 KiB of serialized JSON, follows all cursor pages, and applies exact canonical URL/text matching before assigning a lead. URL query order, encoding, and slash variants are intentionally handled by the canonicalization layer; broad SQL `ILIKE` matches cannot by themselves create a duplicate.

Affected functionality: existing-lead detection used by import/sync. Create, update, provenance, idempotency, and rollback behavior are not changed.

Validation: the CRM app test run passed 59/59 tests across 12 files, including 500/5,000 rows, long two-URL payloads, whitespace, directory slash/query-order/encoding variants, negative false positives, 501 candidates, cursor safety, malformed page info, malformed edges, and malformed scalar/link fields. Changed-file oxlint and oxfmt passed, and `tsgo -p tsconfig.json --noEmit` passed for the app source. The wider package spec typecheck still reports unrelated pre-existing errors in other logic-function manifests and object manifests.

## Intentionally deferred

The following remain deliberately deferred because they need a separate workload profile or carry more operational risk than the measured changes above:

- production-pruning the sync image's development dependencies; the current image is a development sync image and the reduction needs a reproducible build-context/dependency design;
- bounded concurrency for per-row imports; this can reduce wall time but must respect Core API rate limits, idempotency, and rollback behavior;
- CPU/memory limits for Compose services; limits need a representative workload to avoid converting a soft host-pressure problem into OOM failures;
- replacing the long-lived `tail`/timer behavior of `db-init` and sync with explicit one-shot lifecycle checks; this changes Compose readiness semantics;
- moving frontend generation out of the server image build; this requires validating the existing Nx/Yarn dependency and cache graph;
- database indexes or server-side aggregate endpoints; both require schema/API changes and production query plans.

The Dockerfile, dependency lockfile, migrations, volumes, queue graph, and Redis eviction policy remain unchanged. These deferred items should be separate changes rather than speculative optimization bundled here.
