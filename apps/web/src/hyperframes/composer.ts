// The Studio "planner": turns a beta-tester's prompt + references + design
// notes into a structured Spec (see builder.ts). The model only chooses copy,
// scene types and where the references land — the builder owns the visual look,
// so output quality stays consistent regardless of model strength. Runs in the
// Cloudflare Worker against Azure OpenAI (model is swappable via deployment).

import type { Ref, Scene, Spec } from "./builder";
import { callAoai } from "./aoai";

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

// Recreation mode: rebuild a reference video from sampled frames using OUR
// native scene types (NOT by overlaying the original clip). The model reads the
// on-screen text and structure and reproduces it.
const RECREATE_SYSTEM = `You recreate a reference short-form video as a structured spec for our studio.
You are given ordered frames sampled from the reference video. Rebuild it natively using OUR scene types below; DO NOT use image or videoBg scenes (we are reconstructing, not overlaying the original footage).
Output ONLY JSON: { "format": "9:16"|"16:9"|"1:1"|"4:3", "scenes": Scene[] }
Scene is one of:
 { "type":"hook", "kicker":string, "title":string, "sub"?:string, "accent":string }
 { "type":"cards", "kicker"?:string, "items":{ "title":string, "desc"?:string }[] }
 { "type":"stat", "kicker"?:string, "value":string, "label":string }
 { "type":"quote", "quote":string, "attribution"?:string }
 { "type":"cta", "title":string, "keyword":string }

How to recreate:
- Read the ACTUAL on-screen text in the frames and reuse it as the copy verbatim (clean spelling only). The biggest text in the early frames is the hook title; reuse it and set accent to 1-2 words taken from that exact title. Do not invent a generic hook.
- Mirror the structure and order: opening title -> the points/sections shown -> closing call to action. One scene per distinct on-screen moment.
- Pick the scene type that matches each moment: a big opening title -> hook; a list of points -> cards; a single big number/metric -> stat; a pulled sentence -> quote; the closing ask -> cta.
- Match the pacing: similar number of scenes to the reference.
- Apply the user's brief and brand notes for tone, but keep it faithful to the reference.
- Copy is punchy and spoken-plain. No hashtags, no emojis, no markdown, no em dashes, no quotes around words, no dollar signs. Title <= 6 words; desc <= 12 words.
- First scene must be a hook (set kicker AND accent). Last scene must be a cta.
Return strictly the JSON object, no prose.`;

export type PlanArgs = {
	endpoint: string; // AZURE_OPENAI_ENDPOINT (trailing slash ok)
	deployment: string; // AZURE_OPENAI_DEPLOYMENT
	key: string; // AZURE_OPENAI_KEY
	brief: string;
	instructions?: string; // persistent agent instructions + per-render extras
	designNotes?: string; // design.md / design-system tone notes
	refs?: Ref[];
	recreateFrames?: string[]; // data URLs sampled from a reference video to rebuild
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

const REFINE_SYSTEM = `You edit an existing short-video spec. The user describes ONE change. Apply ONLY that change and keep everything else byte-identical: same scenes, same order, same wording, same types, unless the change explicitly asks otherwise.
Output ONLY JSON: { "format"?: "9:16"|"16:9"|"1:1"|"4:3", "theme"?: "ultron"|"mono"|"frost"|"gold", "scenes": Scene[] }
Scene types: hook{kicker,title,sub?,accent}, cards{kicker?,items[{title,desc?}]}, stat{kicker?,value,label}, quote{quote,attribution?}, cta{title,keyword}.
Rules:
- Return the COMPLETE spec (every scene), not just the changed part. Do NOT rewrite scenes the change did not mention.
- The user may target a scene by position or role ("scene 2", "the hook", "the cta", "the list"). Edit only that one.
- If the change asks for a different color look, set "theme" (ultron|mono|frost|gold). If it asks for a different aspect ratio, set "format".
- Keep the copy rules: no hashtags, emojis, markdown, em dashes, quotes around words, dollar signs; title <= 6 words, desc <= 12 words; first scene hook, last scene cta.
Return strictly the JSON object, no prose.`;

// Apply a single natural-language change to an existing spec, keeping the rest
// intact. Returns the edited spec and an optional theme override.
export async function refineSpec(args: {
	endpoint: string;
	deployment: string;
	key: string;
	spec: Spec;
	change: string;
	apiVersion?: string;
}): Promise<{ spec: Spec; theme?: string }> {
	const raw =
		(await callAoai({
			endpoint: args.endpoint,
			deployment: args.deployment,
			key: args.key,
			apiVersion: args.apiVersion,
			messages: [
				{ role: "system", content: REFINE_SYSTEM },
				{
					role: "user",
					content: `Current spec:\n${JSON.stringify(args.spec)}\n\nChange: ${args.change.trim()}`,
				},
			],
			json: true,
			temperature: 0.2,
			maxTokens: 2500,
		})) || "{}";
	let parsed: { format?: Spec["format"]; theme?: string; scenes?: Scene[] };
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { spec: args.spec };
	}
	const scenes = Array.isArray(parsed.scenes) ? parsed.scenes : args.spec.scenes;
	return {
		spec: {
			format: parsed.format ?? args.spec.format ?? "9:16",
			fps: args.spec.fps,
			scenes: clampScenes(scenes, []),
		},
		theme: parsed.theme,
	};
}

export async function planSpec(args: PlanArgs): Promise<Spec> {
	const refs = args.refs ?? [];
	const frames = args.recreateFrames ?? [];
	const designLine = args.designNotes?.trim()
		? `\n\nBrand / design notes (follow for tone and word choice):\n${args.designNotes.trim()}`
		: "";
	const instrLine = `Extra instructions: ${args.instructions?.trim() || "(none)"}`;

	let raw: string;
	if (frames.length) {
		// recreation: rebuild a reference video from sampled frames (vision)
		const content: (
			| { type: "text"; text: string }
			| { type: "image_url"; image_url: { url: string } }
		)[] = [
			{
				type: "text",
				text: `Recreate this reference video as a spec.\n\nBrief: ${args.brief}\n${instrLine}${designLine}\n\nTarget format: ${args.format ?? "9:16"}\n\nFrames in order:`,
			},
			...frames.slice(0, 8).map((url) => ({
				type: "image_url" as const,
				image_url: { url },
			})),
		];
		raw =
			(await callAoai({
				endpoint: args.endpoint,
				deployment: args.deployment,
				key: args.key,
				apiVersion: args.apiVersion,
				messages: [
					{ role: "system", content: RECREATE_SYSTEM },
					{ role: "user", content },
				],
				json: true,
				temperature: 0.4,
				maxTokens: 2500,
			})) || "{}";
	} else {
		const refLines = refs.length
			? "Available refs (use their ids, every one of them):\n" +
				refs.map((r) => `- id="${r.id}" kind=${r.kind}`).join("\n")
			: "No refs provided. Do not use image or videoBg scenes.";
		const user = `Brief: ${args.brief}\n\n${refLines}\n\n${instrLine}${designLine}\n\nTarget format: ${args.format ?? "9:16"}`;
		raw =
			(await callAoai({
				endpoint: args.endpoint,
				deployment: args.deployment,
				key: args.key,
				apiVersion: args.apiVersion,
				messages: [
					{ role: "system", content: SYSTEM },
					{ role: "user", content: user },
				],
				json: true,
				temperature: 0.5,
				maxTokens: 2000,
			})) || "{}";
	}

	let parsed: Spec;
	try {
		parsed = JSON.parse(raw) as Spec;
	} catch {
		throw new Error("composer returned non-JSON");
	}
	const scenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];
	// in recreation mode there are no builder refs, so clamp drops any stray
	// image/videoBg scenes the model may have emitted.
	return {
		format: args.format ?? parsed.format ?? "9:16",
		fps: parsed.fps,
		scenes: clampScenes(scenes, frames.length ? [] : refs),
	};
}
