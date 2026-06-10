"use client";

// Canvas — the static multi-page design editor (Canva-style), separate from
// the video editor. Reuses the editor core (project/scenes/media/renderer),
// the assets + properties panels and the preview. Pages are scenes: they
// stack vertically like Canva — the active page is the live interactive
// preview, the others are rendered snapshots you can click into.

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	ResizablePanelGroup,
	ResizablePanel,
	ResizableHandle,
} from "@/components/ui/resizable";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { AssetsPanel } from "@/components/editor/panels/assets";
import { useAssetsPanelStore } from "@/components/editor/panels/assets/assets-panel-store";
import { PropertiesPanel } from "@/components/editor/panels/properties";
import { PreviewPanel } from "@/preview/components";
import { EditorProvider } from "@/components/providers/editor-provider";
import { MigrationDialog } from "@/project/components/migration-dialog";
import { useEditor } from "@/editor/use-editor";
import { usePasteMedia } from "@/media/use-paste-media";
import { processMediaAssets } from "@/media/processing";
import {
	buildElementFromMedia,
	buildTextElement,
	buildStickerElement,
	buildGraphicElement,
} from "@/timeline/element-utils";
import {
	DEFAULT_NEW_ELEMENT_DURATION,
	toElementDurationTicks,
} from "@/timeline/creation";
import { mediaTimeFromSeconds } from "@/wasm";
import { AddMediaAssetCommand } from "@/commands/media";
import { InsertElementCommand } from "@/commands/timeline";
import { BatchCommand } from "@/commands";
import { cn } from "@/utils/ui";
import { useIsMobile } from "@/hooks/use-mobile";
import { generateUUID } from "@/utils/id";
import type { TScene, TimelineTrack } from "@/timeline/types";
import type { TimelineDragData } from "@/timeline/drag";
import {
	exportPagesAsImages,
	exportPagesAsPdf,
	buildPagesPdfBlob,
	renderPagesToBlobs,
	renderPageToCanvas,
	type CanvasExportFormat,
} from "@/canvas-editor/export";
import {
	uploadExportToVault,
	uploadCarouselToVault,
	composeUrlFor,
} from "@/canvas-editor/publish-export";
import { useSession } from "@/auth/client";
import { getVaultOwner } from "@/projects/vault-owner";
import {
	ArrowDown,
	ArrowUp,
	ChevronLeft,
	Copy,
	Download,
	Plus,
	Trash2,
} from "lucide-react";

export default function CanvasEditor() {
	const params = useParams();
	const projectId = params.project_id as string;

	return (
		<>
			<EditorProvider projectId={projectId}>
				<div className="bg-background flex h-screen w-screen flex-col overflow-hidden">
					<CanvasHeader />
					<div className="min-h-0 min-w-0 flex-1">
						<CanvasLayout />
					</div>
					<MigrationDialog />
				</div>
			</EditorProvider>
		</>
	);
}

function CanvasHeader() {
	const router = useRouter();
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActiveOrNull());
	const [exiting, setExiting] = useState(false);

	const exit = async () => {
		if (exiting) return;
		setExiting(true);
		try {
			// Untouched canvases are discarded instead of saved as clutter.
			const discarded = await editor.project.discardIfEmpty();
			if (!discarded) await editor.project.prepareExit();
		} catch {
			// best-effort: still close + leave
		} finally {
			editor.project.closeProject();
			router.push("/projects");
		}
	};

	return (
		<header className="bg-background flex h-[3.4rem] items-center justify-between px-3 pt-0.5">
			<div className="flex items-center gap-1.5">
				<Button
					variant="ghost"
					size="icon"
					className="size-8 rounded-sm"
					onClick={exit}
					disabled={exiting}
					aria-label="Back to library"
				>
					<ChevronLeft className="size-4" />
				</Button>
				<CanvasName />
				{activeProject && (
					<span className="bg-muted/50 text-muted-foreground rounded-full px-2.5 py-0.5 text-[11px] tabular-nums">
						{activeProject.settings.canvasSize.width} ×{" "}
						{activeProject.settings.canvasSize.height}
					</span>
				)}
			</div>
			<DownloadButton />
		</header>
	);
}

function CanvasName() {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActiveOrNull());
	const inputRef = useRef<HTMLInputElement>(null);
	const name = activeProject?.metadata.name ?? "";

	const save = async () => {
		const next = inputRef.current?.value.trim();
		if (!activeProject || !next || next === activeProject.metadata.name) return;
		try {
			await editor.project.renameProject({
				id: activeProject.metadata.id,
				name: next,
			});
		} catch {
			toast.error("Couldn't rename");
		}
	};

	return (
		<input
			ref={inputRef}
			key={name}
			type="text"
			defaultValue={name}
			onBlur={save}
			onKeyDown={(e) => e.key === "Enter" && inputRef.current?.blur()}
			style={{ fieldSizing: "content" } as React.CSSProperties}
			className="hover:bg-accent h-7 cursor-text rounded-sm bg-transparent px-2 text-sm font-medium outline-none"
		/>
	);
}

function DownloadButton() {
	const editor = useEditor();
	const router = useRouter();
	const { data: session } = useSession();
	const hasProject = !!useEditor((e) => e.project.getActiveOrNull());
	const pageCount = useEditor((e) => e.scenes.getScenes().length);
	const [open, setOpen] = useState(false);
	const [format, setFormat] = useState<CanvasExportFormat>("png");
	const [scope, setScope] = useState<"current" | "all">("all");
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState("");

	// Renders pages and hands the result to the Publishing composer.
	const publish = async (mode: "photo" | "carousel" | "pdf") => {
		const project = editor.project.getActiveOrNull();
		if (!project || busy) return;
		setBusy(true);
		setProgress("Rendering…");
		try {
			const mediaAssets = editor.media.getAssets();
			const owner = session?.user?.id || getVaultOwner();
			const name = project.metadata.name;
			const onProgress = (done: number, total: number) =>
				setProgress(`Rendering ${done}/${total}…`);
			let id: string;
			if (mode === "photo") {
				const [blob] = await renderPagesToBlobs({
					project,
					scenes: [editor.scenes.getActiveScene()],
					mediaAssets,
				});
				setProgress("Uploading…");
				id = await uploadExportToVault({
					owner,
					name,
					data: blob,
					ext: "png",
					contentType: "image/png",
					kind: "image",
				});
			} else if (mode === "carousel") {
				const blobs = await renderPagesToBlobs({
					project,
					scenes: editor.scenes.getScenes(),
					mediaAssets,
					onProgress,
				});
				id = await uploadCarouselToVault({
					owner,
					name,
					pages: blobs,
					onProgress: (d, t) => setProgress(`Uploading ${d}/${t}…`),
				});
			} else {
				const blob = await buildPagesPdfBlob({
					project,
					scenes: editor.scenes.getScenes(),
					mediaAssets,
					onProgress,
				});
				setProgress("Uploading…");
				id = await uploadExportToVault({
					owner,
					name,
					data: blob,
					ext: "pdf",
					contentType: "application/pdf",
					kind: "pdf",
				});
			}
			router.push(composeUrlFor(id));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't publish");
			setBusy(false);
			setProgress("");
		}
	};

	const run = async () => {
		const project = editor.project.getActiveOrNull();
		if (!project || busy) return;
		setBusy(true);
		setProgress("Rendering…");
		try {
			const all = editor.scenes.getScenes();
			const scenes = scope === "all" ? all : [editor.scenes.getActiveScene()];
			const onProgress = (done: number, total: number) =>
				setProgress(total > 1 ? `Rendering ${done}/${total}…` : "Rendering…");
			if (format === "pdf") {
				await exportPagesAsPdf({
					project,
					scenes,
					mediaAssets: editor.media.getAssets(),
					onProgress,
				});
			} else {
				await exportPagesAsImages({
					project,
					scenes,
					mediaAssets: editor.media.getAssets(),
					format,
					onProgress,
				});
			}
			toast.success("Downloaded");
			setOpen(false);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Export failed");
		} finally {
			setBusy(false);
			setProgress("");
		}
	};

	const formats: { k: CanvasExportFormat; label: string; hint: string }[] = [
		{ k: "png", label: "PNG", hint: "Best quality image" },
		{ k: "jpg", label: "JPG", hint: "Smaller file size" },
		{ k: "pdf", label: "PDF", hint: "All pages in one document" },
	];

	return (
		<Popover open={open} onOpenChange={(o) => !busy && setOpen(o)}>
			<PopoverTrigger asChild>
				<button
					type="button"
					disabled={!hasProject}
					className={cn(
						"inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-[13.5px] font-semibold text-black transition-colors hover:bg-white/90",
						!hasProject && "cursor-not-allowed opacity-50",
					)}
				>
					<Download className="size-3.5" />
					Export
				</button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-72 p-4">
				<div className="space-y-4">
					<div>
						<div className="text-muted-foreground mb-2 text-xs font-medium">
							Format
						</div>
						<div className="space-y-1">
							{formats.map((f) => (
								<button
									key={f.k}
									type="button"
									onClick={() => setFormat(f.k)}
									className={cn(
										"flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors",
										format === f.k
											? "border-primary bg-primary/10"
											: "border-border hover:bg-accent",
									)}
								>
									<span className="font-medium">{f.label}</span>
									<span className="text-muted-foreground text-xs">{f.hint}</span>
								</button>
							))}
						</div>
					</div>

					{pageCount > 1 && format !== "pdf" && (
						<div>
							<div className="text-muted-foreground mb-2 text-xs font-medium">
								Pages
							</div>
							<div className="flex gap-1.5">
								{(
									[
										{ k: "all", label: `All pages (${pageCount})` },
										{ k: "current", label: "Current page" },
									] as const
								).map((s) => (
									<button
										key={s.k}
										type="button"
										onClick={() => setScope(s.k)}
										className={cn(
											"flex-1 rounded-lg border px-2 py-1.5 text-xs transition-colors",
											scope === s.k
												? "border-primary bg-primary/10"
												: "border-border hover:bg-accent",
										)}
									>
										{s.label}
									</button>
								))}
							</div>
						</div>
					)}

					<Button className="w-full" onClick={run} disabled={busy}>
						{busy ? progress || "Rendering…" : "Download"}
					</Button>

					<div className="space-y-1.5 border-t pt-3">
						<div className="text-muted-foreground text-xs font-medium">
							Publish
						</div>
						<Button
							variant="outline"
							className="w-full rounded-md"
							onClick={() => publish("photo")}
							disabled={busy}
						>
							Current page as photo…
						</Button>
						{pageCount > 1 && (
							<Button
								variant="outline"
								className="w-full rounded-md"
								onClick={() => publish("carousel")}
								disabled={busy}
							>
								All pages as carousel…
							</Button>
						)}
						<Button
							variant="outline"
							className="w-full rounded-md"
							onClick={() => publish("pdf")}
							disabled={busy}
						>
							As PDF (LinkedIn)…
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

const CANVAS_HIDDEN_TABS = ["sounds", "effects", "reels", "captions"] as const;

const HIDE_VIDEO_TABS =
	"[&_[aria-label=Captions]]:hidden [&_[aria-label=Effects]]:hidden [&_[aria-label=Generate]]:hidden [&_[aria-label=Sounds]]:hidden";

function CanvasLayout() {
	usePasteMedia();
	const { activeTab, setActiveTab } = useAssetsPanelStore();
	const isMobile = useIsMobile();
	const [pane, setPane] = useState<"pages" | "add" | "style">("pages");

	// Canvas works with Media / Text / Presets / Project — land on Media and
	// keep the video-only tabs out of reach (they're CSS-hidden below too).
	useEffect(() => {
		if ((CANVAS_HIDDEN_TABS as readonly string[]).includes(activeTab)) {
			setActiveTab("media");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Phones can't fit three side-by-side panels; swap between them instead.
	// All three stay mounted so page snapshots / selections survive switches.
	if (isMobile) {
		const tabs = [
			{ key: "pages" as const, label: "Pages" },
			{ key: "add" as const, label: "Add" },
			{ key: "style" as const, label: "Style" },
		];
		return (
			<div className="flex size-full flex-col gap-2 px-2 pb-2">
				<div className="flex shrink-0 justify-center">
					<div className="flex gap-1 rounded-xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-1">
						{tabs.map((t) => (
							<button
								key={t.key}
								type="button"
								onClick={() => setPane(t.key)}
								className={cn(
									"rounded-lg px-4 py-1.5 text-[13px] font-medium transition-colors",
									pane === t.key
										? "bg-[var(--mono-active)] text-[var(--mono-ink)]"
										: "text-[var(--mono-ink-3)]",
								)}
							>
								{t.label}
							</button>
						))}
					</div>
				</div>
				<div
					className={cn(
						"min-h-0 flex-1",
						HIDE_VIDEO_TABS,
						pane !== "add" && "hidden",
					)}
				>
					<AssetsPanel />
				</div>
				<div className={cn("min-h-0 flex-1", pane !== "pages" && "hidden")}>
					<PagesStage />
				</div>
				<div className={cn("min-h-0 flex-1", pane !== "style" && "hidden")}>
					<PropertiesPanel />
				</div>
			</div>
		);
	}

	return (
		<ResizablePanelGroup
			direction="horizontal"
			className="size-full gap-[0.19rem] px-3 pb-3"
		>
			<ResizablePanel
				defaultSize={22}
				minSize={15}
				maxSize={40}
				className={cn("min-w-0", HIDE_VIDEO_TABS)}
			>
				<AssetsPanel />
			</ResizablePanel>

			<ResizableHandle withHandle />

			<ResizablePanel
				defaultSize={56}
				minSize={30}
				className="min-h-0 min-w-0 flex-1"
			>
				<PagesStage />
			</ResizablePanel>

			<ResizableHandle withHandle />

			<ResizablePanel
				defaultSize={22}
				minSize={18}
				maxSize={40}
				className="min-w-0"
			>
				<PropertiesPanel />
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}

function clonePageScene(scene: TScene): TScene {
	const cloneTrack = <T extends TimelineTrack>(track: T): T => {
		const copy = structuredClone(track) as T;
		copy.id = generateUUID();
		copy.elements = copy.elements.map((el) => ({
			...el,
			id: generateUUID(),
		})) as T["elements"];
		return copy;
	};
	return {
		...scene,
		id: generateUUID(),
		name: `${scene.name} copy`,
		isMain: false,
		tracks: {
			main: cloneTrack(scene.tracks.main),
			overlay: scene.tracks.overlay.map(cloneTrack),
			audio: scene.tracks.audio.map(cloneTrack),
		},
		bookmarks: [],
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

type Snap = { key: number; url: string };

function PagesStage() {
	const editor = useEditor();
	const scenes = useEditor((e) => e.scenes.getScenes());
	const active = useEditor((e) => e.scenes.getActiveSceneOrNull());
	const project = useEditor((e) => e.project.getActiveOrNull());
	const [snaps, setSnaps] = useState<Record<string, Snap>>({});
	const snapsRef = useRef(snaps);
	snapsRef.current = snaps;
	const renderBusyRef = useRef(false);
	const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const [dragOver, setDragOver] = useState(false);

	const sceneKey = (s: TScene) => Number(new Date(s.updatedAt)) || 0;

	const snapshot = async (scene: TScene) => {
		if (!project || renderBusyRef.current) return;
		renderBusyRef.current = true;
		try {
			const canvas = await renderPageToCanvas({
				project,
				scene,
				mediaAssets: editor.media.getAssets(),
			});
			const url = canvas.toDataURL("image/jpeg", 0.8);
			setSnaps((s) => ({ ...s, [scene.id]: { key: sceneKey(scene), url } }));
		} catch {
			// non-fatal: slot falls back to a blank page
		} finally {
			renderBusyRef.current = false;
		}
	};

	// Render snapshots for inactive pages that are missing or stale.
	// biome-ignore lint/correctness/useExhaustiveDependencies: keyed cache guards re-runs
	useEffect(() => {
		if (!project) return;
		let cancelled = false;
		(async () => {
			for (const s of scenes) {
				if (cancelled || s.id === active?.id) continue;
				if (snapsRef.current[s.id]?.key === sceneKey(s)) continue;
				await snapshot(s);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [scenes, active?.id, project?.metadata.id]);

	// Keep the active page in view when switching.
	useEffect(() => {
		if (!active) return;
		slotRefs.current[active.id]?.scrollIntoView({
			behavior: "smooth",
			block: "nearest",
		});
	}, [active?.id]);

	const selectPage = async (scene: TScene) => {
		if (scene.id === active?.id) return;
		// Capture the page we're leaving so its snapshot stays fresh.
		if (active) await snapshot(active);
		try {
			await editor.scenes.switchToScene({ sceneId: scene.id });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't switch page");
		}
	};

	// Append, or insert right below a given index when provided.
	const addPage = async (belowIndex?: number) => {
		if (active) await snapshot(active);
		try {
			const id = await editor.scenes.createScene({
				name: `Page ${scenes.length + 1}`,
				isMain: false,
			});
			if (belowIndex != null) {
				const list = editor.scenes.getScenes();
				const created = list.find((s) => s.id === id);
				if (created) {
					const without = list.filter((s) => s.id !== id);
					without.splice(belowIndex + 1, 0, created);
					editor.scenes.setScenes({ scenes: without, activeSceneId: id });
					editor.save.markDirty({ force: true });
					return;
				}
			}
			await editor.scenes.switchToScene({ sceneId: id });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't add page");
		}
	};

	const movePage = (scene: TScene, dir: -1 | 1) => {
		const index = scenes.findIndex((s) => s.id === scene.id);
		const target = index + dir;
		if (index < 0 || target < 0 || target >= scenes.length) return;
		const next = [...scenes];
		[next[index], next[target]] = [next[target], next[index]];
		editor.scenes.setScenes({ scenes: next, activeSceneId: active?.id });
		editor.save.markDirty({ force: true });
	};

	const duplicatePage = async (scene: TScene) => {
		if (active?.id === scene.id) await snapshot(scene);
		const copy = clonePageScene(scene);
		const index = scenes.findIndex((s) => s.id === scene.id);
		const next = [...scenes];
		next.splice(index + 1, 0, copy);
		editor.scenes.setScenes({ scenes: next, activeSceneId: copy.id });
		editor.save.markDirty({ force: true });
		const src = snapsRef.current[scene.id];
		if (src) {
			setSnaps((s) => ({ ...s, [copy.id]: { key: sceneKey(copy), url: src.url } }));
		}
	};

	const setPageTitle = async (scene: TScene, index: number, title: string) => {
		const name = title.trim() || `Page ${index + 1}`;
		if (name === scene.name) return;
		try {
			await editor.scenes.renameScene({ sceneId: scene.id, name });
		} catch {
			toast.error("Couldn't rename page");
		}
	};

	const deletePage = async (scene: TScene) => {
		try {
			await editor.scenes.deleteScene({ sceneId: scene.id });
			setSnaps((s) => {
				const { [scene.id]: _gone, ...rest } = s;
				return rest;
			});
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't delete page");
		}
	};

	// Drop media files anywhere on the stage to add them to the active page.
	const insertFiles = async (files: File[]) => {
		const proj = editor.project.getActiveOrNull();
		const media = files.filter((f) => /^(image|video|audio)\//.test(f.type));
		if (!proj || media.length === 0) return;
		const tid = toast.loading(
			`Adding ${media.length} file${media.length === 1 ? "" : "s"}…`,
		);
		try {
			const assets = await processMediaAssets({ files: media });
			const startTime = editor.playback.getCurrentTime();
			for (const asset of assets) {
				const addMediaCmd = new AddMediaAssetCommand({
					projectId: proj.metadata.id,
					asset,
				});
				const duration =
					asset.duration != null
						? mediaTimeFromSeconds({ seconds: asset.duration })
						: DEFAULT_NEW_ELEMENT_DURATION;
				const element = buildElementFromMedia({
					mediaId: addMediaCmd.getAssetId(),
					mediaType: asset.type,
					name: asset.name,
					duration,
					startTime,
				});
				const insertCmd = new InsertElementCommand({
					element,
					placement: {
						mode: "auto",
						trackType: asset.type === "audio" ? "audio" : "video",
					},
				});
				editor.command.execute({
					command: new BatchCommand([addMediaCmd, insertCmd]),
				});
			}
			toast.success(`Added to ${active?.name ?? "page"}`, { id: tid });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't add files", {
				id: tid,
			});
		}
	};

	// Drops that originate from the assets panel (media / text / stickers /
	// shapes) — same element builders the timeline's drop controller uses.
	const insertFromPanelDrag = (d: TimelineDragData) => {
		const startTime = editor.playback.getCurrentTime();
		switch (d.type) {
			case "media": {
				const asset = editor.media.getAssets().find((a) => a.id === d.id);
				if (!asset) return;
				editor.timeline.insertElement({
					element: buildElementFromMedia({
						mediaId: asset.id,
						mediaType: asset.type,
						name: asset.name,
						duration: toElementDurationTicks({ seconds: asset.duration }),
						startTime,
					}),
					placement: {
						mode: "auto",
						trackType: asset.type === "audio" ? "audio" : "video",
					},
				});
				break;
			}
			case "text": {
				editor.timeline.insertElement({
					element: buildTextElement({
						raw: { name: d.name ?? "", params: { content: d.content ?? "" } },
						startTime,
					}),
					placement: { mode: "auto", trackType: "text" },
				});
				break;
			}
			case "sticker": {
				editor.timeline.insertElement({
					element: buildStickerElement({
						stickerId: d.stickerId,
						name: d.name,
						startTime,
					}),
					placement: { mode: "auto", trackType: "graphic" },
				});
				break;
			}
			case "graphic": {
				editor.timeline.insertElement({
					element: buildGraphicElement({
						definitionId: d.definitionId,
						name: d.name,
						startTime,
						params: d.params,
					}),
					placement: { mode: "auto", trackType: "graphic" },
				});
				break;
			}
			case "effect":
				toast.message("Drop effects onto a clip in the video editor");
				break;
		}
	};

	const isDropAccepted = (e: React.DragEvent) =>
		editor.timeline.dragSource.isActive() ||
		e.dataTransfer.types.includes("Files");

	// One drop path for both sources; lands on `scene` (switching first) or
	// on the active page when dropped on stage padding.
	const handleDrop = async (e: React.DragEvent, scene?: TScene) => {
		const panelDrag = editor.timeline.dragSource.getActive();
		const hasFiles = e.dataTransfer.types.includes("Files");
		if (!panelDrag && !hasFiles) return;
		e.preventDefault();
		e.stopPropagation();
		setDragOver(false);
		if (scene && scene.id !== active?.id) await selectPage(scene);
		if (panelDrag) {
			insertFromPanelDrag(panelDrag);
		} else {
			await insertFiles(Array.from(e.dataTransfer.files));
		}
	};

	if (!project) {
		return (
			<div className="panel bg-background size-full rounded-sm border" />
		);
	}

	const { width, height } = project.settings.canvasSize;
	const aspect = `${width} / ${height}`;

	const isAutoName = (name: string) => /^Page \d+( copy)?$/.test(name);

	const headerBtn =
		"text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded hover:bg-accent disabled:pointer-events-none disabled:opacity-30";

	return (
		<div
			className={cn(
				"panel bg-background relative size-full overflow-y-auto rounded-sm border transition-shadow",
				dragOver && "ring-primary/50 ring-2 ring-inset",
			)}
			onDragOver={(e) => {
				if (isDropAccepted(e)) {
					e.preventDefault();
					setDragOver(true);
				}
			}}
			onDragLeave={(e) => {
				if (e.currentTarget === e.target) setDragOver(false);
			}}
			onDrop={(e) => void handleDrop(e)}
		>
			<div className="mx-auto flex max-w-3xl flex-col gap-4 px-6 py-6">
				{scenes.map((scene, i) => {
					const isActive = active?.id === scene.id;
					const snap = snaps[scene.id];
					return (
						<div
							key={scene.id}
							ref={(el) => {
								slotRefs.current[scene.id] = el;
							}}
							className="group/page"
						>
							{/* Canva-style page header: number, inline title, actions */}
							<div className="flex h-8 items-center gap-2 px-0.5">
								<button
									type="button"
									onClick={() => selectPage(scene)}
									className={cn(
										"shrink-0 text-xs font-semibold",
										isActive
											? "text-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									Page {i + 1}
								</button>
								<input
									key={`${scene.id}:${scene.name}`}
									type="text"
									defaultValue={isAutoName(scene.name) ? "" : scene.name}
									placeholder="Add page title"
									onFocus={() => selectPage(scene)}
									onBlur={(e) => setPageTitle(scene, i, e.target.value)}
									onKeyDown={(e) =>
										e.key === "Enter" && (e.target as HTMLInputElement).blur()
									}
									className="placeholder:text-muted-foreground/50 min-w-0 flex-1 bg-transparent text-xs outline-none"
								/>
								<div
									className={cn(
										"flex items-center gap-0.5 transition-opacity",
										isActive
											? "opacity-100"
											: "opacity-0 group-hover/page:opacity-100",
									)}
								>
									<button
										type="button"
										onClick={() => movePage(scene, -1)}
										disabled={i === 0}
										aria-label="Move page up"
										title="Move up"
										className={headerBtn}
									>
										<ArrowUp className="size-3.5" />
									</button>
									<button
										type="button"
										onClick={() => movePage(scene, 1)}
										disabled={i === scenes.length - 1}
										aria-label="Move page down"
										title="Move down"
										className={headerBtn}
									>
										<ArrowDown className="size-3.5" />
									</button>
									<button
										type="button"
										onClick={() => duplicatePage(scene)}
										aria-label="Duplicate page"
										title="Duplicate page"
										className={headerBtn}
									>
										<Copy className="size-3.5" />
									</button>
									<button
										type="button"
										onClick={() => deletePage(scene)}
										disabled={scene.isMain}
										aria-label="Delete page"
										title={scene.isMain ? "The first page can't be deleted" : "Delete page"}
										className={cn(headerBtn, "hover:text-destructive")}
									>
										<Trash2 className="size-3.5" />
									</button>
									<button
										type="button"
										onClick={() => addPage(i)}
										aria-label="Add page below"
										title="Add page below"
										className={headerBtn}
									>
										<Plus className="size-3.5" />
									</button>
								</div>
							</div>

							{isActive ? (
								<div
									style={{ aspectRatio: aspect }}
									className="ring-primary/60 w-full overflow-hidden rounded-md ring-2 [&_.panel]:rounded-none [&_.panel]:border-0 [&_[data-preview-frame]]:p-0 [&_[data-preview-toolbar]]:hidden"
									// Page scroll wins over the preview's internal zoom/pan.
									onWheelCapture={(e) => e.stopPropagation()}
									onDrop={(e) => void handleDrop(e, scene)}
									onDragOver={(e) => isDropAccepted(e) && e.preventDefault()}
								>
									<PreviewPanel
										overlayControls={[]}
										overlayInstances={[]}
										onOverlayVisibilityChange={() => {}}
									/>
								</div>
							) : (
								<button
									type="button"
									onClick={() => selectPage(scene)}
									style={{ aspectRatio: aspect }}
									className="border-border hover:ring-primary/40 block w-full overflow-hidden rounded-md border bg-white transition-shadow hover:ring-2"
									onDrop={(e) => void handleDrop(e, scene)}
									onDragOver={(e) => isDropAccepted(e) && e.preventDefault()}
								>
									{snap ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img
											src={snap.url}
											alt={scene.name}
											className="size-full object-cover"
											draggable={false}
										/>
									) : null}
								</button>
							)}
						</div>
					);
				})}

				<button
					type="button"
					onClick={() => addPage()}
					className="text-muted-foreground hover:text-foreground border-border hover:bg-accent mt-1 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed py-3 text-sm transition-colors"
				>
					<Plus className="size-4" /> Add page
				</button>
			</div>
		</div>
	);
}
