// Shared types + spec hardening for the recreation swarm.

import type { Scene, Spec } from "./builder";

export type Beat = {
	role: "title" | "list" | "stat" | "quote" | "cta" | "transition";
	text?: string;
	items?: { title: string; desc?: string }[];
	value?: string;
	label?: string;
	sub?: string;
	emphasis?: string;
};
export type Observed = {
	beats: Beat[];
	overall: { vibe?: string; palette?: string; density?: string };
};

// Normalize a model-produced spec: a single hook first, a single cta last, drop
// ref scenes (recreation rebuilds natively), keep it tight.
export function clampSpec(spec: { format?: Spec["format"]; scenes?: Scene[] }): Spec {
	const scenes = Array.isArray(spec.scenes) ? spec.scenes : [];
	let hook: Scene | null = null;
	let cta: Scene | null = null;
	const middles: Scene[] = [];
	for (const s of scenes) {
		if (!s || typeof s !== "object" || !("type" in s)) continue;
		if (s.type === "image" || s.type === "videoBg") continue; // not for recreation
		if (s.type === "hook") {
			if (!hook) hook = s;
			continue;
		}
		if (s.type === "cta") {
			cta = s;
			continue;
		}
		middles.push(s);
	}
	if (!hook) hook = { type: "hook", kicker: "NEW", title: "Built for you", accent: "you" };
	if (!cta) cta = { type: "cta", title: "Want the build", keyword: "BUILD" };
	return {
		format: spec.format ?? "9:16",
		scenes: [hook, ...middles.slice(0, 6), cta],
	};
}
