// Materializes AI-authored "edit recipes" into real editor projects, in the
// browser, using the exact builders the editor uses — so media binds (pulled
// from R2, the durable source) and every produced document is valid.
//
// Headless side (the AI) decides the edit and enqueues a recipe via
// /api/brain/edits. This runs when the library loads, turns each pending
// recipe into a real project, and marks it done. The new project appears in
// the library, openable, with the source video pulled from R2.

import type { EditorCore } from "@/core";
import { processMediaAssets } from "@/media/processing";
import { buildElementFromMedia, buildTextElement } from "@/timeline/element-utils";
import { mediaTimeFromSeconds } from "@/wasm";
import { fetchVaultItem, fileUrl } from "@/projects/vault-client";

type Overlay = {
	text: string;
	name?: string;
	fontFamily?: string;
	atSeconds?: number;
	durationSeconds?: number;
};
type EditSpec = {
	trim?: { start?: number; end?: number };
	overlays?: Overlay[];
	canvasSize?: { width: number; height: number };
};
type EditJob = {
	id: string;
	name: string;
	source_vault_id: string;
	spec: EditSpec;
};

async function buildOne(editor: EditorCore, job: EditJob): Promise<string> {
	const item = await fetchVaultItem(job.source_vault_id);
	if (!item) throw new Error("source asset not found");
	const m = item.media.find((x) => x.type === "video") ?? item.media[0];
	if (!m) throw new Error("source has no media");

	const projectId = await editor.project.createNewProject({
		name: job.name || `Edit of ${item.name}`,
		...(job.spec.canvasSize ? { canvasSize: job.spec.canvasSize } : {}),
	});

	// Pull the source bytes from R2 (the durable store) and ingest.
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

	// Text overlays — real text elements on their own track.
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

	let built = 0;
	for (const job of jobs) {
		let result_project_id: string | null = null;
		let error: string | null = null;
		try {
			result_project_id = await buildOne(editor, job);
			built++;
		} catch (e) {
			error = e instanceof Error ? e.message : "build failed";
		} finally {
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
			/* server will keep it pending; retried next load */
		}
	}
	return built;
}
