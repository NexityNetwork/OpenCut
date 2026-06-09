"use client";

// Canvas — the static multi-page design editor (Canva-style), separate from
// the video editor. Reuses the editor core (project/scenes/media/renderer),
// the assets + properties panels and the preview, but swaps the timeline for
// a Pages bar and exports stills (PNG / JPG / multi-page PDF) instead of video.

import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AssetsPanel } from "@/components/editor/panels/assets";
import { PropertiesPanel } from "@/components/editor/panels/properties";
import { PreviewPanel } from "@/preview/components";
import { EditorProvider } from "@/components/providers/editor-provider";
import { MigrationDialog } from "@/project/components/migration-dialog";
import { MobileGate } from "@/components/editor/mobile-gate";
import { useEditor } from "@/editor/use-editor";
import { cn } from "@/utils/ui";
import { generateUUID } from "@/utils/id";
import type { TScene, TimelineTrack } from "@/timeline/types";
import {
	exportPagesAsImages,
	exportPagesAsPdf,
	type CanvasExportFormat,
} from "@/canvas-editor/export";
import {
	ChevronLeft,
	Copy,
	Download,
	MoreHorizontal,
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
					<PagesBar />
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
			const scenes =
				scope === "all" ? all : [editor.scenes.getActiveScene()];
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

function CanvasLayout() {
	return (
		<ResizablePanelGroup
			direction="horizontal"
			className="size-full gap-[0.19rem] px-3 pb-1"
		>
			<ResizablePanel defaultSize={22} minSize={15} maxSize={40} className="min-w-0">
				<AssetsPanel />
			</ResizablePanel>

			<ResizableHandle withHandle />

			<ResizablePanel
				defaultSize={56}
				minSize={30}
				className="min-h-0 min-w-0 flex-1 [&_[data-preview-toolbar]]:hidden"
			>
				<PreviewPanel
					overlayControls={[]}
					overlayInstances={[]}
					onOverlayVisibilityChange={() => {}}
				/>
			</ResizablePanel>

			<ResizableHandle withHandle />

			<ResizablePanel defaultSize={22} minSize={18} maxSize={40} className="min-w-0">
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

function PagesBar() {
	const editor = useEditor();
	const scenes = useEditor((e) => e.scenes.getScenes());
	const active = useEditor((e) => e.scenes.getActiveSceneOrNull());
	const hasProject = !!useEditor((e) => e.project.getActiveOrNull());
	if (!hasProject) return null;

	const addPage = async () => {
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

	const duplicatePage = (scene: TScene) => {
		const copy = clonePageScene(scene);
		const index = scenes.findIndex((s) => s.id === scene.id);
		const next = [...scenes];
		next.splice(index + 1, 0, copy);
		editor.scenes.setScenes({ scenes: next, activeSceneId: copy.id });
		editor.save.markDirty({ force: true });
	};

	const renamePage = async (scene: TScene) => {
		const name = window.prompt("Rename page", scene.name);
		if (!name?.trim() || name === scene.name) return;
		await editor.scenes.renameScene({ sceneId: scene.id, name: name.trim() });
	};

	const deletePage = async (scene: TScene) => {
		try {
			await editor.scenes.deleteScene({ sceneId: scene.id });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't delete page");
		}
	};

	return (
		<div className="flex h-14 shrink-0 items-center gap-2 px-4">
			<span className="text-muted-foreground mr-1 text-xs font-medium">
				Pages
			</span>
			<div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-1">
				{scenes.map((scene, i) => {
					const isActive = active?.id === scene.id;
					return (
						<div
							key={scene.id}
							className={cn(
								"group/page flex shrink-0 items-center overflow-hidden rounded-lg border transition-colors",
								isActive
									? "border-primary bg-primary/10"
									: "border-border hover:bg-accent",
							)}
						>
							<button
								type="button"
								onClick={() => editor.scenes.switchToScene({ sceneId: scene.id })}
								className="flex items-center gap-1.5 py-1.5 pr-1 pl-3 text-sm"
							>
								<span
									className={cn(
										"text-xs font-semibold tabular-nums",
										isActive ? "text-primary" : "text-muted-foreground",
									)}
								>
									{i + 1}
								</span>
								<span className="max-w-32 truncate">{scene.name}</span>
							</button>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										aria-label={`Page ${i + 1} options`}
										className="text-muted-foreground hover:text-foreground mr-1 flex size-6 items-center justify-center rounded opacity-0 transition-opacity group-hover/page:opacity-100 data-[state=open]:opacity-100"
									>
										<MoreHorizontal className="size-3.5" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									<DropdownMenuItem onClick={() => renamePage(scene)}>
										<Pencil className="size-4" /> Rename
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => duplicatePage(scene)}>
										<Copy className="size-4" /> Duplicate
									</DropdownMenuItem>
									{!scene.isMain && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												variant="destructive"
												onClick={() => deletePage(scene)}
											>
												<Trash2 className="size-4" /> Delete
											</DropdownMenuItem>
										</>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					);
				})}
				<button
					type="button"
					onClick={addPage}
					className="text-muted-foreground hover:text-foreground border-border hover:bg-accent flex shrink-0 items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-sm transition-colors"
				>
					<Plus className="size-3.5" /> Add page
				</button>
			</div>
		</div>
	);
}
