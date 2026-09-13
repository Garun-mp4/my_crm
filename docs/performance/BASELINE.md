# GarunCRM performance baseline

Date: 2026-09-12
Baseline commit: `fa52a4217af48102148c29372bc6820d9c2481f0`
Working branch: `codex/docker-compose-runtime`

## Environment

- Windows host with Docker Desktop 4.80.0, Docker Engine 29.6.1, and Compose 5.1.4.
- Docker Linux VM: 6 CPUs and 4.803 GiB available memory.
- Reproducible repository toolchain: Node `v24.5.0`, Yarn `4.13.0`.
- The host's default Node was `v22.22.2`; it was not used for the Twenty build gate.
- Compose services in scope: PostgreSQL, Redis, db-init, server, worker, my-crm-sync, and front.

## Repository and Docker footprint

The baseline repository contained 30,368 tracked files and was approximately 301.6 MB on disk. The root Docker build context was approximately 80 MB; the isolated `my-crm` app source was much smaller. The baseline images were approximately 7.22 GB in total:

| Image | Total image size | Unique layer size |
| --- | ---: | ---: |
| `my-crm-sync:latest` | 3.57 GB | 3.336 GB |
| `my-crm-server:latest` | 1.69 GB | 1.453 GB |
| `my-crm-front:latest` | 156 MB | 82.8 MB |
| `postgres:16` | 642 MB | shared/base dependent |
| `redis:7` | 170 MB | shared/base dependent |
| `node:24.5.0-alpine3.21` | 236 MB | shared/base dependent |

Baseline writable container layers were approximately 82.46 MB, named volumes approximately 817 MB, and Docker build cache was 0 B at the initial snapshot. The largest application directories were `/app/node_modules` in the sync image (approximately 2.53 GB), `/opt/my-crm/node_modules` in that image (approximately 228 MB), and `/app/node_modules` in the server image (approximately 1.11 GB). These are recorded for a future image-layer investigation; this change does not remove dependencies or alter the lockfile.

After this snapshot, direct verification builds intentionally populated Docker build cache. No cache or volume pruning was performed.

## Baseline runtime behavior

The initial Compose snapshot had all seven containers exited: PostgreSQL and server exited with code 0, while sync, db-init, front, worker, and Redis exited with code 137. Docker reported `OOMKilled=false`; no container memory limits were configured, and the event trace showed the default short stop path ending in SIGKILL. The baseline Compose file had no explicit log rotation and used Docker's default one-second stop timeout.

Measured startup observations from repeated local runs:

- Full `docker compose up -d` plus db-init/sync readiness: approximately 152–153 seconds.
- Front readiness after the base services became available: approximately 69 seconds.
- The values include image/container startup, migrations, metadata generation, and app sync; they are not production SLO measurements.

The baseline worker command was `yarn worker:prod`. Its process tree contained the Yarn wrapper, Yarn CJS launcher, and the Node queue worker, with 33 process rows observed. The queue graph itself was retained: 19 distinct queues and approximately 101 `@Processor` registrations were present. No queue, retry, or Redis behavior was disabled.

## Data and query baseline

The persistent workspace snapshot contained 392 leads, 829 activities, and 15 import batches. All 392 leads had a populated dedupe key. Redis contained approximately 3,220 keys and used approximately 102–109 MB; the AOF was approximately 40.55 MB. Redis was configured with `maxmemory 0` and `noeviction`, so the optimization does not change its persistence or eviction policy.

The Research desk loaded 25 rows with a cursor, but its four summary counters each scanned pages of up to 200 rows. With the old 100-page safety bound, the summary could issue up to 400 count queries in addition to the list query (401 initial requests in the worst case). No browser timing API was available in the harness, so p50/p95 latency and browser memory were not claimed.

The import lookup requested the first 500 leads without identity filters and used a permissive edge reader. This could miss records beyond the first API page and could silently ignore malformed response edges. Existing URL/name matching was canonicalized only after the candidate set had been fetched.

## Browser baseline

An authenticated local browser session could open the Home route, the Leads view, the Research desk page, and the Research evidence view. The Leads view showed `All Leads · 217` in the seeded workspace and populated Telegram/WhatsApp/Yandex links. The initial baseline run did not use browser timings; route rendering and data behavior were checked qualitatively.

## Gate limitations

- The baseline was a local Docker Desktop snapshot, not a production load test.
- Full Compose image rebuilding is sensitive to Windows/Docker resource contention; isolated target builds are recorded separately in `RESULTS.md`.
- The full integration project requires environment-provided API credentials and was not treated as a local no-credential gate.
- No migrations, source files, lockfiles, volumes, or Redis policies were removed or reset during measurement.
