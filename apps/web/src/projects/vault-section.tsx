"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	ArrowUp,
	Paperclip,
	Plus,
	Video as VideoIcon,
	Music2,
	Image as ImageIcon,
	Images as ImagesIcon,
	Play,
	Pause,
	MoreHorizontal,
	Trash2,
	Pencil,
	FolderPlus,
	LayoutGrid,
	Clapperboard,
	ChevronLeft,
	ChevronRight,
	X,
} from "lucide-react";
import {
	SiYoutube,
	SiYoutubemusic,
	SiSoundcloud,
	SiInstagram,
	SiTiktok,
	SiVimeo,
	SiX,
} from "react-icons/si";
import { Spinner } from "@/components/ui/spinner";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/ui";
import { useEditor } from "@/editor/use-editor";
import { processMediaAssets } from "@/media/processing";
import { useProjectsStore } from "@/app/projects/store";
import { getVaultOwner } from "@/projects/vault-owner";
import {
	type VaultItem,
	fetchVault,
	deleteVaultItem,
	renameVaultItem,
	importLinkToVault,
	migrateVaultOwner,
	uploadFilesToVault,
	fileUrl,
} from "@/projects/vault-client";
import { useSession } from "@/auth/client";
import type { TProjectMetadata, TProjectSortOption } from "@/project/types";

const PLATFORMS = [
	{ Icon: SiYoutube, label: "YouTube", color: "#FF0000" },
	{ Icon: SiYoutubemusic, label: "YouTube Music", color: "#FF0000" },
	{ Icon: SiSoundcloud, label: "SoundCloud", color: "#FF5500" },
	{ Icon: SiInstagram, label: "Instagram", color: "#E4405F" },
	{ Icon: SiTiktok, label: "TikTok", color: "#e8e8e8" },
	{ Icon: SiVimeo, label: "Vimeo", color: "#1AB7EA" },
	{ Icon: SiX, label: "X", color: "#e8e8e8" },
];

const TABS = [
	{ key: "all", label: "All", Icon: LayoutGrid },
	{ key: "projects", label: "Projects", Icon: Clapperboard },
	{ key: "video", label: "Videos", Icon: VideoIcon },
	{ key: "carousel", label: "Carousels", Icon: ImagesIcon },
	{ key: "audio", label: "Audio", Icon: Music2 },
	{ key: "image", label: "Images", Icon: ImageIcon },
] as const;

function fmtDate(d: Date | string | number) {
	try {
		return new Date(d).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	} catch {
		return "";
	}
}

const isUrl = (s: string) => /^https?:\/\//i.test(s) || /instagram\.com/i.test(s);

function fmtDur(s?: number) {
	if (!s) return null;
	const m = Math.floor(s / 60);
	const sec = Math.floor(s % 60);
	return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function VaultSection() {
	const editor = useEditor();
	const router = useRouter();
	const { setSearchQuery, searchQuery, sortKey, sortOrder } = useProjectsStore();
	const sortOption = `${sortKey}-${sortOrder}` as TProjectSortOption;
	const projects = useEditor((e) =>
		e.project.getFilteredAndSortedProjects({ searchQuery, sortOption }),
	);
	const isInitialized = useEditor((e) => e.project.getIsInitialized());
	const { data: session } = useSession();
	const userId = session?.user?.id;
	const [owner, setOwner] = useState("");
	const [items, setItems] = useState<VaultItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [text, setText] = useState("");
	const [busy, setBusy] = useState(false);
	const [activeTab, setActiveTab] = useState<string>("all");
	const [lightbox, setLightbox] = useState<VaultItem | null>(null);
	const [renaming, setRenaming] = useState<{
		id: string;
		name: string;
		kind: "vault" | "project";
	} | null>(null);
	const [playingId, setPlayingId] = useState<string | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [dragging, setDragging] = useState(false);

	useEffect(() => () => audioRef.current?.pause(), []);

	useEffect(() => {
		let cancelled = false;
		const anon = getVaultOwner();
		const o = userId || anon;
		setOwner(o);
		setLoading(true);
		(async () => {
			// First login on this device: claim its anonymous vault into the account.
			if (userId && anon && userId !== anon) {
				await migrateVaultOwner(anon, userId);
			}
			const next = await fetchVault(o).catch(() => [] as VaultItem[]);
			if (!cancelled) {
				setItems(next);
				setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [userId]);

	const onChange = (v: string) => {
		setText(v);
		setSearchQuery({ query: isUrl(v) ? "" : v });
	};

	const submit = async () => {
		const link = text.trim();
		if (!link || busy || !isUrl(link)) return;
		setBusy(true);
		const tid = toast.loading("Importing…");
		try {
			const item = await importLinkToVault(owner, link, "video");
			setItems((prev) => [item, ...prev]);
			toast.success(`Added "${item.name}" to your vault`, { id: tid });
			setText("");
			setSearchQuery({ query: "" });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Import failed", { id: tid });
		} finally {
			setBusy(false);
		}
	};

	const onFiles = async (list: FileList | File[] | null) => {
		const files = Array.from(list ?? []).filter((f) =>
			/^(video|image|audio)\//.test(f.type),
		);
		if (!files.length || busy || !owner) return;
		setBusy(true);
		const tid = toast.loading(
			`Uploading ${files.length} file${files.length > 1 ? "s" : ""}…`,
		);
		try {
			const added = await uploadFilesToVault(owner, files);
			setItems((prev) => [...added, ...prev]);
			toast.success(`Added ${added.length} to your vault`, { id: tid });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Upload failed", { id: tid });
		} finally {
			setBusy(false);
		}
	};

	const remove = async (item: VaultItem) => {
		setItems((prev) => prev.filter((x) => x.id !== item.id));
		if (playingId === item.id) {
			audioRef.current?.pause();
			setPlayingId(null);
		}
		try {
			await deleteVaultItem(owner, item.id);
		} catch {
			/* ignore */
		}
	};

	const doRename = async (name: string) => {
		if (!renaming) return;
		const { id, kind } = renaming;
		setRenaming(null);
		if (kind === "project") {
			await editor.project.renameProject({ id, name });
			return;
		}
		setItems((prev) => prev.map((x) => (x.id === id ? { ...x, name } : x)));
		try {
			await renameVaultItem(owner, id, name);
		} catch {
			/* ignore */
		}
	};

	const deleteProject = async (p: TProjectMetadata) => {
		if (!window.confirm(`Delete "${p.name}"? This can't be undone.`)) return;
		await editor.project.deleteProjects({ ids: [p.id] });
	};

	const togglePlay = (item: VaultItem) => {
		if (!audioRef.current) audioRef.current = new Audio();
		const a = audioRef.current;
		if (playingId === item.id) {
			a.pause();
			setPlayingId(null);
			return;
		}
		a.src = fileUrl(item.media[0].key);
		a.onended = () => setPlayingId(null);
		void a.play().catch(() => setPlayingId(null));
		setPlayingId(item.id);
	};

	const addToProject = async (item: VaultItem) => {
		const tid = toast.loading("Creating project…");
		try {
			const name = (item.name || "Imported").slice(0, 60);
			const projectId = await editor.project.createNewProject({ name });
			for (const m of item.media) {
				const blob = await (await fetch(fileUrl(m.key))).blob();
				const ext =
					m.ext || (m.type === "video" ? "mp4" : m.type === "audio" ? "mp3" : "jpg");
				const file = new File([blob], `${name}.${ext}`, {
					type: m.contentType || blob.type,
				});
				const [processed] = await processMediaAssets({ files: [file] });
				if (processed) {
					await editor.media.addMediaAsset({ projectId, asset: processed });
				}
			}
			toast.success("Project created", { id: tid });
			router.push(`/editor/${projectId}`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't create project", {
				id: tid,
			});
		}
	};

	const createBlankProject = async () => {
		const id = await editor.project.createNewProject({ name: "New project" });
		router.push(`/editor/${id}`);
	};

	const counts = useMemo(() => {
		const c: Record<string, number> = {
			all: items.length + projects.length,
			projects: projects.length,
		};
		for (const i of items) c[i.kind] = (c[i.kind] || 0) + 1;
		return c;
	}, [items, projects]);
	const q = isUrl(text) ? "" : text.trim().toLowerCase();
	const shownVault = useMemo(
		() =>
			activeTab === "projects"
				? []
				: items.filter(
						(i) =>
							(activeTab === "all" || i.kind === activeTab) &&
							(!q || i.name.toLowerCase().includes(q)),
					),
		[items, activeTab, q],
	);
	const shownProjects =
		activeTab === "all" || activeTab === "projects" ? projects : [];

	const urlMode = isUrl(text);

	return (
		<section
			className={cn(
				"px-8 transition-colors",
				dragging && "ring-primary/40 rounded-xl ring-2",
			)}
			onDragOver={(e) => {
				e.preventDefault();
				if (!dragging) setDragging(true);
			}}
			onDragLeave={(e) => {
				if (e.currentTarget === e.target) setDragging(false);
			}}
			onDrop={(e) => {
				e.preventDefault();
				setDragging(false);
				void onFiles(e.dataTransfer.files);
			}}
		>
			{/* Hero */}
			<div className="flex flex-col items-center pt-16 pb-2 sm:pt-24">
				<h1 className="text-foreground mb-6 text-center text-3xl font-semibold tracking-tight sm:text-4xl">
					What will you create today?
				</h1>
				<div className="w-full max-w-2xl">
					<div
						className={cn(
							"bg-card flex items-center gap-2 rounded-[1.75rem] border py-2 pr-2 pl-5 shadow-sm transition-colors",
							urlMode
								? "border-primary/60"
								: "border-border focus-within:border-foreground/30",
						)}
					>
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							disabled={busy}
							aria-label="Upload files to your vault"
							title="Upload files"
							className="text-muted-foreground hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-50"
						>
							<Paperclip className="size-4" />
						</button>
						<input
							ref={fileInputRef}
							type="file"
							multiple
							accept="video/*,image/*,audio/*"
							className="hidden"
							onChange={(e) => {
								void onFiles(e.target.files);
								e.currentTarget.value = "";
							}}
						/>
						<input
							value={text}
							onChange={(e) => onChange(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && urlMode) {
									e.preventDefault();
									void submit();
								}
							}}
							placeholder="Paste a link to import, or search your projects…"
							disabled={busy}
							className="placeholder:text-foreground/55 flex-1 bg-transparent py-1.5 text-base outline-none"
						/>
						<button
							type="button"
							onClick={() => void submit()}
							disabled={busy || !urlMode}
							aria-label="Import"
							className={cn(
								"flex size-9 shrink-0 items-center justify-center rounded-full transition-colors",
								urlMode
									? "bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground",
							)}
						>
							{busy ? <Spinner className="size-4" /> : <ArrowUp className="size-4" />}
						</button>
					</div>
					<div className="mt-3 flex items-center justify-between gap-3">
						<div className="flex flex-wrap items-center gap-2">
							{PLATFORMS.map((p) => (
								<span
									key={p.label}
									title={p.label}
									className="bg-muted/70 hover:bg-muted flex size-8 items-center justify-center rounded-full transition-colors"
								>
									<p.Icon className="block size-4" style={{ color: p.color }} />
								</span>
							))}
						</div>
						<button
							type="button"
							onClick={createBlankProject}
							className="bg-card hover:bg-muted text-foreground hidden shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors md:inline-flex"
						>
							<Plus className="size-4" />
							New project
						</button>
					</div>
				</div>
			</div>

			{/* Library — projects + vault, one tab bar, one grid */}
			<div className="mt-20">
				<div className="border-border/60 mb-8 flex items-center gap-1 overflow-x-auto border-b">
					{TABS.filter(
						(t) => t.key === "all" || t.key === "projects" || counts[t.key],
					).map((t) => (
						<button
							key={t.key}
							type="button"
							onClick={() => setActiveTab(t.key)}
							className={cn(
								"flex shrink-0 flex-col items-center gap-1.5 border-b-2 px-4 pb-3 text-xs font-medium transition-colors",
								activeTab === t.key
									? "border-foreground text-foreground"
									: "border-transparent text-muted-foreground hover:text-foreground",
							)}
						>
							<t.Icon className="size-5" />
							<span>
								{t.label}
								{counts[t.key] ? ` ${counts[t.key]}` : ""}
							</span>
						</button>
					))}
				</div>
				{(loading || !isInitialized) &&
				shownProjects.length === 0 &&
				shownVault.length === 0 ? (
					<div className="flex justify-center py-12">
						<Spinner className="text-muted-foreground size-5" />
					</div>
				) : shownProjects.length === 0 && shownVault.length === 0 ? (
					<div className="text-muted-foreground py-12 text-center text-sm">
						Nothing here yet — paste a link, upload a file, or start a new
						project.
					</div>
				) : (
					<div className="xs:grid-cols-2 grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-4">
						{shownProjects.map((p) => (
							<ProjectCard
								key={p.id}
								project={p}
								onOpen={() => router.push(`/editor/${p.id}`)}
								onRename={() =>
									setRenaming({ id: p.id, name: p.name, kind: "project" })
								}
								onDelete={() => deleteProject(p)}
							/>
						))}
						{shownVault.map((item) => (
							<VaultTile
								key={item.id}
								item={item}
								playing={playingId === item.id}
								onOpen={() =>
									item.kind === "audio" ? togglePlay(item) : setLightbox(item)
								}
								onAdd={() => addToProject(item)}
								onRename={() =>
									setRenaming({ id: item.id, name: item.name, kind: "vault" })
								}
								onRemove={() => remove(item)}
							/>
						))}
					</div>
				)}
			</div>

			{lightbox && <Lightbox item={lightbox} onClose={() => setLightbox(null)} />}
			<RenameDialog
				item={renaming}
				onClose={() => setRenaming(null)}
				onSave={doRename}
			/>
		</section>
	);
}

function ProjectCard({
	project,
	onOpen,
	onRename,
	onDelete,
}: {
	project: TProjectMetadata;
	onOpen: () => void;
	onRename: () => void;
	onDelete: () => void;
}) {
	return (
		<div className="group relative">
			<button type="button" onClick={onOpen} className="block w-full text-left">
				<div className="bg-muted relative aspect-video overflow-hidden rounded-xl border border-border/60 shadow-sm ring-1 ring-white/5 ring-inset transition-all duration-200 group-hover:border-border group-hover:shadow-xl group-hover:shadow-black/30">
					{project.thumbnail ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={project.thumbnail}
							alt={project.name}
							className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
							loading="lazy"
						/>
					) : (
						<div className="text-muted-foreground flex size-full items-center justify-center">
							<VideoIcon className="size-9" />
						</div>
					)}
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/25">
						<span className="translate-y-1 scale-95 rounded-full bg-white/15 px-5 py-2 text-sm font-medium text-white opacity-0 shadow-lg ring-1 ring-white/30 backdrop-blur-md transition-all duration-200 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
							Open
						</span>
					</div>
				</div>
			</button>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						aria-label="Project options"
						className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
					>
						<MoreHorizontal className="size-4" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={onRename}>
						<Pencil className="size-4" />
						Rename
					</DropdownMenuItem>
					<DropdownMenuItem variant="destructive" onClick={onDelete}>
						<Trash2 className="size-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<div className="flex items-start justify-between gap-2 px-0.5 pt-3">
				<div className="min-w-0">
					<h3
						className="line-clamp-1 text-sm leading-snug font-medium"
						title={project.name}
					>
						{project.name}
					</h3>
					<p className="text-muted-foreground mt-0.5 text-xs">
						Edited {fmtDate(project.updatedAt)}
					</p>
				</div>
				<span className="bg-muted/70 text-muted-foreground shrink-0 rounded-md px-2 py-0.5 text-xs">
					Project
				</span>
			</div>
		</div>
	);
}

function VaultTile({
	item,
	playing,
	onOpen,
	onAdd,
	onRename,
	onRemove,
}: {
	item: VaultItem;
	playing: boolean;
	onOpen: () => void;
	onAdd: () => void;
	onRename: () => void;
	onRemove: () => void;
}) {
	const thumb = item.thumbKey ? fileUrl(item.thumbKey) : item.thumbUrl;
	const KindIcon =
		item.kind === "audio"
			? Music2
			: item.kind === "carousel"
				? ImagesIcon
				: item.kind === "image"
					? ImageIcon
					: VideoIcon;
	const meta =
		item.kind === "carousel"
			? `${item.media.length} slides`
			: item.kind === "audio"
				? "Audio"
				: item.kind === "image"
					? "Image"
					: "Video";
	return (
		<div className="group relative">
			<button type="button" onClick={onOpen} className="block w-full text-left">
				<div className="bg-muted relative aspect-video overflow-hidden rounded-xl border border-border/60 shadow-sm ring-1 ring-white/5 ring-inset transition-all duration-200 group-hover:border-border group-hover:shadow-xl group-hover:shadow-black/30">
					{thumb ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={thumb}
							alt={item.name}
							className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
							loading="lazy"
						/>
					) : item.kind === "audio" ? (
						<div className="from-primary/25 absolute inset-0 flex items-center justify-center bg-gradient-to-br to-transparent">
							<Music2 className="text-foreground/70 size-9" />
						</div>
					) : (
						<div className="text-muted-foreground flex size-full items-center justify-center">
							<KindIcon className="size-9" />
						</div>
					)}

					<div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/25">
						<span className="translate-y-1 scale-95 rounded-full bg-white/15 px-5 py-2 text-sm font-medium text-white opacity-0 shadow-lg ring-1 ring-white/30 backdrop-blur-md transition-all duration-200 group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100">
							{item.kind === "audio" ? (playing ? "Pause" : "Play") : "Open"}
						</span>
					</div>

					{item.kind === "carousel" && (
						<span className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-black/65 px-1.5 py-0.5 text-xs text-white backdrop-blur-sm">
							<ImagesIcon className="size-3" />
							{item.media.length}
						</span>
					)}
					{item.kind === "video" && fmtDur(item.durationSec) && (
						<span className="absolute right-2 bottom-2 rounded-md bg-black/65 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
							{fmtDur(item.durationSec)}
						</span>
					)}
					{item.kind === "audio" && (
						<span className="absolute right-2 bottom-2 text-white/90">
							{playing ? <Pause className="size-4" /> : <Play className="size-4" />}
						</span>
					)}
				</div>
			</button>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						aria-label="Asset options"
						className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
					>
						<MoreHorizontal className="size-4" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={onAdd}>
						<FolderPlus className="size-4" />
						Add to new project
					</DropdownMenuItem>
					<DropdownMenuItem onClick={onRename}>
						<Pencil className="size-4" />
						Rename
					</DropdownMenuItem>
					<DropdownMenuItem variant="destructive" onClick={onRemove}>
						<Trash2 className="size-4" />
						Delete
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<div className="flex items-start justify-between gap-2 px-0.5 pt-3">
				<div className="min-w-0">
					<h3
						className="line-clamp-1 text-sm leading-snug font-medium"
						title={item.name}
					>
						{item.name}
					</h3>
					<p className="text-muted-foreground mt-0.5 text-xs capitalize">
						{item.source || meta}
					</p>
				</div>
				<span className="bg-muted/70 text-muted-foreground shrink-0 rounded-md px-2 py-0.5 text-xs capitalize">
					{item.kind}
				</span>
			</div>
		</div>
	);
}

function RenameDialog({
	item,
	onClose,
	onSave,
}: {
	item: { name: string } | null;
	onClose: () => void;
	onSave: (name: string) => void;
}) {
	const [value, setValue] = useState("");
	useEffect(() => {
		if (item) setValue(item.name);
	}, [item]);
	return (
		<Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Rename</DialogTitle>
				</DialogHeader>
				<Input
					value={value}
					onChange={(e) => setValue(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && value.trim()) onSave(value.trim());
					}}
					autoFocus
				/>
				<DialogFooter>
					<Button variant="text" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={() => value.trim() && onSave(value.trim())}>Save</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function Lightbox({ item, onClose }: { item: VaultItem; onClose: () => void }) {
	const [i, setI] = useState(0);
	const media = item.media;
	const idx = Math.min(i, media.length - 1);
	const cur = media[idx];

	useEffect(() => {
		for (const m of media) {
			if (m.type !== "video") {
				const img = new Image();
				img.src = fileUrl(m.key);
			}
		}
	}, [media]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
			if (media.length > 1 && e.key === "ArrowRight")
				setI((p) => (p + 1) % media.length);
			if (media.length > 1 && e.key === "ArrowLeft")
				setI((p) => (p - 1 + media.length) % media.length);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [media.length, onClose]);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
			onClick={onClose}
		>
			<button
				type="button"
				onClick={onClose}
				aria-label="Close"
				className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
			>
				<X className="size-5" />
			</button>

			<div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
				{media.length > 1 && (
					<button
						type="button"
						onClick={() => setI((idx - 1 + media.length) % media.length)}
						aria-label="Previous"
						className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
					>
						<ChevronLeft className="size-5" />
					</button>
				)}

				<div className="relative flex max-h-[85vh] items-center justify-center">
					{cur.type === "video" ? (
						// biome-ignore lint/a11y/useMediaCaption: user media
						<video
							src={fileUrl(cur.key)}
							controls
							autoPlay
							controlsList="nodownload noplaybackrate noremoteplayback"
							disablePictureInPicture
							className="max-h-[85vh] max-w-[80vw] rounded-lg"
						/>
					) : (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={fileUrl(cur.key)}
							alt={item.name}
							className="max-h-[85vh] max-w-[80vw] rounded-lg object-contain"
						/>
					)}
					{media.length > 1 && (
						<div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs text-white">
							{idx + 1} / {media.length}
						</div>
					)}
				</div>

				{media.length > 1 && (
					<button
						type="button"
						onClick={() => setI((idx + 1) % media.length)}
						aria-label="Next"
						className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
					>
						<ChevronRight className="size-5" />
					</button>
				)}
			</div>
		</div>
	);
}
