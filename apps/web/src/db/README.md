# Database (Cloudflare D1)

The app uses a [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite)
database, accessed through [Drizzle ORM](https://orm.drizzle.team/).

- **Binding:** `DB` (see `apps/web/wrangler.jsonc`)
- **Database:** `opencut-web-db`
- **Client:** `getDb()` in `./index.ts` — server-side only
- **Schema:** `./schema.ts`
- **Migrations:** `./migrations` (plain SQL, applied with the native D1 tooling)

## Adding a migration

```sh
# from apps/web
bunx wrangler d1 migrations create opencut-web-db <name>   # creates ./migrations/000N_<name>.sql
# edit the generated SQL, then:
bunx wrangler d1 migrations apply opencut-web-db --local   # local dev DB
bunx wrangler d1 migrations apply opencut-web-db --remote  # production
```

Keep `schema.ts` in sync with the SQL by hand (the ORM is used as a query
builder at runtime; it does not generate these migrations).

## Local development

`wrangler dev` / `vite dev` use a local SQLite DB under `.wrangler/`. Apply
migrations with `--local` to populate it.
