# Ultron Guides — handoff

A private, in-app **guides reader**: 77 Ultron playbooks (imported from an
external guides site, fully reframed to Ultron — no other tool/brand names, no
emojis/em-dashes), stored in **D1**, rendered by a single React view with rich
`embed` blocks (Library video/image carousels, checklists, copy-able templates,
CTA cards, and live Crescendo asset iframes).

Everything below lives in `nexitynetwork/opencut`, branch
`claude/migrate-ultron-monolith-5kvfd1`. Pull that branch to read the source.

---

## 1. Source files to port (3 files)

| File | Role |
|---|---|
| `apps/web/src/projects/guides-view.tsx` | The whole reader UI. List view (topic filter + cards) and single-scroll reader. Self-contained: parses the body markdown-subset and the `embed` blocks. **Start here.** |
| `apps/web/src/app/api/guides/route.ts` | `GET` (list) + `PATCH` (set status). Reads D1 `VAULT_DB.guide_docs`, **owner-gated server-side by email** (`catalin@nexitynetwork.org`). |
| `apps/web/src/projects/vault-section.tsx` | Nav integration only. Grep `guides` / `GuidesView`: an `AppView` union member `"guides"`, a nav item under MORE TOOLS (owner-gated, `ScrollText` icon), and `appView === "guides" ? <GuidesView />`. Copy just those hooks into your shell. |

> ⚠️ The repo also has an **unrelated** `apps/web/src/guides/*` dir (timeline
> snap-guides / platform blueprints). That is NOT this feature. Only the three
> files above are the Ultron Guides feature.

Dependencies used by `guides-view.tsx`: `react`, `lucide-react`, `sonner`
(toast), and `@/utils/ui` (`cn`). Styling uses the app's `--mono-*` CSS vars +
one accent `#E8896B`. Swap those tokens for your app's if needed.

---

## 2. Data model (D1)

- D1 database: **`opencut-vault`**, bound in `wrangler.jsonc` as **`VAULT_DB`**.
- Table: **`guide_docs`** — DDL in [`schema.sql`](./schema.sql).
- Rows are private per user: the API filters `WHERE owner = <better-auth user.id>`.

Columns: `id, owner, slug, title, topic, tool, source, body, status,
sort_order, created_at, updated_at`. `body` is the guide text (see §4).

---

## 3. Seeding the 77 guides

The full content ships as [`guides-seed.json`](./guides-seed.json) (77 objects,
**no `owner` field** — owner is app-specific).

1. Create the table: `wrangler d1 execute opencut-vault --file apps/web/handoff-guides/schema.sql` (add `--remote` for prod).
2. Find the target owner id — the **better-auth `user.id`** of the account that
   should see the guides (in this repo it is Catalin's id). This is NOT the
   email; it is the row id in the auth `user` table. **If your app has a
   different auth DB, this id differs — use yours.**
3. Seed: `CF_ACCOUNT=... CF_D1_ID=... CF_API_TOKEN=... GUIDES_OWNER=<user.id> node apps/web/handoff-guides/seed-guides.mjs`
   (idempotent `INSERT OR REPLACE`; see the script header for global-key auth).

That is the only owner-specific step. Everything else is portable.

---

## 4. Body format (the `embed` system)

`body` is a light markdown subset: `## h2`, `### h3`, `- bullets`,
```` ``` ```` code fences, `**bold**`, `` `code` ``, and paragraphs. The one
special thing is a fenced **`embed`** block whose content is a JSON object the
reader turns into a rich component:

````
```embed
{"type":"iframe","src":"https://crescendo.51ultron.com/templates/remake-stripe","title":"Ledger, a payments SaaS","caption":"A Stripe-class SaaS site. Live.","height":520}
```
````

`EmbedSpec` types (all optional except `type`), handled in `guides-view.tsx`:

- `video` — `{type,src,caption}` — one Library video (`src` = an `imports/…` key).
- `image` — `{type,src,caption}` — one Library image.
- `carousel` — `{type,kind:"video"|"image",keys:[...],caption}` — horizontal
  snap-deck of Library media. `kind:"video"` = 9:16 reels, else 4:5 slides.
- `checklist` — `{type,title,items:[...]}` — interactive checkboxes.
- `template` — `{type,title,body}` — copy-to-clipboard block.
- `action` — `{type,title,desc,cta,href}` — CTA card (defaults to a create-account button).
- `iframe` — `{type,src,title,caption,height}` — live asset in a browser-chrome
  card, scaled to fit (no horizontal scrollbar).

Current content uses **11 iframes** and **13 carousels** across the 77 guides.

---

## 5. Media dependency (carousels/videos)

Carousel/video/image embeds reference **114 distinct `imports/…` keys** (mostly
`.mp4` reels). They are served by the route **`apps/web/src/app/api/import-from-url/file/route.ts`** as:

```
/api/import-from-url/file?key=imports/<uuid>.mp4
```

which streams the object from **R2 bucket `ultron-reels`**. For carousels to
render in your app you need EITHER:

- the same R2 bucket reachable (same Cloudflare account) + that `file` route, or
- copy those 114 objects into your own bucket and keep the same `file` route, or
- if you don't want the Library media, strip `carousel`/`video`/`image` embeds
  from the seed bodies — the guides still read fine (text + iframes only).

**Crescendo iframes need nothing** — `crescendo.51ultron.com` is public and
frameable (no X-Frame-Options/CSP). Individual asset routes in use:
`/templates/remake-*` (Stripe/Linear/Vercel/Warp/Notion/Figma…),
`/templates/{analytics,crm,ops}-dashboard`, `/templates/{ai-startup,mobile-app,…}`,
and `/kits/{observability,voice-agent,sidebar-copilot,mission-control,support-console}`.
There are 46 template routes + 5 kit routes total if you want more.

---

## 6. API contract

`GET /api/guides` → `{ guides: Guide[] }` (403 `{guides:[]}` if the caller
isn't the owner). `PATCH /api/guides` `{ id, status }` → sets
`draft|approved|rejected`. `Guide = {id,slug,title,topic,tool,source,body,status}`.

Gating is by session email (`OWNER_EMAIL` const) → resolves to `user.id` →
filters rows. Change `OWNER_EMAIL` if a different account should own them.

---

## 7. Content summary

77 guides. Topics: productivity 14, marketing 11, building 10, career 10,
power 8, design 7, start 6, life 6, content 5. All Ultron-branded; scanned
clean of emojis, em/en-dashes, smart quotes, and competitor/tool/person names.
