import { getCloudflareContext } from "@opennextjs/cloudflare";

// Per-user Studio preferences: default theme/format/fps, persistent agent
// instructions, design notes and the confirm-before-generate toggle. Stored in
// VAULT_DB (studio_settings) keyed by the session owner so they follow the
// user across devices.

export const dynamic = "force-dynamic";

type D1 = {
	prepare: (q: string) => {
		bind: (...a: unknown[]) => {
			run: () => Promise<unknown>;
			first: <T = unknown>() => Promise<T | null>;
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

const DEFAULTS = {
	theme: "ultron",
	format: "9:16",
	fps: 30,
	instructions: "",
	designNotes: "",
	confirmBeforeGenerate: true,
};

export async function GET(request: Request) {
	const owner = await sessionOwner(request);
	if (!owner) return Response.json({ settings: DEFAULTS });
	const d = vaultDb();
	if (!d) return Response.json({ settings: DEFAULTS });
	try {
		const row = await d
			.prepare("SELECT settings FROM studio_settings WHERE owner = ?")
			.bind(owner)
			.first<{ settings: string }>();
		const saved = row?.settings ? JSON.parse(row.settings) : {};
		return Response.json({ settings: { ...DEFAULTS, ...saved } });
	} catch {
		return Response.json({ settings: DEFAULTS });
	}
}

export async function PUT(request: Request) {
	const owner = await sessionOwner(request);
	if (!owner) return Response.json({ error: "unauthorized" }, { status: 401 });
	const d = vaultDb();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
	const settings = {
		theme: typeof body.theme === "string" ? body.theme : DEFAULTS.theme,
		format: typeof body.format === "string" ? body.format : DEFAULTS.format,
		fps: typeof body.fps === "number" ? body.fps : DEFAULTS.fps,
		instructions:
			typeof body.instructions === "string"
				? body.instructions.slice(0, 4000)
				: "",
		designNotes:
			typeof body.designNotes === "string"
				? body.designNotes.slice(0, 4000)
				: "",
		confirmBeforeGenerate: body.confirmBeforeGenerate !== false,
	};
	await d
		.prepare(
			"INSERT OR REPLACE INTO studio_settings (owner, settings, updated_at) VALUES (?, ?, ?)",
		)
		.bind(owner, JSON.stringify(settings), Date.now())
		.run();
	return Response.json({ ok: true, settings });
}
