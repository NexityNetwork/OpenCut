import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cfEnv, isAzureConfigured, startRender } from "@/hyperframes/render-job";

// Recolor for reposting: take the user's own video and produce color-graded
// variants (no speed or zoom) so the same clip can go to multiple channels
// without the platform duplicate detector throttling it. Each variant is a
// separate container execution (MODE=recolor) and a studio_renders row, so the
// shared reconcile imports each finished variant into the Library.

export const dynamic = "force-dynamic";

// Each variant = a distinct color grade (video) + a pitch/timbre shift (audio),
// no speed or zoom. Different look AND different voice fingerprint, in sync, so
// the same clip reads as a separate upload across accounts.
export const RECOLOR_PRESETS: {
	id: string;
	label: string;
	filter: string;
	audio: string;
}[] = [
	{ id: "warm", label: "Warm", filter: "eq=saturation=1.12:contrast=1.05:gamma=0.99,colorbalance=rm=0.06:bs=-0.05", audio: "aresample=44100,asetrate=41895,aresample=44100,atempo=1.053" },
	{ id: "cool", label: "Cool", filter: "eq=saturation=1.08:contrast=1.04,colorbalance=rs=-0.05:bs=0.07", audio: "aresample=44100,asetrate=46305,aresample=44100,atempo=0.952" },
	{ id: "punchy", label: "Punchy", filter: "eq=saturation=1.22:contrast=1.10:gamma=0.96", audio: "aresample=44100,asetrate=40572,aresample=44100,atempo=1.087" },
	{ id: "muted", label: "Muted", filter: "eq=saturation=0.88:contrast=1.05:gamma=1.03", audio: "aresample=44100,asetrate=45423,aresample=44100,atempo=0.971" },
	{ id: "film", label: "Film", filter: "eq=saturation=1.0:contrast=1.07,colorbalance=rs=0.04:gm=0.02:bs=-0.05", audio: "aresample=44100,asetrate=42777,aresample=44100,atempo=1.031" },
];

type D1 = {
	prepare: (q: string) => {
		bind: (...a: unknown[]) => { run: () => Promise<unknown> };
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
function keyed(request: Request): boolean {
	const key = cfEnv("PUBLISH_KEY");
	if (!key) return false;
	const h =
		request.headers.get("x-ultron-api-key") ||
		(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
	return h === key;
}

export async function GET() {
	// expose the presets so the UI can list channels/looks
	return Response.json({ presets: RECOLOR_PRESETS.map((p) => ({ id: p.id, label: p.label })) });
}

// POST { key, name?, variants?: string[] } — key is the source video's R2 key.
export async function POST(request: Request) {
	const owner = (await sessionOwner(request)) ?? "";
	if (!owner && !keyed(request)) {
		return Response.json({ error: "unauthorized" }, { status: 401 });
	}
	if (!isAzureConfigured()) {
		return Response.json({ error: "render not configured" }, { status: 503 });
	}
	const b = (await request.json().catch(() => ({}))) as {
		key?: string;
		name?: string;
		variants?: string[];
	};
	if (!b.key) return Response.json({ error: "key required" }, { status: 400 });

	const chosen = b.variants?.length
		? RECOLOR_PRESETS.filter((p) => b.variants!.includes(p.id))
		: RECOLOR_PRESETS.slice(0, 3);
	if (!chosen.length) {
		return Response.json({ error: "no valid variants" }, { status: 400 });
	}
	const base = (b.name?.trim() || "Repost").slice(0, 50);
	const d = vaultDb();
	const started: { id: string; label: string; exec: string | null }[] = [];

	for (const preset of chosen) {
		const stamp = crypto.randomUUID();
		const outKey = `imports/recolor-${stamp}.mp4`;
		let exec: string | null = null;
		try {
			exec = await startRender({
				inKey: b.key,
				outKey,
				jobId: `recolor-${stamp}`,
				env: {
					MODE: "recolor",
					RECOLOR_FILTER: preset.filter,
					RECOLOR_AUDIO: preset.audio,
				},
			});
		} catch {
			continue; // skip a variant that fails to start, keep the rest
		}
		if (d && owner && exec) {
			try {
				await d
					.prepare(
						`INSERT INTO studio_renders (id, owner, exec, out_key, name, format, status, created_at)
						 VALUES (?, ?, ?, ?, ?, ?, 'rendering', ?)`,
					)
					.bind(stamp, owner, exec, outKey, `${base} (${preset.label})`, "9:16", Date.now())
					.run();
			} catch {
				/* table missing is non-fatal */
			}
		}
		started.push({ id: preset.id, label: preset.label, exec });
	}

	return Response.json({ started, count: started.length });
}
