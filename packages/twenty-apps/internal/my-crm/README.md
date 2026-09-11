# My CRM

My CRM is the internal lead-research application built on the public Twenty app SDK at the pinned `twenty/v2.39.0` baseline.

The app models the working flow around a potential client:

1. capture a deduplicated lead;
2. attach research facts with source URLs, timestamps, confidence, and provenance;
3. prepare an outreach draft;
4. require a human approval before any future delivery integration;
5. record the resulting activity without sending messages automatically.

## Local checks

The source is designed to be built by the Twenty SDK from the repository root:

```text
yarn twenty dev:build packages/twenty-apps/internal/my-crm
```

When working inside this directory, install the isolated dependencies and run:

```text
yarn install
yarn test
yarn lint
```

The generated `.twenty/` directory and `node_modules/` are local artifacts and are intentionally ignored.

## Boundary

The app uses public Twenty app APIs only. It does not import Enterprise modules, issue arbitrary SQL or GraphQL, or expose a generic CRUD/MCP bridge. The semantic tool names are the `crm_*` functions in `src/logic-functions`; their schemas are the contract for automation. All write operations are idempotency-aware and create an activity record with actor and provenance data.

The MCP endpoint for this product is configured as a closed allowlist. It exposes only the explicitly approved semantic CRM tools. It does not expose arbitrary object metadata mutation, raw query execution, or automatic external messaging.

The app is distributed under the repository's AGPL-3.0 license. Twenty's upstream files retain their original notices and license terms.
