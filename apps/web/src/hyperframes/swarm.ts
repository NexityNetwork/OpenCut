// Recreation swarm: rebuild a reference video faithfully using a small chain of
// focused gpt-4.x/5.x jobs (sequential, Worker-safe). Each job is narrow so a
// mid-size model holds up:
//   1. Reader  (vision)  frames        -> observed timeline (exact on-screen text)
//   2. Director(text)    timeline+brand-> our Spec (scene types + faithful copy)
//   3. Critic  (vision)  frames+spec   -> corrected Spec (fix wrong/missing text)
// Returns a Spec plus the theme the reference best matches.

import { callAoai } from "./aoai";
import { clampSpec, type Beat, type Observed } from "./swarm-shared";
import { THEMES, type Spec } from "./builder";

const READER_SYSTEM = `You analyze frames sampled IN ORDER from a short vertical video the user wants to recreate.
Output ONLY JSON: { "beats": Beat[], "overall": { "vibe": string, "palette": string, "density": "sparse"|"medium"|"busy" } }
Beat is: { "role": "title"|"list"|"stat"|"quote"|"cta"|"transition", "text"?: string, "items"?: {"title":string,"desc"?:string}[], "value"?: string, "label"?: string, "sub"?: string, "emphasis"?: string }
Rules:
- Read ALL on-screen text in each frame, including small caption lines, not just the big emphasized word.
- TALKING-HEAD / SCREEN-RECORDING with rolling captions: if the big text changes word-by-word across frames (a spoken caption), it is ONE continuous script. Concatenate the caption text across frames IN ORDER, then segment it into the few KEY POINTS being made. Each key point is a beat (role "list" item or "quote"), never a single-word fragment. Capture the MESSAGE, not isolated words.
- TEXT-CARD video: each distinct card is one beat. Merge near-duplicate consecutive frames.
- Put transcribed copy in text (or items for a list, value+label for a stat). Fix only obvious OCR slips.
- emphasis = the word or two visually emphasized (color, size, italic).
- role: the opening line/title is "title"; a set of points/steps is "list"; one big number is "stat"; a pulled sentence is "quote"; the closing ask is "cta"; pure motion with no new text is "transition".
- overall.vibe = short style description; palette = dominant colors; density = how much is on screen.
Return strictly the JSON object, no prose.`;

const DIRECTOR_SYSTEM = `You turn an observed timeline of a reference video into a production spec for our studio, faithful to the original but cleaned and on brand.
Output ONLY JSON: { "format": "9:16"|"16:9"|"1:1"|"4:3", "theme": "ultron"|"mono"|"frost"|"gold", "scenes": Scene[] }
Scene is one of:
 { "type":"hook", "kicker":string, "title":string, "sub"?:string, "accent":string }
 { "type":"cards", "kicker"?:string, "items":{ "title":string, "desc"?:string }[] }
 { "type":"stat", "kicker"?:string, "value":string, "label":string }
 { "type":"quote", "quote":string, "attribution"?:string }
 { "type":"cta", "title":string, "keyword":string }
Rules:
- Keep the SAME order and roughly the same number of beats. Drop only "transition" beats.
- Map each beat: title -> hook ; list -> cards ; stat -> stat ; quote -> quote ; cta -> cta.
- If several title beats cluster at the start (intro cards), they are redundant openings: choose the SINGLE most specific and compelling one as the hook (not necessarily the first; prefer a concrete benefit-led line over a generic one), and drop the weaker duplicates.
- If the beats were reconstructed from a rolling caption script (a talking head or screen recording), DISTILL the message into a tight reel: a strong hook from the opening idea, 3 to 5 key points as cards, and the closing CTA. Never output single-word or fragment scenes; every scene must read as a complete thought.
- Reuse the observed text as the copy VERBATIM where possible; clean spelling only. Use the observed emphasis as the accent (a 1-2 word phrase taken from the title).
- theme: pick the one of ultron|mono|frost|gold that best matches overall.palette and vibe.
- Apply the user's brand notes and brief for TONE only; do not drift from the reference content.
- First scene is a hook (set kicker AND accent). Last scene is a cta. No hashtags, emojis, markdown, em dashes, quotes around words, or dollar signs. Title <= 6 words, desc <= 12 words.
Return strictly the JSON object, no prose.`;

const CRITIC_SYSTEM = `You quality-check a recreation against the original frames.
You get the original frames (in order) and a proposed spec (JSON). Return a CORRECTED spec in the SAME schema that matches the frames more faithfully:
- Fix any on-screen text that was transcribed wrong or is missing.
- Add a missing beat or remove an invented one so the count and order match the frames.
- Fix wrong scene types and weak accents.
Keep our scene types (hook, cards, stat, quote, cta), keep theme, and keep the copy rules (no hashtags, emojis, markdown, em dashes, quotes, dollar signs; title <= 6 words, desc <= 12 words; first hook, last cta).
Return ONLY the corrected JSON spec object, no prose.`;

type ImgPart = { type: "image_url"; image_url: { url: string } };
const imgs = (frames: string[]): ImgPart[] =>
	frames.slice(0, 16).map((url) => ({ type: "image_url", image_url: { url } }));

export type SwarmArgs = {
	endpoint: string;
	deployment: string;
	key: string;
	frames: string[];
	brief?: string;
	instructions?: string;
	designNotes?: string;
	format?: Spec["format"];
	apiVersion?: string;
	critic?: boolean; // run the third (vision) pass; default true
	onStep?: (step: string, data: unknown) => void; // for the headless harness
};

export async function recreateSwarm(
	args: SwarmArgs,
): Promise<{ spec: Spec; themeId: string; observed: Observed }> {
	const base = {
		endpoint: args.endpoint,
		deployment: args.deployment,
		key: args.key,
		apiVersion: args.apiVersion,
	};

	// 1) Reader (vision) -> observed timeline
	const readerRaw = await callAoai({
		...base,
		messages: [
			{ role: "system", content: READER_SYSTEM },
			{
				role: "user",
				content: [
					{ type: "text", text: "Frames in order. Read them and return the timeline." },
					...imgs(args.frames),
				],
			},
		],
		json: true,
		temperature: 0.2,
		maxTokens: 2500,
	});
	const observed = safeParse<Observed>(readerRaw, { beats: [], overall: {} as Observed["overall"] });
	args.onStep?.("reader", observed);

	// 2) Director (text) -> spec
	const brandLine = [
		args.brief?.trim() ? `Brief: ${args.brief.trim()}` : "",
		args.instructions?.trim() ? `Standing instructions: ${args.instructions.trim()}` : "",
		args.designNotes?.trim() ? `Brand notes: ${args.designNotes.trim()}` : "",
	]
		.filter(Boolean)
		.join("\n");
	const directorRaw = await callAoai({
		...base,
		messages: [
			{ role: "system", content: DIRECTOR_SYSTEM },
			{
				role: "user",
				content: `Observed timeline:\n${JSON.stringify(observed)}\n\n${
					brandLine || "(no extra brand notes)"
				}\n\nTarget format: ${args.format ?? "9:16"}`,
			},
		],
		json: true,
		temperature: 0.4,
		maxTokens: 2500,
	});
	let parsed = safeParse<RawSpec>(directorRaw, { scenes: [] });
	args.onStep?.("director", parsed);

	// 3) Critic (vision) -> corrected spec
	if (args.critic !== false) {
		const criticRaw = await callAoai({
			...base,
			messages: [
				{ role: "system", content: CRITIC_SYSTEM },
				{
					role: "user",
					content: [
						{
							type: "text",
							text: `Proposed spec:\n${JSON.stringify(parsed)}\n\nOriginal frames in order follow. Return the corrected spec.`,
						},
						...imgs(args.frames),
					],
				},
			],
			json: true,
			temperature: 0.3,
			maxTokens: 2500,
		});
		const corrected = safeParse<RawSpec>(criticRaw, parsed);
		if (Array.isArray(corrected.scenes) && corrected.scenes.length) {
			parsed = corrected;
			args.onStep?.("critic", parsed);
		}
	}

	const themeId = THEMES[parsed.theme ?? ""] ? (parsed.theme as string) : "ultron";
	const spec = clampSpec(
		{ format: args.format ?? parsed.format ?? "9:16", scenes: parsed.scenes ?? [] },
	);
	return { spec, themeId, observed };
}

type RawSpec = { format?: Spec["format"]; theme?: string; scenes?: Spec["scenes"] };
function safeParse<T>(raw: string, fallback: T): T {
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}
export type { Beat };
