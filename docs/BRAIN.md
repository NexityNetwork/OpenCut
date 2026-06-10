# The Brain — Monolith's operational data warehouse

One queryable place that joins everything the platform knows, so an AI (or any
automation) drives the product through **data + a few named queries** instead
of orchestrating dozens of per-API tool calls. Reads come from the warehouse;
writes still go out through the real action APIs (publish, reply, DM).

Storage: **D1** (operational/OLTP — point reads, upserts, joins). Two databases:

- `ultron-publish-db` (satellite): social + publishing + automation tables
- `opencut-vault` (app): library, bio, brand, auth, **editor project mirror**

> Analytical/columnar history (months of metrics, ML features) is a future
> layer on R2 Data Catalog (Iceberg) — it sits beside this, never replaces it.

## What each subsystem contributes

### Editor / Canvas (the piece that wasn't server-side before)
| Data | Where | How it gets in |
|---|---|---|
| Full project documents — scenes → tracks → elements (text content, params, fonts, positions), settings, canvas size, fps | `vault.brain_projects.doc` | Browser pushes on every save (debounced 4s, fire-and-forget) + bulk reconcile when the library opens |
| Queryable summary — element counts by type, **every text string**, fonts used, page count, canvas size, kind (editor/canvas/template), published_item_id | `vault.brain_projects.summary` | Computed server-side on each push |
| Library assets (videos/carousels/audio/images/PDFs, captions, sections) | `vault.vault_items` | Already server-side |
| Caveat | Per-project media **binaries** stay in the browser (OPFS), referenced by id; vault media is in R2. Docs >900KB store summary-only (`doc_truncated`). Projects sync on the owner's next visit — IndexedDB can't be pulled server-side. |

### Publisher
| Data | Where |
|---|---|
| Channels (per-owner, per-platform), queue (drafts/queued/published/failed), publish events, recurring queue rules | `publish.channels`, `content_queue`, `publish_events`, `queue_rules` (already the warehouse) |
| Unified post record across platforms **+ live IG metrics** (likes, comment counts — includes posts made outside the engine) | `publish.brain_posts` (synced every 10 min) |

### SM Automation
| Data | Where |
|---|---|
| Durable comment history incl. **replied state** (inbox cache is transient; this never forgets) | `publish.brain_comments` (piggybacks the cron's cache warm — zero extra API calls) |
| DM history per conversation | `publish.brain_messages` (10-min sync) |
| Funnels, leads (+AI qualification), contacts (+24h reachability), segments, broadcasts | `publish.funnels`, `funnel_leads`, `contacts`, `segments`, `broadcasts` (already the warehouse) |

### Bio / Brand
`vault.bio_pages`, `bio_stats`, `bio_leads`, `brand_kits` — surfaced in the overview.

## Query surface (via the app proxy `/api/publish/brain/*`)

| Endpoint | What |
|---|---|
| `GET /brain/overview` | The whole account in one call: library, projects, publishing, social (posts+metrics, comments+unreplied, DMs), automation, bio, brand |
| `GET /brain/contact360?q=` | A person across every surface: contact + their comments + DMs + funnel leads |
| `POST /brain/query {sql, db?}` | Read-only SQL (SELECT-only, single statement, auto-LIMIT) against `publish` or `vault` |
| `POST /brain/sync-now` | Force a full sync (otherwise cron: comments every tick via cache warm, posts+DMs on a 10-min watermark) |
| `GET/POST /api/brain/projects` (app) | List/read/push editor project documents |

Owner scoping: the app proxy injects the session user (`x-ultron-owner`);
direct calls pass `?owner=`. All Brain reads are per-owner.

## What's intentionally NOT in the Brain
- Media bytes (R2/OPFS hold those; the Brain holds references)
- OAuth tokens/secrets (queryable surface must never leak them — the SQL
  endpoint is SELECT-only and operator-authed, but keep secrets out of habit)
- Writes — publishing/replying/DMing remain explicit action endpoints
