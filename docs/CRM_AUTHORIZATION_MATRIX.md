# CRM authorization matrix

The application uses Twenty workspace and role authorization as the outer boundary and repeats business checks inside semantic logic functions. A missing or revoked workspace/API-key context must fail closed.

| Capability | Human researcher | Scoped research agent/API key | Admin/operator |
| --- | --- | --- | --- |
| Read leads/research/activity | Allowed by assigned role | Allowed by agent role | Allowed |
| Create or deduplicate leads | Allowed through UI or `crm_create_lead` | Allowed through `crm_create_lead` | Allowed |
| Record source-backed research | Allowed | Allowed | Allowed |
| Create outreach draft | Allowed | Allowed | Allowed |
| Approve outreach draft | Required human workspace member | Denied by semantic function even if the key can edit records | Allowed as human operator |
| Send external message | Outside this application | Not exposed | Outside this application |
| Soft-delete/destroy CRM records | Soft-delete only where the assigned role grants it; destroy is denied | Denied | Explicit admin policy only; destroy remains disabled by default |
| Metadata/settings/role changes | Denied | Denied | Twenty admin boundary |
| Raw SQL/GraphQL/generic CRUD over MCP | Not exposed | Not exposed | Not exposed through the CRM MCP endpoint |

Agent activity is stored with `actorRole=AGENT`, the API-key name or application actor, the transport source, and an idempotency key. A user-authenticated request carries the resolved workspace-member identity but remains distinguishable as an agent-originated MCP action. Revocation is performed at the Twenty API-key/role boundary and is checked again when the request resolves its role.
