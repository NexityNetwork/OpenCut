import { NextResponse } from "next/server";

// AI Clips: given timestamped transcript segments (produced client-side via
// /api/transcribe), Azure OpenAI picks the most clippable moments with
// virality scoring. The editor does the cutting; this only finds moments.

const AOAI_API_VERSION = "2024-08-01-preview";

export type ClipSuggestion = {
	start: number;
	end: number;
	title: string;
	hook: string;
	score: number;
	reason: string;
};

export async function POST(request: Request) {
	const b = (await request.json().catch(() => ({}))) as {
		segments?: { text: string; start: number; end: number }[];
	};
	const segments = (b.segments ?? []).filter(
		(s) =>
			typeof s?.text === "string" &&
			Number.isFinite(s.start) &&
			Number.isFinite(s.end),
	);
	if (segments.length === 0) {
		return NextResponse.json({ error: "segments required" }, { status: 400 });
	}

	// Ask Azure OpenAI for clip candidates.
	const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
	const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
	const aoaiKey = process.env.AZURE_OPENAI_KEY;
	if (!endpoint || !deployment || !aoaiKey) {
		return NextResponse.json(
			{ error: "AI is not configured" },
			{ status: 503 },
		);
	}

	const totalDur = Math.max(...segments.map((s) => s.end));
	const transcriptLines = segments
		.map((s) => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text}`)
		.join("\n");

	const system = `You are a short-form video editor who finds the most clippable moments in transcripts.
Return STRICT JSON: {"clips":[{"start":number,"end":number,"title":string,"hook":string,"score":number,"reason":string}]}.
Rules:
- 2 to 6 clips. Each 5-60 seconds long, within [0, ${totalDur.toFixed(1)}].
- start/end MUST align to natural sentence boundaries from the transcript timestamps.
- title: a punchy 3-8 word clip title. hook: the first line a viewer hears, verbatim-ish.
- score: 0-100 virality estimate (hook strength, emotion, payoff, shareability).
- reason: one factual sentence on why this segment works.
- Prefer self-contained moments: a claim, a story beat, a how-to, a hot take.`;

	const ai = await fetch(
		`${endpoint}openai/deployments/${deployment}/chat/completions?api-version=${AOAI_API_VERSION}`,
		{
			method: "POST",
			headers: { "api-key": aoaiKey, "Content-Type": "application/json" },
			body: JSON.stringify({
				messages: [
					{ role: "system", content: system },
					{
						role: "user",
						content: `Transcript with [start-end] seconds:\n${transcriptLines.slice(0, 24000)}`,
					},
				],
				response_format: { type: "json_object" },
				temperature: 0.4,
				max_tokens: 1400,
			}),
		},
	);
	if (!ai.ok) {
		const detail = await ai.text().catch(() => "");
		return NextResponse.json(
			{ error: `AI analysis failed (${ai.status}) ${detail.slice(0, 160)}` },
			{ status: 502 },
		);
	}
	const adata = (await ai.json()) as {
		choices?: { message?: { content?: string } }[];
	};
	let clips: ClipSuggestion[] = [];
	try {
		const parsed = JSON.parse(adata.choices?.[0]?.message?.content ?? "{}") as {
			clips?: Partial<ClipSuggestion>[];
		};
		clips = (parsed.clips ?? [])
			.map((c) => ({
				start: Math.max(0, Number(c.start) || 0),
				end: Math.min(totalDur, Number(c.end) || 0),
				title: String(c.title || "Clip").slice(0, 80),
				hook: String(c.hook || "").slice(0, 160),
				score: Math.max(0, Math.min(100, Math.round(Number(c.score) || 0))),
				reason: String(c.reason || "").slice(0, 240),
			}))
			.filter((c) => c.end - c.start >= 3)
			.sort((a, b) => b.score - a.score)
			.slice(0, 8);
	} catch {
		return NextResponse.json(
			{ error: "AI returned an unreadable plan" },
			{ status: 502 },
		);
	}
	if (clips.length === 0) {
		return NextResponse.json(
			{ error: "No clip-worthy segments found" },
			{ status: 422 },
		);
	}

	return NextResponse.json({ clips, duration: totalDur });
}
