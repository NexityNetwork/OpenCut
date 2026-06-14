import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
	buildComposition,
	THEMES,
	type Ref,
	type Spec,
} from "@/hyperframes/builder";
import { planSpec } from "@/hyperframes/composer";
import { cfEnv, isAzureConfigured, startRender } from "@/hyperframes/render-job";

// The Studio composer endpoint. Two modes:
//   POST { prompt, refs, ... }            -> returns a Spec (the plan) only.
//   POST { spec, render:true, refs, ... } -> builds the composition, writes the
//                                            manifest to R2 and starts a render.
// Splitting plan from render gives the UI a confirm-before-generate step and
// lets the user tweak the plan before paying for a render.

export const dynamic = "force-dynamic";

type R2 = {
	put: (
		k: string,
		v: string | ArrayBuffer,
		o?: { httpMetadata?: { contentType?: string } },
	) => Promise<unknown>;
};
function reelsR2(): R2 | undefined {
	try {
		const { env } = getCloudflareContext();
		return (env as unknown as { REELS_R2?: R2 }).REELS_R2;
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

type InRef = { id: string; kind: "image" | "video"; key: string; ext?: string };
type Body = {
	prompt?: string;
	instructions?: string;
	designNotes?: string;
	theme?: string;
	format?: Spec["format"];
	fps?: number;
	refs?: InRef[];
	spec?: Spec;
	render?: boolean;
	name?: string;
};

const safeExt = (e?: string) =>
	(e || "bin").replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";

export async function POST(request: Request) {
	const owner = (await sessionOwner(request)) ?? "";
	const viaKey = keyed(request);
	if (!owner && !viaKey) {
		return Response.json({ error: "unauthorized" }, { status: 401 });
	}

	const b = (await request.json().catch(() => ({}))) as Body;
	const inRefs = Array.isArray(b.refs) ? b.refs : [];
	// builder refs: a relative filename the render job will populate from R2
	const refs: Ref[] = inRefs.map((r) => ({
		id: r.id,
		kind: r.kind,
		file: `${r.id}.${safeExt(r.ext)}`,
	}));
	const format = b.format ?? "9:16";

	// 1) get the plan (spec): either supplied (user-edited) or from the model
	let spec: Spec;
	if (b.spec && Array.isArray(b.spec.scenes)) {
		spec = { ...b.spec, format: b.spec.format ?? format };
	} else {
		const endpoint = cfEnv("AZURE_OPENAI_ENDPOINT");
		const deployment = cfEnv("AZURE_OPENAI_DEPLOYMENT");
		const key = cfEnv("AZURE_OPENAI_KEY");
		if (!endpoint || !deployment || !key) {
			return Response.json({ error: "composer not configured" }, { status: 503 });
		}
		if (!b.prompt?.trim()) {
			return Response.json({ error: "prompt required" }, { status: 400 });
		}
		try {
			spec = await planSpec({
				endpoint,
				deployment,
				key,
				brief: b.prompt,
				instructions: b.instructions,
				designNotes: b.designNotes,
				refs,
				format,
			});
		} catch (e) {
			return Response.json(
				{ error: (e as Error).message || "compose failed" },
				{ status: 502 },
			);
		}
	}

	if (typeof b.fps === "number") spec.fps = b.fps;

	// plan-only mode: hand back the spec for the user to review/edit
	if (!b.render) {
		return Response.json({ spec });
	}

	// 2) render mode: build the composition + manifest, push to R2, start job
	if (!isAzureConfigured()) {
		return Response.json({ error: "render not configured" }, { status: 503 });
	}
	const r2 = reelsR2();
	if (!r2) return Response.json({ error: "R2 not bound" }, { status: 503 });

	const theme = THEMES[b.theme ?? "ultron"] ?? THEMES.ultron;
	const built = buildComposition({ spec, theme, refs });
	const manifest = {
		html: built.html,
		width: built.width,
		height: built.height,
		duration: built.duration,
		refs: inRefs.map((r) => ({ file: `${r.id}.${safeExt(r.ext)}`, key: r.key })),
	};
	const stamp = crypto.randomUUID();
	const inKey = `imports/hf-${stamp}.json`;
	const outKey = `imports/hf-out-${stamp}.mp4`;
	await r2.put(inKey, JSON.stringify(manifest), {
		httpMetadata: { contentType: "application/json" },
	});

	let executionName: string | null = null;
	try {
		executionName = await startRender({ inKey, outKey, jobId: `hf-${stamp}` });
	} catch (e) {
		return Response.json(
			{ error: (e as Error).message || "start failed" },
			{ status: 502 },
		);
	}

	return Response.json({
		spec,
		executionName,
		outKey,
		duration: built.duration,
		width: built.width,
		height: built.height,
		name: b.name ?? null,
	});
}
