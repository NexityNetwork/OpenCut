"use client";

import { Button } from "../ui/button";
import { useRef, useState } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import Link from "next/link";
import { RenameProjectDialog } from "@/project/components/rename-project-dialog";
import { DeleteProjectDialog } from "@/project/components/delete-project-dialog";
import { useRouter } from "next/navigation";
import { ExportButton } from "./export-button";
import { toast } from "sonner";
import { useEditor } from "@/editor/use-editor";
import {
	ArrowUpRight01Icon,
	CommandIcon,
	Copy01Icon,
	Logout05Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ShortcutsDialog } from "@/actions/components/shortcuts-dialog";
import { cn } from "@/utils/ui";
import { ChevronLeft } from "lucide-react";

export function EditorHeader() {
	return (
		<header className="bg-background flex h-[3.4rem] items-center justify-between px-3 pt-0.5">
			<div className="flex items-center gap-1">
				<BackToLibrary />
				<ProjectDropdown />
				<EditableProjectName />
			</div>
			<nav className="flex items-center gap-2">
				<ExportButton />
			</nav>
		</header>
	);
}

// Return to the library on the tab the user came from (kept in sessionStorage
// by the library), so back doesn't dump them on the default "All" view.
function libraryHref(): string {
	if (typeof window === "undefined") return "/projects";
	try {
		const tab = sessionStorage.getItem("vault-active-tab");
		return tab ? `/projects?tab=${encodeURIComponent(tab)}` : "/projects";
	} catch {
		return "/projects";
	}
}

function BackToLibrary() {
	const router = useRouter();
	const editor = useEditor();
	const [exiting, setExiting] = useState(false);

	const exit = async () => {
		if (exiting) return;
		setExiting(true);
		try {
			const discarded = await editor.project.discardIfEmpty();
			if (!discarded) await editor.project.prepareExit();
		} catch (error) {
			console.error("Failed to prepare project exit:", error);
		} finally {
			editor.project.closeProject();
			router.push(libraryHref());
		}
	};

	return (
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
	);
}

function ProjectDropdown() {
	const [openDialog, setOpenDialog] = useState<
		"delete" | "rename" | "shortcuts" | null
	>(null);
	const [isExiting, setIsExiting] = useState(false);
	const [savingTemplate, setSavingTemplate] = useState(false);
	const router = useRouter();
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());

	const handleSaveAsTemplate = async () => {
		if (savingTemplate) return;
		setSavingTemplate(true);
		try {
			await editor.project.saveAsTemplate();
			toast.success("Saved as template", {
				description: "Find it under Templates in your library.",
			});
		} catch (error) {
			toast.error("Couldn't save template", {
				description:
					error instanceof Error ? error.message : "Please try again",
			});
		} finally {
			setSavingTemplate(false);
		}
	};

	const handleExit = async () => {
		if (isExiting) return;
		setIsExiting(true);

		try {
			// Untouched projects are discarded instead of saved as clutter.
			const discarded = await editor.project.discardIfEmpty();
			if (!discarded) await editor.project.prepareExit();
		} catch (error) {
			console.error("Failed to prepare project exit:", error);
		} finally {
			editor.project.closeProject();
			router.push(libraryHref());
		}
	};

	const handleSaveProjectName = async (newName: string) => {
		if (
			activeProject &&
			newName.trim() &&
			newName !== activeProject.metadata.name
		) {
			try {
				await editor.project.renameProject({
					id: activeProject.metadata.id,
					name: newName.trim(),
				});
			} catch (error) {
				toast.error("Failed to rename project", {
					description:
						error instanceof Error ? error.message : "Please try again",
				});
			} finally {
				setOpenDialog(null);
			}
		}
	};

	const handleDeleteProject = async () => {
		if (activeProject) {
			try {
				await editor.project.deleteProjects({
					ids: [activeProject.metadata.id],
				});
				router.push(libraryHref());
			} catch (error) {
				toast.error("Failed to delete project", {
					description:
						error instanceof Error ? error.message : "Please try again",
				});
			} finally {
				setOpenDialog(null);
			}
		}
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" size="icon" className="p-1 rounded-sm size-8">
						<img
							src="/newlogo.png"
							alt="Project thumbnail"
							width={32}
							height={32}
							className="size-5 rounded-sm"
						/>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="z-100 w-44">
					<DropdownMenuItem
						onClick={handleExit}
						disabled={isExiting}
						icon={<HugeiconsIcon icon={Logout05Icon} />}
					>
						Exit project
					</DropdownMenuItem>

					<DropdownMenuItem
						onClick={handleSaveAsTemplate}
						disabled={savingTemplate}
						icon={<HugeiconsIcon icon={Copy01Icon} />}
					>
						Save as template
					</DropdownMenuItem>

					<DropdownMenuItem
						onClick={() => setOpenDialog("shortcuts")}
						icon={<HugeiconsIcon icon={CommandIcon} />}
					>
						Shortcuts
					</DropdownMenuItem>

					<DropdownMenuSeparator />

					<DropdownMenuItem
						asChild
						icon={<HugeiconsIcon icon={ArrowUpRight01Icon} />}
					>
						<Link
							href="https://app.51ultron.com/dashboard/chat"
							target="_blank"
							rel="noopener noreferrer"
						>
							Ultron app
						</Link>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<RenameProjectDialog
				isOpen={openDialog === "rename"}
				onOpenChange={(isOpen) => setOpenDialog(isOpen ? "rename" : null)}
				onConfirm={(newName) => handleSaveProjectName(newName)}
				projectName={activeProject?.metadata.name || ""}
			/>
			<DeleteProjectDialog
				isOpen={openDialog === "delete"}
				onOpenChange={(isOpen) => setOpenDialog(isOpen ? "delete" : null)}
				onConfirm={handleDeleteProject}
				projectNames={[activeProject?.metadata.name || ""]}
			/>
			<ShortcutsDialog
				isOpen={openDialog === "shortcuts"}
				onOpenChange={(isOpen) => setOpenDialog(isOpen ? "shortcuts" : null)}
			/>
		</>
	);
}

function EditableProjectName() {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActive());
	const [isEditing, setIsEditing] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const originalNameRef = useRef("");

	const projectName = activeProject?.metadata.name || "";

	const startEditing = () => {
		if (isEditing) return;
		originalNameRef.current = projectName;
		setIsEditing(true);

		requestAnimationFrame(() => {
			inputRef.current?.select();
		});
	};

	const saveEdit = async () => {
		if (!inputRef.current || !activeProject) return;
		const newName = inputRef.current.value.trim();
		setIsEditing(false);

		if (!newName) {
			inputRef.current.value = originalNameRef.current;
			return;
		}

		if (newName !== originalNameRef.current) {
			try {
				await editor.project.renameProject({
					id: activeProject.metadata.id,
					name: newName,
				});
			} catch (error) {
				toast.error("Failed to rename project", {
					description:
						error instanceof Error ? error.message : "Please try again",
				});
			}
		}
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === "Enter") {
			event.preventDefault();
			inputRef.current?.blur();
		} else if (event.key === "Escape") {
			event.preventDefault();
			if (inputRef.current) {
				inputRef.current.value = originalNameRef.current;
				inputRef.current.setSelectionRange(0, 0);
			}
			setIsEditing(false);
			inputRef.current?.blur();
		}
	};

	return (
		<input
			ref={inputRef}
			type="text"
			defaultValue={projectName}
			readOnly={!isEditing}
			onClick={startEditing}
			onBlur={saveEdit}
			onKeyDown={handleKeyDown}
			style={{ fieldSizing: "content" }}
			className={cn(
				"text-[0.9rem] h-8 px-2 py-1 rounded-sm bg-transparent outline-none cursor-pointer hover:bg-accent hover:text-accent-foreground",
				isEditing && "ring-1 ring-ring cursor-text hover:bg-transparent",
			)}
		/>
	);
}
