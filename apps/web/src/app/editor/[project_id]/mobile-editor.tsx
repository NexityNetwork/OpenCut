"use client";

// Touch-first mobile editor. Reuses the exact same engine + stores as the
// desktop editor (EditorProvider / PreviewPanel / Timeline / AssetsPanel /
// PropertiesPanel) but in a vertical, bottom-tab layout. The desktop editor
// (./editor-app) is intentionally left untouched; editor-router picks which
// one to render based on viewport.

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { EditorProvider } from "@/components/providers/editor-provider";
import { PreviewPanel } from "@/preview/components";
import { Timeline } from "@/timeline/components";
import { AssetsPanel } from "@/components/editor/panels/assets";
import { PropertiesPanel } from "@/components/editor/panels/properties";
import { ExportButton } from "@/components/editor/export-button";
import { MigrationDialog } from "@/project/components/migration-dialog";
import { usePasteMedia } from "@/media/use-paste-media";
import { useEditor } from "@/editor/use-editor";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LayoutGrid, SlidersHorizontal, X } from "lucide-react";

type SheetKey = "tools" | "properties" | null;

export default function MobileEditor() {
	const params = useParams();
	const projectId = params.project_id as string;

	return (
		<EditorProvider projectId={projectId}>
			<MobileEditorShell />
		</EditorProvider>
	);
}

function MobileEditorShell() {
	const router = useRouter();
	usePasteMedia();
	const projectName =
		useEditor((e) => e.project.getActiveOrNull()?.metadata.name) ??
		"Untitled project";
	const [sheet, setSheet] = useState<SheetKey>(null);

	return (
		<div className="bg-background flex h-[100svh] w-screen flex-col overflow-hidden">
			{/* Top bar */}
			<header className="flex h-12 shrink-0 items-center justify-between gap-2 px-3">
				<button
					type="button"
					aria-label="Close editor"
					onClick={() => router.push("/projects")}
					className="text-muted-foreground hover:text-foreground -ml-1 rounded-full p-1.5"
				>
					<X className="size-5" />
				</button>
				<span className="truncate px-2 text-sm font-medium">{projectName}</span>
				<ExportButton />
			</header>

			{/* Vertical preview */}
			<div className="relative min-h-0 flex-[3] overflow-hidden">
				<PreviewPanel
					overlayControls={[]}
					overlayInstances={[]}
					onOverlayVisibilityChange={() => {}}
				/>
			</div>

			{/* Timeline — gets a real share of the screen so the video/audio
			    tracks are visible; the Timeline's own ScrollArea handles overflow. */}
			<div className="min-h-0 flex-[2] border-t">
				<Timeline />
			</div>

			{/* Bottom tool bar */}
			<nav className="bg-background flex h-16 shrink-0 items-center justify-around border-t pb-[env(safe-area-inset-bottom)]">
				<ToolButton label="Tools" onClick={() => setSheet("tools")}>
					<LayoutGrid className="size-5" />
				</ToolButton>
				<ToolButton label="Adjust" onClick={() => setSheet("properties")}>
					<SlidersHorizontal className="size-5" />
				</ToolButton>
			</nav>

			{/* Bottom sheet hosting the existing panels */}
			<Sheet
				open={sheet !== null}
				onOpenChange={(open) => !open && setSheet(null)}
			>
				<SheetContent
					side="bottom"
					className="flex h-[72svh] flex-col p-0"
				>
					<SheetTitle className="sr-only">
						{sheet === "tools" ? "Tools" : "Adjust"}
					</SheetTitle>
					<div className="min-h-0 flex-1 overflow-y-auto">
						{sheet === "tools" && <AssetsPanel />}
						{sheet === "properties" && <PropertiesPanel />}
					</div>
				</SheetContent>
			</Sheet>

			<MigrationDialog />
		</div>
	);
}

function ToolButton({
	label,
	onClick,
	children,
}: {
	label: string;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="text-muted-foreground hover:text-foreground flex flex-col items-center gap-1 px-4 py-1 text-[11px] font-medium"
		>
			{children}
			{label}
		</button>
	);
}
