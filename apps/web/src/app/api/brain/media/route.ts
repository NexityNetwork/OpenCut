import { getCloudflareContext } from "@opennextjs/cloudflare";

// The Brain, assets slice — a read-only inventory of editor project media.
//
// The bytes are already made durable in R2 and synced across devices by the
// account-sync engine, which records every asset in account_media (and stores
// the bytes under acct/<owner>/<project>/<id>). This endpoint simply exposes
// that canonical table to the headless Brain, so the AI can see every asset an
// owner has — without re-storing or duplicating anything.

type D1 = {
	prepare: (q: string) => {
		bind: (...a: unknown[]) => {
			all: () => Promise<{ results?: Record<string, unknown>[] }>;
		};
	};
};

function db(): D1 | undefined {
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

type Meta = {
	name?: string;
	type?: string;
	width?: number;
	height?: number;
	duration?: number;
	thumbnailUrl?: string;
	ephemeral?: boolean;
};

export async function GET(request: Request) {
	const u = new URL(request.url);
	const owner =
		(await sessionOwner(request)) ?? u.searchParams.get("owner") ?? "";
	if (!owner) return Response.json({ assets: [], count: 0, by_type: {} });
	const d = db();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });

	const projectId =
		u.searchParams.get("project_id") || u.searchParams.get("projectId");
	const rows = projectId
		? await d
				.prepare(
					"SELECT id, project_id, meta, updated_at FROM account_media WHERE owner = ? AND project_id = ? ORDER BY updated_at DESC LIMIT 500",
				)
				.bind(owner, projectId)
				.all()
		: await d
				.prepare(
					"SELECT id, project_id, meta, updated_at FROM account_media WHERE owner = ? ORDER BY updated_at DESC LIMIT 1000",
				)
				.bind(owner)
				.all();

	const byType: Record<string, number> = {};
	const assets = (rows.results ?? []).map((r) => {
		let meta: Meta = {};
		try {
			meta = JSON.parse(String(r.meta ?? "{}")) as Meta;
		} catch {
			/* keep empty */
		}
		const type = String(meta.type ?? "unknown");
		byType[type] = (byType[type] ?? 0) + 1;
		const pid = String(r.project_id ?? "");
		return {
			asset_id: r.id,
			project_id: pid,
			name: meta.name ?? null,
			type,
			width: meta.width ?? null,
			height: meta.height ?? null,
			duration: meta.duration ?? null,
			has_thumbnail: !!meta.thumbnailUrl,
			updated_at: r.updated_at ?? null,
			// The durable byte stream the editor itself uses — pulls from R2.
			file_url: `/api/account/media/file?owner=${encodeURIComponent(owner)}&projectId=${encodeURIComponent(pid)}&id=${encodeURIComponent(String(r.id))}`,
		};
	});

	return Response.json({
		assets,
		count: assets.length,
		by_type: byType,
		source: "account_media",
	});
}
