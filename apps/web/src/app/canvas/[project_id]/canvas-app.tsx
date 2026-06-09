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
import { MobileGate } from "@/components/editor/mobile-gate";
import { useEditor } from "@/editor/use-editor";
import { usePasteMedia } from "@/media/use-paste-media";
import { processMediaAssets } from "@/media/processing";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { DEFAULT_NEW_ELEMENT_DURATION } from "@/timeline/creation";
import { mediaTimeFromSeconds } from "@/wasm";
import { AddMediaAssetCommand } from "@/commands/media";
import { InsertElementCommand } from "@/commands/timeline";
import { BatchCommand } from "@/commands";
import { cn } from "@/utils/ui";
import { generateUUID } from "@/utils/id";
import type { TScene, TimelineTrack } from "@/timeline/types";
import {
	exportPagesAsImages,
	exportPagesAsPdf,
	renderPageToCanvas,
	type CanvasExportFormat,
} from "@/canvas-editor/export";
import {
	ChevronLeft,
	Copy,
	Download,
	Pencil,
	Plus,
	Trash2,
} from "lucide-react";

export default function CanvasEditor() {
	const params = useParams();
	const projectId = params.project_id as string;

	return (
		<MobileGate>
			<EditorProvider projectId={projectId}>
				<div className="bg-background flex h-screen w-screen flex-col overflow-hidden">
					<CanvasHeader />
					<div className="min-h-0 min-w-0 flex-1">
						<CanvasLayout />
					</div>
					<MigrationDialog />
				</div>
			</EditorProvider>
		</MobileGate>
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
			await editor.project.prepareExit();
		} catch {
			// best-effort: still close + leave
		} finally {
			editor.project.closeProject();
			router.push("/projects");
		}
	};

	return (
		<header className="bg-background flex h-[3.4rem] items-center justify-between px-3 pt-0.5">
			<div className="flex items-center gap-1">
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
					<span className="text-muted-foreground ml-1 text-xs">
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
			className="hover:bg-accent h-8 cursor-text rounded-sm bg-transparent px-2 py-1 text-[0.9rem] outline-none"
		/>
	);
}

function DownloadButton() {
	const editor = useEditor();
	const hasProject = !!useEditor((e) => e.project.getActiveOrNull());
	const pageCount = useEditor((e) => e.scenes.getScenes().length);
	const [open, setOpen] = useState(false);
	const [format, setFormat] = useState<CanvasExportFormat>("png");
	const [scope, setScope] = useState<"current" | "all">("all");
	const [busy, setBusy] = useState(false);
	const [progress, setProgress] = useState("");

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
					Download
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
				</div>
			</PopoverContent>
		</Popover>
	);
}

const CANVAS_HIDDEN_TABS = ["sounds", "effects", "reels", "captions"] as const;

function CanvasLayout() {
	usePasteMedia();
	const { activeTab, setActiveTab } = useAssetsPanelStore();

	// Canvas works with Media / Text / Presets / Project — land on Media and
	// keep the video-only tabs out of reach (they're CSS-hidden below too).
	useEffect(() => {
		if ((CANVAS_HIDDEN_TABS as readonly string[]).includes(activeTab)) {
			setActiveTab("media");
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<ResizablePanelGroup
			direction="horizontal"
			className="size-full gap-[0.19rem] px-3 pb-3"
		>
			<ResizablePanel
				defaultSize={22}
				minSize={15}
				maxSize={40}
				className="min-w-0 [&_[aria-label=Captions]]:hidden [&_[aria-label=Effects]]:hidden [&_[aria-label=Generate]]:hidden [&_[aria-label=Sounds]]:hidden"
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

	const addPage = async () => {
		if (active) await snapshot(active);
		try {
			const id = await editor.scenes.createScene({
				name: `Page ${scenes.length + 1}`,
				isMain: false,
			});
			await editor.scenes.switchToScene({ sceneId: id });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't add page");
		}
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

	const renamePage = async (scene: TScene) => {
		const name = window.prompt("Rename page", scene.name);
		if (!name?.trim() || name === scene.name) return;
		await editor.scenes.renameScene({ sceneId: scene.id, name: name.trim() });
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

	if (!project) {
		return (
			<div className="panel bg-background size-full rounded-sm border" />
		);
	}

	const { width, height } = project.settings.canvasSize;
	const aspect = `${width} / ${height}`;

	return (
		<div
			className={cn(
				"panel bg-background relative size-full overflow-y-auto rounded-sm border transition-shadow",
				dragOver && "ring-primary/50 ring-2 ring-inset",
			)}
			onDragOver={(e) => {
				if (e.dataTransfer.types.includes("Files")) {
					e.preventDefault();
					setDragOver(true);
				}
			}}
			onDragLeave={(e) => {
				if (e.currentTarget === e.target) setDragOver(false);
			}}
			onDrop={(e) => {
				if (e.dataTransfer.types.includes("Files")) {
					e.preventDefault();
					setDragOver(false);
					void insertFiles(Array.from(e.dataTransfer.files));
				}
			}}
		>
			<div className="mx-auto flex max-w-3xl flex-col gap-2 px-6 py-6">
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
							<div className="flex h-7 items-center gap-1.5 px-0.5">
								<button
									type="button"
									onClick={() => selectPage(scene)}
									className={cn(
										"text-xs font-medium",
										isActive
											? "text-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									{i + 1} · {scene.name}
								</button>
								<div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover/page:opacity-100">
									<button
										type="button"
										onClick={() => renamePage(scene)}
										aria-label="Rename page"
										className="text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded hover:bg-accent"
									>
										<Pencil className="size-3" />
									</button>
									<button
										type="button"
										onClick={() => duplicatePage(scene)}
										aria-label="Duplicate page"
										className="text-muted-foreground hover:text-foreground flex size-6 items-center justify-center rounded hover:bg-accent"
									>
										<Copy className="size-3" />
									</button>
									{!scene.isMain && (
										<button
											type="button"
											onClick={() => deletePage(scene)}
											aria-label="Delete page"
											className="text-muted-foreground hover:text-destructive flex size-6 items-center justify-center rounded hover:bg-accent"
										>
											<Trash2 className="size-3" />
										</button>
									)}
								</div>
							</div>

							{isActive ? (
								<div
									style={{ aspectRatio: aspect }}
									className="ring-primary/60 w-full overflow-hidden rounded-md ring-2 [&_[data-preview-toolbar]]:hidden"
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
					onClick={addPage}
					className="text-muted-foreground hover:text-foreground border-border hover:bg-accent mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed py-3 text-sm transition-colors"
				>
					<Plus className="size-4" /> Add page
				</button>
			</div>
		</div>
	);
}
