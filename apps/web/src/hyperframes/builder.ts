// HyperFrames composition builder: a structured scene spec -> a self-contained
// HyperFrames HTML composition (brand-themed, deterministic GSAP timeline).
// The LLM only emits the spec (copy + scene choices + ref placement); this
// builder owns the look, so quality is consistent regardless of model strength.
// Pure string templating — safe to run in a Cloudflare Worker.

export type Ref = { id: string; file: string; kind: "image" | "video" };

export type Scene =
	| {
			type: "hook";
			kicker?: string;
			title: string;
			sub?: string;
			accent?: string;
			dur?: number;
	  }
	| {
			type: "cards";
			kicker?: string;
			items: { title: string; desc?: string }[];
			dur?: number;
	  }
	| { type: "stat"; kicker?: string; value: string; label: string; dur?: number }
	| { type: "quote"; quote: string; attribution?: string; dur?: number }
	| { type: "image"; refId: string; caption?: string; title?: string; dur?: number }
	| { type: "videoBg"; refId: string; title?: string; sub?: string; dur?: number }
	| { type: "cta"; title: string; keyword?: string; accent?: string; dur?: number };

export type Spec = {
	format?: "9:16" | "16:9" | "1:1" | "4:3";
	fps?: number;
	scenes: Scene[];
};

export type Theme = {
	id: string;
	bg: string;
	ink: string;
	ink2: string;
	ink3: string;
	accent: string;
	font: string;
	pad: number; // side padding (safe zone)
};

export const THEMES: Record<string, Theme> = {
	ultron: {
		id: "ultron",
		bg: "#0a0a0f",
		ink: "#ffffff",
		ink2: "rgba(255,255,255,.6)",
		ink3: "rgba(255,255,255,.4)",
		accent: "#e85429",
		font: "Inter",
		pad: 110,
	},
	mono: {
		id: "mono",
		bg: "#0b0b0c",
		ink: "#ffffff",
		ink2: "rgba(255,255,255,.62)",
		ink3: "rgba(255,255,255,.42)",
		accent: "#ffffff",
		font: "Inter",
		pad: 110,
	},
	frost: {
		id: "frost",
		bg: "#f4f5f7",
		ink: "#0c0d12",
		ink2: "rgba(12,13,18,.62)",
		ink3: "rgba(12,13,18,.4)",
		accent: "#2f6bff",
		font: "Inter",
		pad: 110,
	},
	gold: {
		id: "gold",
		bg: "#0c0a07",
		ink: "#f7f1e6",
		ink2: "rgba(247,241,230,.6)",
		ink3: "rgba(247,241,230,.4)",
		accent: "#d9a441",
		font: "Inter",
		pad: 110,
	},
};

export const THEME_LABELS: Record<string, string> = {
	ultron: "Ultron",
	mono: "Mono",
	frost: "Frost",
	gold: "Gold",
};

export const FORMATS: Record<string, [number, number]> = {
	"9:16": [1080, 1920],
	"16:9": [1920, 1080],
	"1:1": [1080, 1080],
	"4:3": [1440, 1080],
};

// Platform safe zones (canvas px). Readable text/CTAs must stay inside this
// band so the app UI (captions, action rail, wordmark) never covers them. The
// 9:16 values come from the carousel safe-zone work (top >= 250, bottom >= 360,
// right gets the action rail). Background graphics may still bleed past it.
export const SAFE: Record<string, { top: number; bottom: number; left: number; right: number }> = {
	"9:16": { top: 250, bottom: 360, left: 96, right: 110 },
	"16:9": { top: 80, bottom: 96, left: 140, right: 140 },
	"1:1": { top: 120, bottom: 150, left: 96, right: 96 },
	"4:3": { top: 96, bottom: 120, left: 120, right: 120 },
};

// Composer model choices (Azure OpenAI deployments). Default to the strongest.
export const STUDIO_MODELS: { value: string; label: string }[] = [
	{ value: "gpt-5.4", label: "Best" },
	{ value: "gpt-5.4-mini", label: "Fast" },
	{ value: "gpt-4.1-mini", label: "Lite" },
];
export const DEFAULT_MODEL = "gpt-5.4";
export function resolveModel(model?: string): string {
	return STUDIO_MODELS.some((m) => m.value === model)
		? (model as string)
		: DEFAULT_MODEL;
}

const esc = (s: string) =>
	String(s ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");

function accentize(title: string, accent?: string): string {
	const t = esc(title);
	if (accent) {
		const a = esc(accent);
		if (a && t.includes(a))
			return t.replace(a, `<span class="accent">${a}</span>`);
	}
	const parts = t.split(" ");
	if (parts.length > 1) {
		const last = parts.pop();
		return `${parts.join(" ")} <span class="accent">${last}</span>`;
	}
	return t;
}

function sceneTiming(scenes: Scene[]): { starts: number[]; total: number } {
	const starts: number[] = [];
	let t = 0;
	for (const s of scenes) {
		starts.push(t);
		t += s.dur ?? defaultDur(s);
	}
	return { starts, total: t };
}
function defaultDur(s: Scene): number {
	if (s.type === "hook" || s.type === "cta") return 2.6;
	if (s.type === "cards") return Math.max(2.4, 1.1 * (s.items?.length ?? 3));
	if (s.type === "image" || s.type === "videoBg") return 3.0;
	return 2.2;
}

// each scene returns body html + the GSAP timeline lines for its window
function renderScene(
	s: Scene,
	i: number,
	t0: number,
	t1: number,
	th: Theme,
	refs: Record<string, Ref>,
): { html: string; anim: string } {
	const id = `s${i}`;
	const out = t1 - 0.3;
	const enter = `tl.fromTo("#${id}",{opacity:0,y:46},{opacity:1,y:0,duration:.55,ease:"power3.out"},${t0.toFixed(2)});`;
	const exit = `tl.to("#${id}",{opacity:0,duration:.3},${out.toFixed(2)});`;
	let inner = "";
	let extra = "";
	switch (s.type) {
		case "hook": {
			inner = `${s.kicker ? `<div class="kicker">${esc(s.kicker)}</div>` : ""}
        <div class="headline">${accentize(s.title, s.accent)}</div>
        ${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ""}`;
			break;
		}
		case "cta": {
			inner = `<div class="headline">${accentize(s.title, s.accent)}</div>
        <div class="ctabtn">Comment <b>${esc(s.keyword ?? "INFO")}</b></div>`;
			extra = `tl.fromTo("#${id} .ctabtn",{opacity:0,scale:.9},{opacity:1,scale:1,duration:.5,ease:"back.out(1.6)"},${(t0 + 0.3).toFixed(2)});`;
			break;
		}
		case "cards": {
			const rows = (s.items ?? [])
				.map(
					(it, k) =>
						`<div class="row" data-k="${k}"><div class="rdot"></div><div class="rt"><div class="rtitle">${esc(it.title)}</div>${it.desc ? `<div class="rdesc">${esc(it.desc)}</div>` : ""}</div></div>`,
				)
				.join("");
			inner = `${s.kicker ? `<div class="kicker">${esc(s.kicker)}</div>` : ""}<div class="rows">${rows}</div>`;
			extra = `tl.fromTo("#${id} .row",{opacity:0,x:-30},{opacity:1,x:0,duration:.5,stagger:.12,ease:"power2.out"},${(t0 + 0.15).toFixed(2)});`;
			break;
		}
		case "stat": {
			inner = `${s.kicker ? `<div class="kicker">${esc(s.kicker)}</div>` : ""}<div class="stat">${esc(s.value)}</div><div class="sub">${esc(s.label)}</div>`;
			extra = `tl.fromTo("#${id} .stat",{opacity:0,scale:.8},{opacity:1,scale:1,duration:.7,ease:"power3.out"},${(t0 + 0.1).toFixed(2)});`;
			break;
		}
		case "quote": {
			inner = `<div class="quote">${esc(s.quote)}</div>${s.attribution ? `<div class="sub">${esc(s.attribution)}</div>` : ""}`;
			break;
		}
		case "image": {
			const r = refs[s.refId];
			const src = r ? r.file : "";
			inner = `<div class="imgwrap"><img class="refimg" src="${esc(src)}" /></div>${s.title ? `<div class="headline sm">${esc(s.title)}</div>` : ""}${s.caption ? `<div class="sub">${esc(s.caption)}</div>` : ""}`;
			extra = `tl.fromTo("#${id} .refimg",{opacity:0,scale:1.06},{opacity:1,scale:1,duration:.7,ease:"power2.out"},${t0.toFixed(2)});`;
			break;
		}
		case "videoBg": {
			const r = refs[s.refId];
			const src = r ? r.file : "";
			// id + data-start + data-duration are REQUIRED: without them the
			// renderer cannot seek the <video> and the frame stays frozen.
			inner = `<video id="vid${i}" class="refvid" src="${esc(src)}" muted playsinline data-start="${t0.toFixed(2)}" data-duration="${(t1 - t0).toFixed(2)}"></video><div class="scrim"></div><div class="vtext">${s.title ? `<div class="headline">${accentize(s.title, undefined)}</div>` : ""}${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ""}</div>`;
			break;
		}
	}
	return {
		html: `<div class="scene ${s.type}" id="${id}">${inner}</div>`,
		anim: `${enter}${extra}${exit}`,
	};
}

export function buildComposition({
	spec,
	theme,
	refs = [],
}: {
	spec: Spec;
	theme: Theme;
	refs?: Ref[];
}): { html: string; width: number; height: number; duration: number } {
	const fmt = spec.format ?? "9:16";
	const [w, h] = FORMATS[fmt] ?? FORMATS["9:16"];
	const safe = SAFE[fmt] ?? SAFE["9:16"];
	const fps = spec.fps && spec.fps >= 12 && spec.fps <= 120 ? spec.fps : 30;
	const { starts, total } = sceneTiming(spec.scenes);
	const refMap: Record<string, Ref> = {};
	for (const r of refs) refMap[r.id] = r;
	const parts = spec.scenes.map((s, i) =>
		renderScene(s, i, starts[i], starts[i] + (s.dur ?? defaultDur(s)), theme, refMap),
	);
	const body = parts.map((p) => p.html).join("\n");
	const anims = parts.map((p) => p.anim).join("\n");
	// type scale relative to a 1080 short-edge canvas so copy reads the same in
	// portrait, landscape and square.
	const scale = Math.min(w, h) / 1080;
	const px = (n: number) => Math.round(n * scale);
	return {
		width: w,
		height: h,
		duration: Number(total.toFixed(2)),
		html: `<!doctype html><html lang="en"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=${w}, height=${h}" />
<script src="./gsap.min.js"></script>
<style>
@font-face{font-family:"Inter";font-style:normal;font-weight:100 900;src:url("./inter.woff2") format("woff2");font-display:block}
@font-face{font-family:"Inter";font-style:italic;font-weight:100 900;src:url("./inter-italic.woff2") format("woff2");font-display:block}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${w}px;height:${h}px;overflow:hidden;background:${theme.bg}}
body{font-family:"${theme.font}",sans-serif;color:${theme.ink}}
.glow{position:absolute;width:${px(1100)}px;height:${px(1100)}px;border-radius:50%;background:radial-gradient(circle,${theme.accent}33,transparent 60%);top:${px(-300)}px;right:${px(-300)}px}
.scene{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:${safe.top}px ${safe.right}px ${safe.bottom}px ${safe.left}px;opacity:0}
.kicker{font-size:${px(34)}px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:${theme.accent};margin-bottom:${px(28)}px}
.headline{font-size:${px(120)}px;font-weight:800;line-height:1.0;letter-spacing:-.025em}
.headline.sm{font-size:${px(84)}px;margin-top:${px(36)}px}
.headline .accent{color:${theme.accent};font-style:italic}
.rtitle .accent{color:${theme.accent};font-style:italic}
.sub{font-size:${px(42)}px;font-weight:500;color:${theme.ink2};margin-top:${px(36)}px;line-height:1.3;max-width:${px(860)}px}
.stat{font-size:${px(300)}px;font-weight:900;line-height:.9;color:${theme.accent};letter-spacing:-.03em}
.quote{font-size:${px(86)}px;font-weight:800;line-height:1.12;letter-spacing:-.02em}
.rows{display:flex;flex-direction:column;gap:${px(34)}px;margin-top:${px(20)}px}
.row{display:flex;gap:${px(28)}px;align-items:flex-start}
.rdot{width:${px(18)}px;height:${px(18)}px;border-radius:50%;background:${theme.accent};margin-top:${px(20)}px;flex:none}
.rtitle{font-size:${px(58)}px;font-weight:800;letter-spacing:-.02em;line-height:1.05}
.rdesc{font-size:${px(36)}px;font-weight:500;color:${theme.ink2};margin-top:${px(10)}px;line-height:1.3}
.ctabtn{display:inline-flex;align-items:center;gap:${px(16)}px;border:2px solid ${theme.accent};border-radius:999px;padding:${px(24)}px ${px(46)}px;font-size:${px(44)}px;font-weight:700;margin-top:${px(34)}px;align-self:flex-start}
.ctabtn b{color:${theme.accent}}
.imgwrap{width:100%;border-radius:${px(28)}px;overflow:hidden;box-shadow:0 ${px(40)}px ${px(120)}px rgba(0,0,0,.6)}
.refimg{width:100%;display:block}
.image{justify-content:center}
.videoBg{padding:0}
.refvid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,10,15,.1),rgba(10,10,15,.85))}
.vtext{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:${safe.top}px ${safe.right}px ${safe.bottom}px ${safe.left}px}
</style></head><body>
<div id="root" data-composition-id="main" data-start="0" data-duration="${total.toFixed(2)}" data-width="${w}" data-height="${h}" data-fps="${fps}">
<div class="glow" id="glow"></div>
${body}
</div>
<script>
window.__timelines=window.__timelines||{};
const tl=gsap.timeline({paused:true});
${anims}
tl.to("#glow",{rotation:45,transformOrigin:"center",duration:${total.toFixed(2)},ease:"none"},0);
window.__timelines["main"]=tl;
</script></body></html>`,
	};
}
