# Performance and operations

## Large lists

The primary Lead object view remains Twenty's server-backed table. The custom research desk deliberately requests 25 rows at a time and appends the next cursor page without replacing the list, so the user's position does not jump. Search, filtering, sorting, and saved views belong to the object-view query path rather than a client-side copy of the entire table.

The app includes a deterministic synthetic workload in `src/modules/performance/lead-list-benchmark.ts` for 10,000, 50,000, and 100,000 records. It is a smoke benchmark for data-shaping logic, not a substitute for a browser and database load test. Before release, capture p50/p95 query latency, first-page render time, and memory while exercising each size against PostgreSQL with the real table view.

Release targets:

- first page returns no more than 50 records;
- no request loads the entire Lead table for normal navigation;
- search/filter/sort requests carry a bounded limit and cursor or server pagination;
- list append preserves the existing selection and scroll position;
- p95 first-page query and render stay below 500 ms in the agreed staging profile;
- 100,000 synthetic rows remain usable without browser tab memory growth that requires a reload.

## Docker and health

The pinned Twenty compose setup remains the reference local environment. Run the documented development compose file from the repository root, then exercise `/healthz` and the login flow after PostgreSQL and Redis are healthy. The runtime follow-up on 2026-09-11 passed these checks with Docker Desktop; the compose containers remain disposable development infrastructure and are not production deployment evidence.

## Backup and restore rehearsal

Use the deployment's PostgreSQL credentials from its secret manager, never from committed files:

```text
pg_dump --format=custom --file=my-crm.backup "$DATABASE_URL"
createdb my_crm_restore_check
pg_restore --clean --if-exists --dbname="$RESTORE_DATABASE_URL" my-crm.backup
```

After restore, run migrations in dry-run/rehearsal mode where supported, verify the Lead/Research/Research Job/Outreach/Activity/Import Batch objects, and execute the end-to-end scenario from `docs/IMPLEMENTATION_BLUEPRINT.md`. A disposable custom-format dump/restore rehearsal passed on 2026-09-11. Store the dump outside Git and delete test credentials after the rehearsal.
