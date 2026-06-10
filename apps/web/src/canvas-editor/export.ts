// Static export for Canvas (multi-page design) projects.
//
// Each page is a TScene rendered once at t=0 through the same
// buildScene + CanvasRenderer pipeline the editor preview and the
// project-thumbnail capture use, at the project's native canvas size.

import type { TProject } from "@/project/types";
import type { TScene } from "@/timeline/types";
import type { MediaAsset } from "@/media/types";
import { buildScene } from "@/services/renderer/scene-builder";
import { CanvasRenderer } from "@/services/renderer/canvas-renderer";

export type CanvasExportFormat = "png" | "jpg" | "pdf";

export async function renderPageToCanvas({
	project,
	scene,
	mediaAssets,
}: {
	project: TProject;
	scene: TScene;
	mediaAssets: MediaAsset[];
}): Promise<HTMLCanvasElement> {
	const { canvasSize, background, fps } = project.settings;

	const node = buildScene({
		tracks: scene.tracks,
		mediaAssets,
		duration: 1,
		canvasSize,
		background,
	});

	const renderer = new CanvasRenderer({
		width: canvasSize.width,
		height: canvasSize.height,
		fps,
	});

	const canvas = document.createElement("canvas");
	canvas.width = canvasSize.width;
	canvas.height = canvasSize.height;
	await renderer.renderToCanvas({ node, time: 0, targetCanvas: canvas });
	return canvas;
}

function canvasToBlob(
	canvas: HTMLCanvasElement,
	type: string,
	quality?: number,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))),
			type,
			quality,
		);
	});
}

function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function slugName(name: string): string {
	return (
		name
			.trim()
			.replace(/[^\w\d-]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 60) || "canvas"
	);
}

/** Downloads the given pages as individual PNG/JPG files. */
export async function exportPagesAsImages({
	project,
	scenes,
	mediaAssets,
	format,
	onProgress,
}: {
	project: TProject;
	scenes: TScene[];
	mediaAssets: MediaAsset[];
	format: "png" | "jpg";
	onProgress?: (done: number, total: number) => void;
}): Promise<void> {
	const base = slugName(project.metadata.name);
	const mime = format === "png" ? "image/png" : "image/jpeg";
	for (let i = 0; i < scenes.length; i++) {
		const canvas = await renderPageToCanvas({
			project,
			scene: scenes[i],
			mediaAssets,
		});
		const blob = await canvasToBlob(canvas, mime, 0.92);
		const suffix = scenes.length > 1 ? `-page-${i + 1}` : "";
		downloadBlob(blob, `${base}${suffix}.${format}`);
		onProgress?.(i + 1, scenes.length);
		// Give the browser a beat between multi-file downloads.
		if (i < scenes.length - 1) await new Promise((r) => setTimeout(r, 350));
	}
}

/** Builds a multi-page PDF blob (one page per scene). */
export async function buildPagesPdfBlob({
	project,
	scenes,
	mediaAssets,
	onProgress,
}: {
	project: TProject;
	scenes: TScene[];
	mediaAssets: MediaAsset[];
	onProgress?: (done: number, total: number) => void;
}): Promise<Blob> {
	const { PDFDocument } = await import("pdf-lib");
	const doc = await PDFDocument.create();
	const { width, height } = project.settings.canvasSize;

	for (let i = 0; i < scenes.length; i++) {
		const canvas = await renderPageToCanvas({
			project,
			scene: scenes[i],
			mediaAssets,
		});
		const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
		const bytes = new Uint8Array(await blob.arrayBuffer());
		const image = await doc.embedJpg(bytes);
		const page = doc.addPage([width, height]);
		page.drawImage(image, { x: 0, y: 0, width, height });
		onProgress?.(i + 1, scenes.length);
	}

	const pdfBytes = await doc.save();
	return new Blob([pdfBytes as unknown as BlobPart], {
		type: "application/pdf",
	});
}

/** Renders every page once and returns the PNG blobs (carousel upload). */
export async function renderPagesToBlobs({
	project,
	scenes,
	mediaAssets,
	onProgress,
}: {
	project: TProject;
	scenes: TScene[];
	mediaAssets: MediaAsset[];
	onProgress?: (done: number, total: number) => void;
}): Promise<Blob[]> {
	const blobs: Blob[] = [];
	for (let i = 0; i < scenes.length; i++) {
		const canvas = await renderPageToCanvas({
			project,
			scene: scenes[i],
			mediaAssets,
		});
		blobs.push(await canvasToBlob(canvas, "image/png"));
		onProgress?.(i + 1, scenes.length);
	}
	return blobs;
}

/** Builds a multi-page PDF (one page per scene) and downloads it. */
export async function exportPagesAsPdf({
	project,
	scenes,
	mediaAssets,
	onProgress,
}: {
	project: TProject;
	scenes: TScene[];
	mediaAssets: MediaAsset[];
	onProgress?: (done: number, total: number) => void;
}): Promise<void> {
	const blob = await buildPagesPdfBlob({
		project,
		scenes,
		mediaAssets,
		onProgress,
	});
	downloadBlob(blob, `${slugName(project.metadata.name)}.pdf`);
}
