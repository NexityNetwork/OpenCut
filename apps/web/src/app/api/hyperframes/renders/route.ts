import { getCloudflareContext } from "@opennextjs/cloudflare";
import { azureToken, cfEnv, isAzureConfigured } from "@/hyperframes/render-job";

// Persistent render list for the Studio. GET reconciles any in-flight renders
// against Azure (so leaving and returning to the tab does not lose them) and
// imports finished ones into the Library exactly once.

export const dynamic = "force-dynamic";
const API_VERSION = "2024-03-01";
const JOB = "ultron-hyperframes-render-job";

type D1Row = Record<string, unknown>;
type D1 = {
	prepare: (q: string) => {
		bind: (...a: unknown[]) => {
			run: () => Promise<unknown>;
			all: () => Promise<{ results?: D1Row[] }>;
		};
	};
};
function vaultDb(): D1 | undefined {
	try {
		const { env } = getCloudflareContext();
		return (env as unknown as { VAULT_DB?: D1 }).VAULT_DB;
	} catch {
		return undefined;
	}
}
async function sessionOwner(request: Request): Promise<string | null> {
	try {
		const { createAuth } = await import("@/auth/server");
		const s = await createAuth().api.getSession({ headers: request.headers });
		return s?.user?.id ?? null;
	} catch {
		return null;
	}
}

function fileUrl(outKey: string): string {
	return `/api/import-from-url/file?key=${encodeURIComponent(outKey)}`;
}

export async function GET(request: Request) {
	const owner = await sessionOwner(request);
	if (!owner) return Response.json({ renders: [] });
	const d = vaultDb();
	if (!d) return Response.json({ renders: [] });

	let rows: D1Row[] = [];
	try {
		const { results } = await d
			.prepare(
				"SELECT id, exec, out_key, name, format, status, vault_id, created_at FROM studio_renders WHERE owner = ? ORDER BY created_at DESC LIMIT 20",
			)
			.bind(owner)
			.all();
		rows = results ?? [];
	} catch {
		return Response.json({ renders: [] });
	}

	// reconcile in-flight renders against Azure
	const pending = rows.filter((r) => r.status === "rendering" && r.exec);
	if (pending.length && isAzureConfigured()) {
		try {
			const token = await azureToken();
			const base = `https://management.azure.com/subscriptions/${cfEnv(
				"AZURE_SUBSCRIPTION",
			)}/resourceGroups/${cfEnv(
				"AZURE_RG",
			)}/providers/Microsoft.App/jobs/${JOB}/executions?api-version=${API_VERSION}`;
			const list = await (
				await fetch(base, { headers: { Authorization: `Bearer ${token}` } })
			).json();
			const byName = new Map<string, string>();
			for (const e of list.value ?? [])
				byName.set(e.name, e?.properties?.status ?? "Unknown");

			for (const r of pending) {
				const status = byName.get(String(r.exec)) ?? "Unknown";
				if (status === "Succeeded") {
					// import to Library once (guard on vault_id)
					if (!r.vault_id) {
						const vaultId = crypto.randomUUID();
						const media = JSON.stringify([
							{
								key: String(r.out_key),
								type: "video",
								ext: "mp4",
								contentType: "video/mp4",
							},
						]);
						await d
							.prepare(
								`INSERT INTO vault_items (id, owner, kind, name, source, media, tags, created_at)
								 VALUES (?, ?, 'video', ?, 'studio', ?, '["Studio"]', ?)`,
							)
							.bind(vaultId, owner, String(r.name), media, Date.now())
							.run();
						await d
							.prepare(
								"UPDATE studio_renders SET status = 'done', vault_id = ? WHERE id = ?",
							)
							.bind(vaultId, String(r.id))
							.run();
						r.status = "done";
						r.vault_id = vaultId;
					}
				} else if (status === "Failed" || status === "Cancelled") {
					await d
						.prepare("UPDATE studio_renders SET status = 'failed' WHERE id = ?")
						.bind(String(r.id))
						.run();
					r.status = "failed";
				}
			}
		} catch {
			/* reconcile is best-effort */
		}
	}

	return Response.json({
		renders: rows.map((r) => ({
			id: r.id,
			name: r.name,
			format: r.format,
			status: r.status,
			createdAt: r.created_at,
			url: r.status === "done" ? fileUrl(String(r.out_key)) : null,
		})),
	});
}
