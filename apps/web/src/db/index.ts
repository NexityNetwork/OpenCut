import { env } from 'cloudflare:workers'
import { drizzle } from 'drizzle-orm/d1'

import * as schema from './schema'

/**
 * Drizzle client bound to the Cloudflare D1 database (wrangler binding `DB`).
 *
 * Call this from a server handler or route loader only — never at module top
 * level and never from client code, since it depends on the Workers `env`.
 */
export function getDb() {
  return drizzle(env.DB, { schema })
}

export { schema }
