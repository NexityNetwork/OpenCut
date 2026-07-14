// Materializes AI-authored "edit recipes" into real editor projects, in the
// browser, using the exact builders the editor uses — so media binds (pulled
// from R2, the durable source) and every produced document is valid.
//
// Two recipe shapes:
//  - single edit: trim one source video + add branded text overlays.
//  - carousel assembly: keep a template's intro video, then lay every slide of
//    a carousel after it, each for a fixed duration (the "CTW Final" batch).
//
// The headless side decides the recipe and enqueues it via /api/brain/edits.
// This runs when the library loads, turns each pending recipe into a real
// project, and marks it done.

import { toast } from "sonner";
import type { EditorCore } from "@/core";
import { processMediaAssets } from "@/media/processing";
import type { ProcessedMediaAsset } from "@/media/processing";
import {
	buildElementFromMedia,
	buildGraphicElement,
	buildLibraryAudioElement,
	buildTextElement,
} from "@/timeline/element-utils";
import {
	mediaTimeFromSeconds,
	mediaTimeToSeconds,
	TICKS_PER_SECOND,
} from "@/wasm";
import { fetchVaultItem, fileUrl } from "@/projects/vault-client";
import { storageService } from "@/services/storage/service";

type Overlay = {
	text: string;
	name?: string;
	fontFamily?: string;
	atSeconds?: number;
	durationSeconds?: number;
};
type IntroSpec = {
	vaultId: string;
	visibleSec?: number;
	trimStartSec?: number;
};
type EditSpec = {
	trim?: { start?: number; end?: number };
	overlays?: Overlay[];
	canvasSize?: { width: number; height: number };
	category?: string;
	// Carousel assembly:
	intro?: IntroSpec;
	perSlideSec?: number;
	// Hook overlay: an alpha-keyed PNG (the first slide with its background
	// removed) laid over the intro video on its own track, instead of as a
	// static frame. When set, skipFirstSlide drops slide[0] from the sequence.
	hookOverlayKey?: string;
	skipFirstSlide?: boolean;
	// Idempotent rebuild: when set, rebuild the carousel INTO this existing
	// project — clearing its visual tracks but keeping any attached audio —
	// instead of creating a new project on every re-run (no pile of duplicates).
	reuseProjectId?: string;
	// Transition: a quick zoom-punch on the first slide plus a white flash at the
	// hook -> slides cut ("the screenshots start rolling").
	slideTransition?: boolean;
	// In-place edit: load this existing draft and convert its first slide into
	// the hook overlay (instead of building a new project).
	editProjectId?: string;
	introVisibleSec?: number;
	// Thumbnail-only: set a draft's poster image (no load/render).
	thumbnailOnly?: boolean;
	thumbnailKey?: string;
	// Audio-attach: drop a music bed onto an existing draft. Loads the project,
	// measures its length, then lays the track starting at `trimStartSec` (the
	// song's drop) with fades. Replaces any existing audio so re-runs are
	// idempotent and the assigned track always wins.
	audio?: {
		url: string;
		name: string;
		trimStartSec?: number;
		startSec?: number;
		fadeInSec?: number;
		fadeOutSec?: number;
		volumeDb?: number;
	};
};
type EditJob = {
	id: string;
	name: string;
	source_vault_id: string;
	spec: EditSpec;
};

// Processed source media keyed by R2 key. The template intro is the same asset
// across the whole batch, so it's downloaded + decoded once and reused.
type AssetCache = Map<string, ProcessedMediaAsset | null>;

async function processFromKey(
	cache: AssetCache,
	key: string,
	name: string,
	fallbackType: "video" | "image",
): Promise<ProcessedMediaAsset | null> {
	if (cache.has(key)) return cache.get(key) ?? null;
	let processed: ProcessedMediaAsset | null = null;
	try {
		const blob = await (await fetch(fileUrl(key))).blob();
		const ext = key.split(".").pop() || (fallbackType === "video" ? "mp4" : "png");
		const file = new File([blob], `${name}.${ext}`, {
			type:
				blob.type ||
				(fallbackType === "video" ? "video/mp4" : `image/${ext}`),
		});
		processed = (await processMediaAssets({ files: [file] }))[0] ?? null;
	} catch {
		processed = null;
	}
	cache.set(key, processed);
	return processed;
}

// Assemble: template intro video (kept) + every carousel slide after it, each
// for `perSlideSec`. Everything lands on the one main track, in sequence, just
// like the template. Returns the new project id.
async function buildCarousel(
	editor: EditorCore,
	job: EditJob,
	cache: AssetCache,
): Promise<string> {
	const spec = job.spec;
	const carousel = await fetchVaultItem(job.source_vault_id);
	if (!carousel) throw new Error("carousel not found");
	const slides = carousel.media.filter((m) => m.type === "image");
	if (slides.length === 0) throw new Error("carousel has no slides");

	// Reuse an existing project (rebuild in place) or make a fresh one. Rebuild
	// clears the visual tracks but leaves the audio track alone, so re-runs
	// update the same project and any attached music survives — no duplicates.
	let projectId: string;
	if (spec.reuseProjectId) {
		projectId = spec.reuseProjectId;
		await editor.project.loadProject({ id: projectId });
		const scene = editor.scenes.getActiveSceneOrNull();
		if (scene) {
			for (const tr of [scene.tracks.main, ...scene.tracks.overlay]) {
				if (tr.elements.length) {
					editor.timeline.deleteElements({
						elements: tr.elements.map((e) => ({
							trackId: tr.id,
							elementId: e.id,
						})),
					});
				}
			}
		}
	} else {
		projectId = await editor.project.createNewProject({
			name: job.name || carousel.name || "CTW Final",
			canvasSize: spec.canvasSize ?? { width: 720, height: 1280 },
			...(spec.category ? { category: spec.category } : {}),
		});
	}

	// Place every clip on the project's single main video track, in order.
	const mainTrackId = editor.scenes.getActiveSceneOrNull()?.tracks.main.id;
	const place = (element: ReturnType<typeof buildElementFromMedia>) =>
		editor.timeline.insertElement({
			element,
			placement: mainTrackId
				? { mode: "explicit", trackId: mainTrackId }
				: { mode: "auto" },
		});

	let cursorSec = 0;

	// Intro video — the kept first element from the template.
	if (spec.intro?.vaultId) {
		const introItem = await fetchVaultItem(spec.intro.vaultId);
		const vid = introItem?.media.find((m) => m.type === "video");
		if (introItem && vid) {
			const processed = await processFromKey(
				cache,
				vid.key,
				introItem.name,
				"video",
			);
			if (processed) {
				const asset = await editor.media.addMediaAsset({
					projectId,
					asset: processed,
				});
				const assetId = (asset as { id?: string } | null)?.id ?? "";
				if (assetId) {
					const sourceDur = processed.duration ?? 0;
					const start = Math.max(0, spec.intro.trimStartSec ?? 0);
					const visible = Math.min(
						spec.intro.visibleSec ?? sourceDur,
						Math.max(0.1, sourceDur - start),
					);
					const el = buildElementFromMedia({
						mediaId: assetId,
						mediaType: "video",
						name: introItem.name,
						duration: mediaTimeFromSeconds({ seconds: visible }),
						startTime: mediaTimeFromSeconds({ seconds: cursorSec }),
					}) as ReturnType<typeof buildElementFromMedia> & {
						trimStart?: unknown;
						trimEnd?: unknown;
						sourceDuration?: unknown;
						params?: Record<string, unknown>;
					};
					el.trimStart = mediaTimeFromSeconds({ seconds: start });
					el.trimEnd = mediaTimeFromSeconds({
						seconds: Math.max(0, sourceDur - start - visible),
					});
					el.sourceDuration = mediaTimeFromSeconds({ seconds: sourceDur });
					// Match the template: the intro hook plays silent. The mute
					// flag is `params.muted` — `volume` is read in dB, so volume:0
					// is 0 dB (full), which is why it wasn't actually muting.
					el.params = { ...(el.params ?? {}), muted: true };
					place(el);
					cursorSec += visible;
				}
			}
		}
	}

	// Hook overlay — the first slide with its background keyed out, laid over
	// the intro video on its own (overlay) track so the live video shows
	// through. Auto placement puts an overlapping element above the main track.
	if (spec.hookOverlayKey) {
		const processed = await processFromKey(
			cache,
			spec.hookOverlayKey,
			"Hook",
			"image",
		);
		if (processed) {
			const asset = await editor.media.addMediaAsset({ projectId, asset: processed });
			const assetId = (asset as { id?: string } | null)?.id ?? "";
			if (assetId) {
				const el = buildElementFromMedia({
					mediaId: assetId,
					mediaType: "image",
					name: "Hook overlay",
					duration: mediaTimeFromSeconds({ seconds: cursorSec || 4 }),
					startTime: mediaTimeFromSeconds({ seconds: 0 }),
				});
				editor.timeline.insertElement({ element: el, placement: { mode: "auto" } });
			}
		}
	}

	// Slides — each image for the template's per-slide duration, back to back.
	// When the hook replaces the first slide, start the sequence from slide 2.
	const perSlideSec = spec.perSlideSec ?? 0.5;
	const slideList = spec.skipFirstSlide ? slides.slice(1) : slides;
	const cutSec = cursorSec; // where the footage cuts to the screenshots
	let slideIndex = 0;
	for (const m of slideList) {
		const processed = await processFromKey(cache, m.key, carousel.name, "image");
		if (!processed) continue;
		const asset = await editor.media.addMediaAsset({ projectId, asset: processed });
		const assetId = (asset as { id?: string } | null)?.id ?? "";
		if (!assetId) continue;
		const el = buildElementFromMedia({
			mediaId: assetId,
			mediaType: "image",
			name: carousel.name,
			duration: mediaTimeFromSeconds({ seconds: perSlideSec }),
			startTime: mediaTimeFromSeconds({ seconds: cursorSec }),
		}) as ReturnType<typeof buildElementFromMedia> & { animations?: unknown };
		// Zoom-punch on the first slide as the screenshots start rolling: scale
		// keyframes are relative to the element start, so time 0 is its entrance.
		if (spec.slideTransition && slideIndex === 0) {
			const punch = (a: string, b: string) => ({
				keys: [
					{ id: a, time: mediaTimeFromSeconds({ seconds: 0 }), value: 1.12, segmentToNext: "linear" as const, tangentMode: "flat" as const },
					{ id: b, time: mediaTimeFromSeconds({ seconds: 0.16 }), value: 1.0, segmentToNext: "linear" as const, tangentMode: "flat" as const },
				],
			});
			el.animations = {
				"transform.scaleX": punch("sx0", "sx1"),
				"transform.scaleY": punch("sy0", "sy1"),
			};
		}
		place(el);
		cursorSec += perSlideSec;
		slideIndex += 1;
	}

	// Flash — a quick white frame at the hook -> slides cut. A rectangle graphic
	// (overscaled to cover the portrait frame) on its own overlay track, fading
	// out over ~3 frames so it reads as a hit on the beat.
	if (spec.slideTransition && slideList.length > 0) {
		const flash = buildGraphicElement({
			definitionId: "rectangle",
			name: "Flash",
			startTime: mediaTimeFromSeconds({ seconds: cutSec }),
			params: { fill: "#ffffff", "transform.scaleX": 3, "transform.scaleY": 3 },
		}) as ReturnType<typeof buildGraphicElement> & {
			duration?: unknown;
			animations?: unknown;
		};
		flash.duration = mediaTimeFromSeconds({ seconds: 0.1 });
		flash.animations = {
			opacity: {
				keys: [
					{ id: "fa0", time: mediaTimeFromSeconds({ seconds: 0 }), value: 0.85, segmentToNext: "linear" as const, tangentMode: "flat" as const },
					{ id: "fa1", time: mediaTimeFromSeconds({ seconds: 0.1 }), value: 0, segmentToNext: "linear" as const, tangentMode: "flat" as const },
				],
			},
		};
		editor.timeline.insertElement({ element: flash, placement: { mode: "auto" } });
	}

	// Music bed — laid in the same job, so a carousel is never handed back
	// silent (no separate audio-attach round-trip). Reel length is measured
	// from the visual tracks we just placed.
	if (spec.audio?.url) {
		await layAudioBed(editor, spec.audio);
	}

	await editor.project.saveCurrentProject();
	return projectId;
}

// Single-source edit: trim one video + add branded text overlays.
async function buildSingleEdit(
	editor: EditorCore,
	job: EditJob,
): Promise<string> {
	const item = await fetchVaultItem(job.source_vault_id);
	if (!item) throw new Error("source asset not found");
	const m = item.media.find((x) => x.type === "video") ?? item.media[0];
	if (!m) throw new Error("source has no media");

	const projectId = await editor.project.createNewProject({
		name: job.name || `Edit of ${item.name}`,
		...(job.spec.canvasSize ? { canvasSize: job.spec.canvasSize } : {}),
		...(job.spec.category ? { category: job.spec.category } : {}),
	});

	const blob = await (await fetch(fileUrl(m.key))).blob();
	const file = new File([blob], `${item.name}.${m.ext || "mp4"}`, {
		type: m.contentType || blob.type || "video/mp4",
	});
	const [processed] = await processMediaAssets({ files: [file] });
	if (!processed) throw new Error("couldn't process source video");
	const asset = await editor.media.addMediaAsset({ projectId, asset: processed });
	const assetId = (asset as { id?: string } | null)?.id ?? "";
	if (!assetId) throw new Error("couldn't add source to project");

	const sourceDur = processed.duration ?? 0;
	const start = Math.max(0, Math.min(job.spec.trim?.start ?? 0, sourceDur));
	const end = Math.max(
		start + 0.5,
		Math.min(job.spec.trim?.end ?? sourceDur, sourceDur),
	);

	const el = buildElementFromMedia({
		mediaId: assetId,
		mediaType: "video",
		name: item.name,
		duration: mediaTimeFromSeconds({ seconds: end - start }),
		startTime: mediaTimeFromSeconds({ seconds: 0 }),
	}) as ReturnType<typeof buildElementFromMedia> & {
		trimStart?: unknown;
		trimEnd?: unknown;
		sourceDuration?: unknown;
	};
	el.trimStart = mediaTimeFromSeconds({ seconds: start });
	el.trimEnd = mediaTimeFromSeconds({ seconds: Math.max(0, sourceDur - end) });
	el.sourceDuration = mediaTimeFromSeconds({ seconds: sourceDur });
	editor.timeline.insertElement({ element: el, placement: { mode: "auto" } });

	for (const ov of job.spec.overlays ?? []) {
		if (!ov.text?.trim()) continue;
		const textEl = buildTextElement({
			raw: {
				name: ov.name || ov.text.slice(0, 24),
				duration: mediaTimeFromSeconds({
					seconds: ov.durationSeconds ?? Math.min(end - start, 4),
				}),
				params: {
					content: ov.text,
					...(ov.fontFamily ? { fontFamily: ov.fontFamily } : {}),
				},
			},
			startTime: mediaTimeFromSeconds({ seconds: ov.atSeconds ?? 0 }),
		});
		editor.timeline.insertElement({
			element: textEl,
			placement: { mode: "auto", trackType: "text" },
		});
	}

	await editor.project.saveCurrentProject();
	return projectId;
}

// In-place: load an existing draft, drop its first slide, re-lay the rest, and
// put the keyed hook over the intro video — same project id, no duplicate.
async function buildHookEdit(
	editor: EditorCore,
	job: EditJob,
	cache: AssetCache,
): Promise<string> {
	const spec = job.spec;
	const projectId = spec.editProjectId as string;
	await editor.project.loadProject({ id: projectId });

	const main = editor.scenes.getActiveSceneOrNull()?.tracks.main;
	if (!main) throw new Error("project has no main track");
	const els = [...main.elements].sort(
		(a, b) => (a.startTime as number) - (b.startTime as number),
	);
	const video = els.find((e) => e.type === "video");
	const introSec = video
		? mediaTimeToSeconds({ time: video.duration })
		: spec.introVisibleSec ?? 4.133333;
	const perSlideSec = spec.perSlideSec ?? 0.5;

	// Slides are the image elements; keep their media, re-place all but the first.
	const slideEls = els.filter((e) => e.type === "image");
	const slideMediaIds = slideEls
		.map((e) => (e as { mediaId?: string }).mediaId)
		.filter((id): id is string => !!id);
	if (slideEls.length > 0) {
		editor.timeline.deleteElements({
			elements: slideEls.map((e) => ({ trackId: main.id, elementId: e.id })),
		});
	}
	slideMediaIds.slice(1).forEach((mediaId, i) => {
		const el = buildElementFromMedia({
			mediaId,
			mediaType: "image",
			name: "Slide",
			duration: mediaTimeFromSeconds({ seconds: perSlideSec }),
			startTime: mediaTimeFromSeconds({ seconds: introSec + i * perSlideSec }),
		});
		editor.timeline.insertElement({
			element: el,
			placement: { mode: "explicit", trackId: main.id },
		});
	});

	// The keyed hook, over the intro video, on its own (overlay) track.
	if (spec.hookOverlayKey) {
		const processed = await processFromKey(cache, spec.hookOverlayKey, "Hook", "image");
		if (processed) {
			const asset = await editor.media.addMediaAsset({ projectId, asset: processed });
			const assetId = (asset as { id?: string } | null)?.id ?? "";
			if (assetId) {
				const el = buildElementFromMedia({
					mediaId: assetId,
					mediaType: "image",
					name: "Hook overlay",
					duration: mediaTimeFromSeconds({ seconds: introSec }),
					startTime: mediaTimeFromSeconds({ seconds: 0 }),
				});
				editor.timeline.insertElement({ element: el, placement: { mode: "auto" } });
			}
		}
	}

	await editor.project.saveCurrentProject();
	return projectId;
}

// Attach a music bed to an existing draft. Loads the project, measures its
// length from the visual tracks, then lays one library-audio clip that opens
// on the song's drop (trimStart) and runs the full reel, with fades. Any
// existing audio is cleared first so the assigned track always wins.
// Lay one music-bed clip across the reel: clears existing audio, fetches +
// decodes the song, seeks to trimStart, runs it for the reel length with the
// requested volume/fades. Assumes the project is already loaded/active — shared
// by the carousel build (so a reel is never silent) and the standalone attach.
async function layAudioBed(
	editor: EditorCore,
	a: NonNullable<EditSpec["audio"]>,
): Promise<void> {
	const tracks = editor.scenes.getActiveSceneOrNull()?.tracks;
	if (!tracks) throw new Error("project has no scene");

	// Reel length = furthest edge across the visual tracks (ignore audio).
	let maxEndTicks = 0;
	for (const tr of [tracks.main, ...tracks.overlay]) {
		for (const e of tr.elements) {
			const end = Number(e.startTime) + Number(e.duration);
			if (end > maxEndTicks) maxEndTicks = end;
		}
	}
	const reelLen = maxEndTicks / TICKS_PER_SECOND;

	// Clear any existing audio — the assigned bed replaces it.
	for (const t of tracks.audio) {
		if (t.elements.length) {
			editor.timeline.deleteElements({
				elements: t.elements.map((e) => ({ trackId: t.id, elementId: e.id })),
			});
		}
	}

	// Fetch + decode the whole song so trimStart can seek into it.
	const resp = await fetch(a.url);
	if (!resp.ok) throw new Error(`audio fetch failed: ${resp.status}`);
	const arr = await resp.arrayBuffer();
	const ctx = new AudioContext();
	let buffer: AudioBuffer;
	try {
		buffer = await ctx.decodeAudioData(arr);
	} finally {
		try {
			await ctx.close();
		} catch {
			/* ignore */
		}
	}

	const sourceDur = buffer.duration;
	const trimStart = Math.max(
		0,
		Math.min(a.trimStartSec ?? 0, Math.max(0, sourceDur - 1)),
	);
	const visible = Math.min(
		reelLen || sourceDur,
		Math.max(0.5, sourceDur - trimStart),
	);

	const el = buildLibraryAudioElement({
		sourceUrl: a.url,
		name: a.name,
		duration: mediaTimeFromSeconds({ seconds: sourceDur }),
		startTime: mediaTimeFromSeconds({ seconds: a.startSec ?? 0 }),
		buffer,
	}) as ReturnType<typeof buildLibraryAudioElement> & {
		duration?: unknown;
		trimStart?: unknown;
		trimEnd?: unknown;
		sourceDuration?: unknown;
		params?: Record<string, unknown>;
	};
	el.duration = mediaTimeFromSeconds({ seconds: visible });
	el.trimStart = mediaTimeFromSeconds({ seconds: trimStart });
	el.trimEnd = mediaTimeFromSeconds({
		seconds: Math.max(0, sourceDur - trimStart - visible),
	});
	el.sourceDuration = mediaTimeFromSeconds({ seconds: sourceDur });
	el.params = {
		...(el.params ?? {}),
		volume: a.volumeDb ?? 0,
		fadeIn: a.fadeInSec ?? 0,
		fadeOut: a.fadeOutSec ?? 0,
	};

	editor.timeline.insertElement({
		element: el,
		placement: { mode: "auto", trackType: "audio" },
	});
}

// Attach a music bed to an existing draft (standalone audio job).
async function buildAudioAttach(
	editor: EditorCore,
	job: EditJob,
): Promise<string> {
	const a = job.spec.audio;
	const projectId = job.spec.editProjectId as string;
	if (!a?.url) throw new Error("audio.url required");
	await editor.project.loadProject({ id: projectId });
	await layAudioBed(editor, a);
	await editor.project.saveCurrentProject();
	return projectId;
}

// Set a draft's poster thumbnail to a representative image (its first slide),
// without loading the project or rendering a frame.
async function buildThumbnail(job: EditJob): Promise<string> {
	const id = job.spec.editProjectId as string;
	if (job.spec.thumbnailKey) {
		await storageService.setProjectThumbnail({
			id,
			thumbnail: fileUrl(job.spec.thumbnailKey),
		});
	}
	return id;
}

function buildOne(
	editor: EditorCore,
	job: EditJob,
	cache: AssetCache,
): Promise<string> {
	if (job.spec.thumbnailOnly) return buildThumbnail(job);
	// Carousel wins over the standalone audio branch: a carousel job may carry
	// spec.audio and lays it inline (buildCarousel), so it's never handed back
	// silent. Standalone audio-attach is only for editProjectId-without-carousel.
	if (job.spec.intro || job.spec.perSlideSec)
		return buildCarousel(editor, job, cache);
	if (job.spec.audio) return buildAudioAttach(editor, job);
	if (job.spec.editProjectId) return buildHookEdit(editor, job, cache);
	return buildSingleEdit(editor, job);
}

/** Run any pending edit recipes for this owner. Returns how many were built. */
export async function materializePendingEdits(
	editor: EditorCore,
	owner: string,
): Promise<number> {
	if (typeof window === "undefined" || !owner) return 0;
	let jobs: EditJob[] = [];
	try {
		const r = await fetch("/api/brain/edits?status=pending");
		const d = (await r.json().catch(() => ({}))) as { jobs?: EditJob[] };
		jobs = d.jobs ?? [];
	} catch {
		return 0;
	}
	if (jobs.length === 0) return 0;

	// Visible progress — the build pulls media and can run a couple of minutes.
	const tid = "materialize-edits";
	toast.loading(`Building ${jobs.length} draft${jobs.length === 1 ? "" : "s"}…`, {
		id: tid,
	});

	const cache: AssetCache = new Map();
	let built = 0;
	let failed = 0;
	for (const job of jobs) {
		let result_project_id: string | null = null;
		let error: string | null = null;
		try {
			result_project_id = await buildOne(editor, job, cache);
			built++;
		} catch (e) {
			error = e instanceof Error ? e.message : "build failed";
			failed++;
		} finally {
			toast.loading(
				`Building drafts… ${built + failed}/${jobs.length}`,
				{ id: tid },
			);
			try {
				editor.project.closeProject();
			} catch {
				/* ignore */
			}
		}
		try {
			await fetch("/api/brain/edits", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					id: job.id,
					status: error ? "failed" : "done",
					result_project_id,
					error,
				}),
			});
		} catch {
			/* server keeps it pending; retried next load */
		}
	}

	const cat = jobs.find((j) => j.spec.category)?.spec.category;
	const where = cat ? ` — see the “${cat}” category` : "";
	if (failed > 0) {
		toast.error(`Built ${built}, ${failed} failed${where}`, { id: tid });
	} else {
		toast.success(
			`Built ${built} draft${built === 1 ? "" : "s"}${where}`,
			{ id: tid },
		);
	}
	return built;
}
