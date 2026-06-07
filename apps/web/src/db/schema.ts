import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Generic application metadata as a key/value store.
 *
 * This is the first table, created to validate the Cloudflare D1 wiring
 * end to end. Real product tables (projects, assets, accounts, …) get added
 * here as features land, each paired with a migration in `./migrations`.
 */
export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
})
