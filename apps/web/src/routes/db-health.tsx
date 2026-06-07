import { createFileRoute } from '@tanstack/react-router'

import { getDbHealth } from '../server/db-health'

export const Route = createFileRoute('/db-health')({
  loader: () => getDbHealth(),
  component: DbHealth,
})

function DbHealth() {
  const data = Route.useLoaderData()
  return <pre>{JSON.stringify(data, null, 2)}</pre>
}
