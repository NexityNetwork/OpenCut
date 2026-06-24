# Monolith — headless operations runbook

How an agent session drives "Ultron Monolith" (the app at **edits.51ultron.com**)
headlessly via Cloudflare. Read this after cloning the branch.

## 1. Access / credentials

Set these in the session environment (secrets / env vars):

```
CLOUDFLARE_API_TOKEN=<the monolith-operator token>   # scoped, NOT the global key
CLOUDFLARE_ACCOUNT_ID=9329dd27959dfe8804ff27e1d5d50b29
```

`wrangler` reads `CLOUDFLARE_API_TOKEN` automatically and it takes precedence over
any global key. **All wrangler commands must run from `apps/web`** (the repo root
returns exit 127 — wrangler resolves config from `apps/web/wrangler.jsonc`).

The `monolith-operator` token grants (account-scoped): Workers Scripts, R2, D1, KV,
Queues, Workers AI, Workers Observability, Workers Tail (read), Account Settings
(read); plus on the `51ultron.com` zone: Workers Routes + DNS (for custom-domain
deploys). It intentionally **excludes** billing, account membership, token
management, and other zones.

**Not covered by this token:**
- **Image generation (Nano Banana / Vertex)** — a separate Google Cloud credential.
  See `carousel-render/nano-pipeline/README.md`. Needs `gcp_token.txt` (or headless
  `adc.json`) for GCP project `project-7b3f7c83-04b0-4c65-bb6`.

## 2. Resources (Cloudflare bindings)

| Kind | Name | Binding | Purpose |
|---|---|---|---|
| D1 | `opencut-vault` (`16afa4b2-a2ae-46d1-af4a-41e75836d95b`) | `VAULT_DB` | the Library / vault |
| D1 | `ultron-publish-db` (`bbe67359-d11f-4db0-a71e-6872f64b5fa1`) | — | publishing queue + channels |
| R2 | `ultron-reels` | `REELS_R2` | media; library serves keys under `imports/` |
| R2 | `ultron-carousels` | — | archive of carousel renders |
| Worker | the app + `ultron-publish` + satellites | — | `wrangler deploy` from `apps/web` |

## 3. The Library / Browse

- **Categories are just tags.** The Browse sidebar is derived from the distinct
  values in `vault_items.tags` (a JSON string array). A new category appears the
  moment an item carries that tag. (e.g. `Vertex 1920`, `Vertex 1355`, `Next WIPF`.)
- **`vault_items` columns:** `id, owner, kind, name, source, duration_sec,
  thumb_key, thumb_url, media (JSON), tags (JSON), caption, created_at (ms)`.
- A **carousel** item: `kind='carousel'`, `media` = ordered
  `[{key,type:'image',ext:'png',contentType:'image/png'}]` with keys under
  `imports/`, `tags=['<Category>']`.
- **Media serving:** `GET /api/import-from-url/file?key=imports/...` streams from
  `ultron-reels`. The route only serves keys that start with `imports/`.
- **Owner scoping:** every query filters by `owner`. Catalin's Monolith account
  owner id is `Doho2J2linQZYPsXsR95HWJPCr7XaMVA`. A different login = a different
  owner = a separate library.
- API: `apps/web/src/app/api/vault/route.ts` (GET/POST/PATCH/DELETE).

Inspect / mutate directly:
```sh
cd apps/web
wrangler d1 execute opencut-vault --remote --command \
  "SELECT id,name,tags FROM vault_items WHERE owner='Doho2J2linQZYPsXsR95HWJPCr7XaMVA' AND tags LIKE '%Vertex%' LIMIT 5;"
```

## 4. Carousel pipeline (`carousel-render/nano-pipeline/`)

`decks/<deck>.json` (slide prompts) → `run-deck.mjs` (Nano Banana, both formats,
needs GCP token) → `out/` → `upload-imports.sh` (push to `ultron-reels/imports/`)
→ `wire-library.mjs` (generate the manifest + `vault_items` INSERTs). See that
folder's README. The Remotion source decks live in `carousel-render/src/carousels/`.

## 5. Publishing

`ultron-publish-db.content_queue` holds scheduled posts; the `ultron-publish`
worker drains it. The app proxies to it via `apps/web/src/app/api/publish/`
injecting `PUBLISH_KEY`. ⚠️ This DB also holds channel connection ids — anyone
with D1 access can read them.

## 6. Smoke test (run after setting the env)

```sh
cd apps/web
wrangler whoami            # should show Catalin's account
wrangler d1 list           # opencut-vault, ultron-publish-db
wrangler r2 bucket list    # ultron-reels, ultron-carousels, ...
```

## 7. Revoke

Cloudflare dash → My Profile → API Tokens → roll/delete, or
`DELETE https://api.cloudflare.com/client/v4/user/tokens/<token_id>` with the
global key.
