#!/usr/bin/env node
// Seed guide_docs from guides-seed.json into D1 via the Cloudflare REST API.
//
// The seed file has NO owner column on purpose (owner is app-specific). You pass
// the target owner (the better-auth user.id that should see these guides) via env.
//
// Usage:
//   CF_ACCOUNT=... CF_D1_ID=... CF_API_TOKEN=... GUIDES_OWNER=<user.id> \
//     node seed-guides.mjs
//
// Auth: either CF_API_TOKEN (a scoped D1 token, preferred) OR
//   CF_EMAIL + CF_API_KEY (global key). D1 REST endpoint:
//   POST /accounts/{acct}/d1/database/{dbid}/query
//
// Notes:
//  - Idempotent: uses INSERT OR REPLACE keyed on id ("guide-<slug>").
//  - Batches 8 rows/insert (11 bound params each = 88, under D1's 100 limit).
//  - Run schema.sql first (wrangler d1 execute opencut-vault --file schema.sql).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ACCT = process.env.CF_ACCOUNT;
const DBID = process.env.CF_D1_ID;
const OWNER = process.env.GUIDES_OWNER;
if (!ACCT || !DBID || !OWNER) {
  console.error("Set CF_ACCOUNT, CF_D1_ID and GUIDES_OWNER (target user.id).");
  process.exit(1);
}
const headers = { "Content-Type": "application/json" };
if (process.env.CF_API_TOKEN) {
  headers.Authorization = `Bearer ${process.env.CF_API_TOKEN}`;
} else if (process.env.CF_EMAIL && process.env.CF_API_KEY) {
  headers["X-Auth-Email"] = process.env.CF_EMAIL;
  headers["X-Auth-Key"] = process.env.CF_API_KEY;
} else {
  console.error("Provide CF_API_TOKEN, or CF_EMAIL + CF_API_KEY.");
  process.exit(1);
}
const URL = `https://api.cloudflare.com/client/v4/accounts/${ACCT}/d1/database/${DBID}/query`;

async function query(sql, params) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ sql, params }),
    });
    const j = await res.json().catch(() => ({}));
    if (j.success) return j;
    const err = JSON.stringify(j.errors || j).slice(0, 160).toLowerCase();
    if (/timeout|reset|7429|internal/.test(err) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    throw new Error(`D1 error: ${JSON.stringify(j.errors || j)}`);
  }
}

const guides = JSON.parse(
  readFileSync(join(__dir, "guides-seed.json"), "utf8"),
);
const now = Date.now();
const COLS =
  "id, owner, slug, title, topic, tool, source, body, status, sort_order, created_at";
const BATCH = 8;
let inserted = 0;
for (let i = 0; i < guides.length; i += BATCH) {
  const chunk = guides.slice(i, i + BATCH);
  const placeholders = chunk.map(() => `(${Array(11).fill("?").join(",")})`).join(",");
  const params = [];
  for (const g of chunk) {
    params.push(
      g.id, OWNER, g.slug, g.title, g.topic, g.tool ?? "ultron",
      g.source ?? "", g.body, g.status ?? "draft", g.sort_order ?? i, now,
    );
  }
  await query(`INSERT OR REPLACE INTO guide_docs (${COLS}) VALUES ${placeholders}`, params);
  inserted += chunk.length;
  process.stdout.write(`\rseeded ${inserted}/${guides.length}`);
}
console.log(`\nDone. Seeded ${inserted} guides for owner ${OWNER}.`);
