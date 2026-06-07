import { createServerFn } from '@tanstack/react-start'

/**
 * Proves the D1 binding is reachable from the app: reads the rows seeded by
 * migration 0001. Useful as a post-deploy smoke test (GET /db-health).
 *
 * The D1 access is pulled in via dynamic import so the `cloudflare:workers`
 * dependency stays out of the client bundle.
 */
export const getDbHealth = createServerFn({ method: 'GET' }).handler(async () => {
  const { getDb } = await import('../db')
  const { appMeta } = await import('../db/schema')

  const rows = await getDb().select().from(appMeta).all()
  return { ok: true, rows }
})
