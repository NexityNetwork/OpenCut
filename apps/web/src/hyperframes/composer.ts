// The Studio "planner": turns a beta-tester's prompt + references + design
// notes into a structured Spec (see builder.ts). The model only chooses copy,
// scene types and where the references land — the builder owns the visual look,
// so output quality stays consistent regardless of model strength. Runs in the
// Cloudflare Worker against Azure OpenAI (model is swappable via deployment).

import type { Ref, Scene, Spec } from "./builder";

const SYSTEM = `You are the composition planner for a vertical short-form video studio.
Output ONLY JSON matching this TypeScript type:
{ "format": "9:16"|"16:9"|"1:1"|"4:3", "scenes": Scene[] }
Scene is one of:
 { "type":"hook", "kicker":string, "title":string, "sub"?:string, "accent":string }   // kicker=2-3 word UPPERCASE label; accent=1-2 word phrase taken verbatim from title to highlight
 { "type":"cards", "kicker"?:string, "items":{ "title":string, "desc"?:string }[] }    // 3-6 items, for "N things / steps / features" lists
 { "type":"stat", "kicker"?:string, "value":string, "label":string }                   // one big number, e.g. value "10x", label "faster edits"
 { "type":"quote", "quote":string, "attribution"?:string }
 { "type":"image", "refId":string, "title"?:string, "caption"?:string }                // ONLY if a ref of kind=image was provided
 { "type":"videoBg", "refId":string, "title"?:string, "sub"?:string }                  // ONLY if a ref of kind=video was provided
 { "type":"cta", "title":string, "keyword":string }                                    // closing call to action

Rules:
- 4 to 7 scenes. Use exactly ONE "hook" and it MUST be the first scene (ALWAYS set its kicker AND accent). Close with exactly one "cta" as the last scene. Do not repeat hook or cta scenes in the middle.
- Copy is punchy and spoken-plain. No hashtags, no emojis, no markdown, no em dashes, no quotes around words, no dollar signs. Title <= 6 words; desc <= 12 words.
- Use "cards" for any "N things / templates / steps / features / agents" list.
- Use EVERY provided ref: an image ref -> one "image" scene; a video ref -> one "videoBg" scene. Place a videoBg ref near the start or as the cover. Never invent refIds; only use ids that were listed.
- Honor the brand/design notes for tone and word choice. Keep titles concrete, benefit-led.
Return strictly the JSON object, no prose.`;

export type PlanArgs = {
	endpoint: string; // AZURE_OPENAI_ENDPOINT (trailing slash ok)
	deployment: string; // AZURE_OPENAI_DEPLOYMENT
	key: string; // AZURE_OPENAI_KEY
	brief: string;
	instructions?: string; // persistent agent instructions + per-render extras
	designNotes?: string; // design.md / design-system tone notes
	refs?: Ref[];
	format?: Spec["format"];
	apiVersion?: string;
};

function clampScenes(scenes: Scene[], refs: Ref[]): Scene[] {
	const validIds = new Set(refs.map((r) => r.id));
	// keep the model's first hook and last cta; everything else is a "middle".
	let hook: Scene | null = null;
	let cta: Scene | null = null;
	const middles: Scene[] = [];
	for (const s of scenes) {
		if (!s || typeof s !== "object" || !("type" in s)) continue;
		// drop ref scenes that point at an unknown id
		if ((s.type === "image" || s.type === "videoBg") && !validIds.has(s.refId))
			continue;
		if (s.type === "hook") {
			if (!hook) hook = s; // first hook wins
			continue;
		}
		if (s.type === "cta") {
			cta = s; // last cta wins
			continue;
		}
		middles.push(s);
	}
	if (!hook) {
		hook = { type: "hook", kicker: "NEW", title: "Built for you", accent: "you" };
	}
	if (!cta) {
		cta = { type: "cta", title: "Want the build", keyword: "BUILD" };
	}
	// hook + up to 5 middles + cta
	return [hook, ...middles.slice(0, 5), cta];
}

export async function planSpec(args: PlanArgs): Promise<Spec> {
	const refs = args.refs ?? [];
	const refLines = refs.length
		? "Available refs (use their ids, every one of them):\n" +
			refs.map((r) => `- id="${r.id}" kind=${r.kind}`).join("\n")
		: "No refs provided. Do not use image or videoBg scenes.";
	const designLine = args.designNotes?.trim()
		? `\n\nBrand / design notes (follow for tone and word choice):\n${args.designNotes.trim()}`
		: "";
	const user = `Brief: ${args.brief}\n\n${refLines}\n\nExtra instructions: ${
		args.instructions?.trim() || "(none)"
	}${designLine}\n\nTarget format: ${args.format ?? "9:16"}`;

	const base = args.endpoint.replace(/\/$/, "");
	const url = `${base}/openai/deployments/${args.deployment}/chat/completions?api-version=${
		args.apiVersion ?? "2024-10-21"
	}`;
	const res = await fetch(url, {
		method: "POST",
		headers: { "api-key": args.key, "Content-Type": "application/json" },
		body: JSON.stringify({
			messages: [
				{ role: "system", content: SYSTEM },
				{ role: "user", content: user },
			],
			response_format: { type: "json_object" },
			temperature: 0.5,
			max_tokens: 1400,
		}),
	});
	if (!res.ok) {
		throw new Error(`composer ${res.status}: ${(await res.text()).slice(0, 300)}`);
	}
	const data = (await res.json()) as {
		choices?: { message?: { content?: string } }[];
	};
	const raw = data.choices?.[0]?.message?.content ?? "{}";
	let parsed: Spec;
	try {
		parsed = JSON.parse(raw) as Spec;
	} catch {
		throw new Error("composer returned non-JSON");
	}
	const scenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
	return {
		format: args.format ?? parsed.format ?? "9:16",
		fps: parsed.fps,
		scenes: clampScenes(scenes, refs),
	};
}
