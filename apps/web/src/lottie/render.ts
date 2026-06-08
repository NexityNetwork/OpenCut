"use client";

import lottie, { type AnimationItem } from "lottie-web";

export type LottieData = {
	w: number;
	h: number;
	fr: number;
	ip: number;
	op: number;
	[key: string]: unknown;
};

// Cap the rasterized frame so very large Lottie (some are 2000px+) don't make
// per-frame export slow. Aspect is preserved, so display sizing is unaffected.
const MAX_RENDER_DIM = 512;

const dataCache = new Map<string, Promise<LottieData>>();
// One lottie instance per scene node (each timeline clip is its own node), so
// duplicate Lottie elements animate independently. Nodes persist across frames
// within a render session, so this stays warm.
//   - `canvas` is lottie's persistent draw target.
//   - `output`/`lastFrame` implement video-style frame stepping: the compositor's
//     external-texture cache keys on object identity, so we only hand back a NEW
//     canvas when the rendered frame actually changed (a paused playhead returns
//     the same object → cheap cache hit, no re-upload).
const instanceCache = new WeakMap<
	object,
	{
		anim: AnimationItem;
		canvas: HTMLCanvasElement;
		data: LottieData;
		lastFrame: number;
		output: HTMLCanvasElement | null;
	}
>();

export function lottieUrlFromKey(key: string): string {
	return `/lottie/${key}.json`;
}

export function getLottieData(url: string): Promise<LottieData> {
	let promise = dataCache.get(url);
	if (!promise) {
		promise = fetch(url).then((response) => {
			if (!response.ok) {
				throw new Error(`Failed to fetch lottie: ${url}`);
			}
			return response.json() as Promise<LottieData>;
		});
		dataCache.set(url, promise);
	}
	return promise;
}

export function getLottieRenderSize(data: LottieData): {
	width: number;
	height: number;
} {
	const scale = Math.min(1, MAX_RENDER_DIM / Math.max(data.w, data.h));
	return {
		width: Math.max(1, Math.round(data.w * scale)),
		height: Math.max(1, Math.round(data.h * scale)),
	};
}

/**
 * Renders the Lottie frame at `timeSeconds` (clip-local) into a cached canvas
 * for `owner` (the scene node) and returns it. The compositor uploads the
 * canvas pixels as an external texture every frame, so the result animates in
 * both preview and export.
 */
export function renderLottieFrame({
	owner,
	data,
	timeSeconds,
}: {
	owner: object;
	data: LottieData;
	timeSeconds: number;
}): HTMLCanvasElement | null {
	let instance = instanceCache.get(owner);
	if (!instance) {
		const { width, height } = getLottieRenderSize(data);
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) return null;
		const anim = lottie.loadAnimation({
			renderer: "canvas",
			loop: false,
			autoplay: false,
			// clone so lottie's in-place mutation doesn't corrupt the cached data
			animationData: structuredClone(data),
			rendererSettings: {
				context,
				clearCanvas: true,
				preserveAspectRatio: "xMidYMid meet",
			},
		});
		instance = { anim, canvas, data, lastFrame: -1, output: null };
		instanceCache.set(owner, instance);
	}

	const frameRate = instance.data.fr || 30;
	const totalFrames = Math.max(
		1,
		(instance.data.op || 0) - (instance.data.ip || 0),
	);
	let frame = (timeSeconds * frameRate) % totalFrames;
	if (!Number.isFinite(frame) || frame < 0) frame = 0;

	// Same frame as last time → return the identical object so the compositor
	// skips re-uploading (matches a paused video frame).
	const frameKey = Math.floor(frame);
	if (instance.output && instance.lastFrame === frameKey) {
		return instance.output;
	}

	instance.anim.goToAndStop(frame, true);

	// Copy the freshly drawn frame into a NEW canvas. The compositor caches
	// external textures by object identity, so a new object forces a re-upload
	// of the changed pixels; reusing one canvas would freeze on frame 0.
	const output = document.createElement("canvas");
	output.width = instance.canvas.width;
	output.height = instance.canvas.height;
	const outContext = output.getContext("2d");
	if (!outContext) return instance.canvas;
	outContext.drawImage(instance.canvas, 0, 0);
	instance.output = output;
	instance.lastFrame = frameKey;
	return output;
}
