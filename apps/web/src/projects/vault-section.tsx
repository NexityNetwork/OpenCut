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
	Tag,
	Quote,
	Copy,
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
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogBody,
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
	setVaultItemTags,
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

// Reveals true once the element scrolls within `rootMargin` of the viewport.
function useInView<T extends Element>(rootMargin = "500px") {
	const ref = useRef<T | null>(null);
	const [inView, setInView] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (!el || inView) return;
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					setInView(true);
					io.disconnect();
				}
			},
			{ rootMargin },
		);
		io.observe(el);
		return () => io.disconnect();
	}, [inView, rootMargin]);
	return { ref, inView };
}

// Lazy first-frame preview for videos with no poster — only mounts the <video>
// (which triggers a metadata fetch + decode) once it's near the viewport, so a
// gallery of 100+ clips doesn't try to decode them all at once.
function VideoThumb({ src, className }: { src: string; className?: string }) {
	const { ref, inView } = useInView<HTMLDivElement>();
	return (
		<div ref={ref} className="absolute inset-0">
			{inView ? (
				// biome-ignore lint/a11y/useMediaCaption: thumbnail preview only
				<video
					src={`${src}#t=0.1`}
					preload="metadata"
					muted
					playsInline
					className={className}
				/>
			) : (
				<div className="bg-muted text-muted-foreground flex size-full items-center justify-center">
					<VideoIcon className="size-9" />
				</div>
			)}
		</div>
	);
}

export function VaultSection() {
	const editor = useEditor();
	const router = useRouter();
	const { setSearchQuery, searchQuery, sortKey, sortOrder, viewMode, isHydrated } =
		useProjectsStore();
	const listView = isHydrated && viewMode === "list";
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
	const [catFor, setCatFor] = useState<VaultItem | null>(null);
	const [renamingCat, setRenamingCat] = useState<string | null>(null);
	const [captionItem, setCaptionItem] = useState<VaultItem | null>(null);
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

	// Custom categories live as durable tags on each vault item (stored in D1).
	const setItemTags = async (id: string, tags: string[]) => {
		setItems((prev) => prev.map((x) => (x.id === id ? { ...x, tags } : x)));
		try {
			await setVaultItemTags(owner, id, tags);
		} catch {
			/* ignore */
		}
	};

	const toggleCategory = (item: VaultItem, cat: string) => {
		const current = item.tags ?? [];
		const next = current.includes(cat)
			? current.filter((t) => t !== cat)
			: [...current, cat];
		void setItemTags(item.id, next);
	};

	const addCategory = (name: string) => {
		const target = catFor;
		setCatFor(null);
		const cat = name.trim();
		if (!target || !cat) return;
		const live = items.find((x) => x.id === target.id) ?? target;
		if ((live.tags ?? []).includes(cat)) return;
		void setItemTags(target.id, [...(live.tags ?? []), cat]);
	};

	// Rename a category across every item that uses it (durable in D1).
	const renameCategory = (oldName: string, newName: string) => {
		const nn = newName.trim();
		setRenamingCat(null);
		if (!nn || nn === oldName) return;
		for (const i of items) {
			if (!(i.tags ?? []).includes(oldName)) continue;
			const next = Array.from(
				new Set((i.tags ?? []).map((t) => (t === oldName ? nn : t))),
			);
			void setItemTags(i.id, next);
		}
		if (activeTab === `cat:${oldName}`) setActiveTab(`cat:${nn}`);
	};

	// Remove a category from every item (items are kept; only the tag is dropped).
	const deleteCategory = (name: string) => {
		const n = catCounts[name] || 0;
		if (
			!window.confirm(
				`Remove the "${name}" category from ${n} item${n === 1 ? "" : "s"}? The ${n === 1 ? "item stays" : "items stay"} — only the category label is removed.`,
			)
		)
			return;
		for (const i of items) {
			if (!(i.tags ?? []).includes(name)) continue;
			void setItemTags(
				i.id,
				(i.tags ?? []).filter((t) => t !== name),
			);
		}
		if (activeTab === `cat:${name}`) setActiveTab("all");
	};

	const copyCaption = async (item: VaultItem) => {
		if (!item.caption) return;
		try {
			await navigator.clipboard.writeText(item.caption);
			toast.success("Caption copied");
		} catch {
			toast.error("Couldn't copy caption");
		}
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
	const { categories, catCounts } = useMemo(() => {
		const cc: Record<string, number> = {};
		for (const i of items) {
			for (const t of i.tags ?? []) cc[t] = (cc[t] || 0) + 1;
		}
		return {
			categories: Object.keys(cc).sort((a, b) => a.localeCompare(b)),
			catCounts: cc,
		};
	}, [items]);
	// Fall back to "All" if the selected category was emptied out.
	useEffect(() => {
		if (
			activeTab.startsWith("cat:") &&
			!categories.includes(activeTab.slice(4))
		) {
			setActiveTab("all");
		}
	}, [categories, activeTab]);
	const q = isUrl(text) ? "" : text.trim().toLowerCase();
	const shownVault = useMemo(() => {
		if (activeTab === "projects") return [];
		const cat = activeTab.startsWith("cat:") ? activeTab.slice(4) : null;
		return items.filter(
			(i) =>
				(cat
					? (i.tags ?? []).includes(cat)
					: activeTab === "all" || i.kind === activeTab) &&
				(!q || i.name.toLowerCase().includes(q)),
		);
	}, [items, activeTab, q]);
	const shownProjects =
		activeTab === "all" || activeTab === "projects" ? projects : [];

	const urlMode = isUrl(text);

	// One uniform model for every tab so built-ins and categories render identically.
	const navTabs: {
		key: string;
		label: string;
		Icon: typeof Tag;
		count: number;
		cat: string;
	}[] = [
		...TABS.filter(
			(t) => t.key === "all" || t.key === "projects" || counts[t.key],
		).map((t) => ({
			key: t.key,
			label: t.label,
			Icon: t.Icon,
			count: counts[t.key] || 0,
			cat: "",
		})),
		...categories.map((c) => ({
			key: `cat:${c}`,
			label: c,
			Icon: Tag,
			count: catCounts[c] || 0,
			cat: c,
		})),
	];

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
				<div className="border-border/60 mb-8 flex items-stretch gap-0.5 overflow-x-auto border-b">
					{navTabs.map((t) => {
						const active = activeTab === t.key;
						return (
							<div key={t.key} className="group/tab relative shrink-0">
								<button
									type="button"
									onClick={() => setActiveTab(t.key)}
									title={t.label}
									className={cn(
										"flex flex-col items-center gap-1.5 border-b-2 px-4 pb-3 pt-1 text-xs font-medium transition-colors",
										t.cat && "pr-6",
										active
											? "border-foreground text-foreground"
											: "border-transparent text-muted-foreground hover:text-foreground",
									)}
								>
									<t.Icon className="size-5" strokeWidth={1.75} />
									<span className="flex max-w-[10rem] items-baseline gap-1">
										<span className="truncate">{t.label}</span>
										{t.count > 0 && (
											<span className="text-muted-foreground/50 text-[11px] font-normal tabular-nums">
												{t.count}
											</span>
										)}
									</span>
								</button>
								{t.cat && (
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<button
												type="button"
												aria-label={`Manage "${t.cat}" category`}
												className={cn(
													"text-muted-foreground hover:text-foreground hover:bg-muted absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded-md transition-opacity",
													active
														? "opacity-100"
														: "opacity-0 group-hover/tab:opacity-100",
												)}
											>
												<MoreHorizontal className="size-3.5" />
											</button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem onClick={() => setRenamingCat(t.cat)}>
												<Pencil className="size-4" />
												Rename category
											</DropdownMenuItem>
											<DropdownMenuItem
												variant="destructive"
												onClick={() => deleteCategory(t.cat)}
											>
												<Trash2 className="size-4" />
												Delete category
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								)}
							</div>
						);
					})}
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
					<div
						className={
							listView
								? "flex flex-col gap-0.5"
								: "xs:grid-cols-2 grid grid-cols-1 gap-5 sm:grid-cols-3 lg:grid-cols-4"
						}
					>
						{shownProjects.map((p) => {
							const props = {
								project: p,
								onOpen: () => router.push(`/editor/${p.id}`),
								onRename: () =>
									setRenaming({ id: p.id, name: p.name, kind: "project" as const }),
								onDelete: () => deleteProject(p),
							};
							return listView ? (
								<ProjectRow key={p.id} {...props} />
							) : (
								<ProjectCard key={p.id} {...props} />
							);
						})}
						{shownVault.map((item) => {
							const props = {
								item,
								allCategories: categories,
								onOpen: () =>
									item.kind === "audio" ? togglePlay(item) : setLightbox(item),
								onAdd: () => addToProject(item),
								onRename: () =>
									setRenaming({ id: item.id, name: item.name, kind: "vault" as const }),
								onRemove: () => remove(item),
								onToggleCategory: (cat: string) => toggleCategory(item, cat),
								onNewCategory: () => setCatFor(item),
								onCaption: () => setCaptionItem(item),
								onCopyCaption: () => copyCaption(item),
							};
							return listView ? (
								<VaultRow key={item.id} {...props} />
							) : (
								<VaultTile key={item.id} {...props} playing={playingId === item.id} />
							);
						})}
					</div>
				)}
			</div>

			{lightbox && <Lightbox item={lightbox} onClose={() => setLightbox(null)} />}
			<RenameDialog
				item={renaming}
				onClose={() => setRenaming(null)}
				onSave={doRename}
			/>
			<CategoryDialog
				open={!!catFor}
				mode="new"
				onClose={() => setCatFor(null)}
				onSave={addCategory}
			/>
			<CategoryDialog
				open={!!renamingCat}
				mode="rename"
				initial={renamingCat ?? ""}
				onClose={() => setRenamingCat(null)}
				onSave={(name) => renamingCat && renameCategory(renamingCat, name)}
			/>
			<CaptionDialog item={captionItem} onClose={() => setCaptionItem(null)} />
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
				<div className="bg-muted relative aspect-[4/5] overflow-hidden rounded-xl border border-border/60 shadow-sm ring-1 ring-white/5 ring-inset transition-all duration-200 group-hover:border-border group-hover:shadow-xl group-hover:shadow-black/30">
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
	allCategories,
	onOpen,
	onAdd,
	onRename,
	onRemove,
	onToggleCategory,
	onNewCategory,
	onCaption,
	onCopyCaption,
}: {
	item: VaultItem;
	playing: boolean;
	allCategories: string[];
	onOpen: () => void;
	onAdd: () => void;
	onRename: () => void;
	onRemove: () => void;
	onToggleCategory: (cat: string) => void;
	onNewCategory: () => void;
	onCaption: () => void;
	onCopyCaption: () => void;
}) {
	const hasCaption = !!item.caption?.trim();
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
				<div className="bg-muted relative aspect-[4/5] overflow-hidden rounded-xl border border-border/60 shadow-sm ring-1 ring-white/5 ring-inset transition-all duration-200 group-hover:border-border group-hover:shadow-xl group-hover:shadow-black/30">
					{thumb ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={thumb}
							alt={item.name}
							className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
							loading="lazy"
						/>
					) : item.kind === "video" && item.media[0] ? (
						<VideoThumb
							src={fileUrl(item.media[0].key)}
							className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
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

			{hasCaption && (
				<button
					type="button"
					onClick={onCaption}
					aria-label="View caption"
					title="View caption"
					className="absolute top-2 right-11 flex size-7 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
				>
					<Quote className="size-3.5" />
				</button>
			)}

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
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<Tag className="size-4" />
							Category
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="max-h-72 overflow-y-auto">
							{allCategories.map((cat) => (
								<DropdownMenuCheckboxItem
									key={cat}
									checked={(item.tags ?? []).includes(cat)}
									onCheckedChange={() => onToggleCategory(cat)}
								>
									{cat}
								</DropdownMenuCheckboxItem>
							))}
							{allCategories.length > 0 && <DropdownMenuSeparator />}
							<DropdownMenuItem onClick={onNewCategory}>
								<Plus className="size-4" />
								New category…
							</DropdownMenuItem>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
					{hasCaption && (
						<>
							<DropdownMenuItem onClick={onCaption}>
								<Quote className="size-4" />
								View caption
							</DropdownMenuItem>
							<DropdownMenuItem onClick={onCopyCaption}>
								<Copy className="size-4" />
								Copy caption
							</DropdownMenuItem>
						</>
					)}
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

			<div className="px-0.5 pt-3">
				<div className="flex items-start justify-between gap-2">
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
				{item.tags && item.tags.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{item.tags.slice(0, 3).map((t) => (
							<span
								key={t}
								className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
							>
								<Tag className="size-2.5" />
								{t}
							</span>
						))}
						{item.tags.length > 3 && (
							<span className="text-muted-foreground px-1 text-[11px]">
								+{item.tags.length - 3}
							</span>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

function ProjectRow({
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
		<div className="group hover:bg-muted/40 flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors">
			<button
				type="button"
				onClick={onOpen}
				className="flex min-w-0 flex-1 items-center gap-3 text-left"
			>
				<div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-md">
					{project.thumbnail ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={project.thumbnail}
							alt={project.name}
							loading="lazy"
							className="absolute inset-0 size-full object-cover"
						/>
					) : (
						<div className="text-muted-foreground flex size-full items-center justify-center">
							<VideoIcon className="size-5" />
						</div>
					)}
				</div>
				<div className="min-w-0 flex-1">
					<span className="block truncate text-sm font-medium">{project.name}</span>
					<p className="text-muted-foreground truncate text-xs">
						Edited {fmtDate(project.updatedAt)}
					</p>
				</div>
			</button>
			<span className="bg-muted/70 text-muted-foreground hidden shrink-0 rounded-md px-2 py-0.5 text-xs sm:block">
				Project
			</span>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						aria-label="Project options"
						className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 shrink-0 items-center justify-center rounded-md"
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
		</div>
	);
}

function VaultRow({
	item,
	allCategories,
	onOpen,
	onAdd,
	onRename,
	onRemove,
	onToggleCategory,
	onNewCategory,
	onCaption,
	onCopyCaption,
}: {
	item: VaultItem;
	allCategories: string[];
	onOpen: () => void;
	onAdd: () => void;
	onRename: () => void;
	onRemove: () => void;
	onToggleCategory: (cat: string) => void;
	onNewCategory: () => void;
	onCaption: () => void;
	onCopyCaption: () => void;
}) {
	const thumb = item.thumbKey ? fileUrl(item.thumbKey) : item.thumbUrl;
	const hasCaption = !!item.caption?.trim();
	const captionLine = item.caption?.trim().split("\n")[0] ?? "";
	const KindIcon =
		item.kind === "audio"
			? Music2
			: item.kind === "carousel"
				? ImagesIcon
				: item.kind === "image"
					? ImageIcon
					: VideoIcon;
	return (
		<div className="group hover:bg-muted/40 flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors">
			<button
				type="button"
				onClick={onOpen}
				className="flex min-w-0 flex-1 items-center gap-3 text-left"
			>
				<div className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-md">
					{thumb ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={thumb}
							alt={item.name}
							loading="lazy"
							className="absolute inset-0 size-full object-cover"
						/>
					) : (
						<div className="text-muted-foreground flex size-full items-center justify-center">
							<KindIcon className="size-5" />
						</div>
					)}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="truncate text-sm font-medium">{item.name}</span>
						{item.tags?.slice(0, 2).map((t) => (
							<span
								key={t}
								className="bg-primary/10 text-primary hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] sm:inline-flex"
							>
								<Tag className="size-2.5" />
								{t}
							</span>
						))}
					</div>
					<p className="text-muted-foreground truncate text-xs">
						<span className="capitalize">{item.source || item.kind}</span>
						{captionLine && (
							<span className="text-muted-foreground/70"> · {captionLine}</span>
						)}
					</p>
				</div>
			</button>
			<span className="bg-muted/70 text-muted-foreground hidden shrink-0 rounded-md px-2 py-0.5 text-xs capitalize sm:block">
				{item.kind}
			</span>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						aria-label="Asset options"
						className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-8 shrink-0 items-center justify-center rounded-md"
					>
						<MoreHorizontal className="size-4" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={onAdd}>
						<FolderPlus className="size-4" />
						Add to new project
					</DropdownMenuItem>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<Tag className="size-4" />
							Category
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="max-h-72 overflow-y-auto">
							{allCategories.map((cat) => (
								<DropdownMenuCheckboxItem
									key={cat}
									checked={(item.tags ?? []).includes(cat)}
									onCheckedChange={() => onToggleCategory(cat)}
								>
									{cat}
								</DropdownMenuCheckboxItem>
							))}
							{allCategories.length > 0 && <DropdownMenuSeparator />}
							<DropdownMenuItem onClick={onNewCategory}>
								<Plus className="size-4" />
								New category…
							</DropdownMenuItem>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
					{hasCaption && (
						<>
							<DropdownMenuItem onClick={onCaption}>
								<Quote className="size-4" />
								View caption
							</DropdownMenuItem>
							<DropdownMenuItem onClick={onCopyCaption}>
								<Copy className="size-4" />
								Copy caption
							</DropdownMenuItem>
						</>
					)}
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
				<DialogBody>
					<Input
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && value.trim()) onSave(value.trim());
						}}
						autoFocus
					/>
				</DialogBody>
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

function CategoryDialog({
	open,
	mode,
	initial,
	onClose,
	onSave,
}: {
	open: boolean;
	mode: "new" | "rename";
	initial?: string;
	onClose: () => void;
	onSave: (name: string) => void;
}) {
	const [value, setValue] = useState("");
	useEffect(() => {
		if (open) setValue(initial ?? "");
	}, [open, initial]);
	const isRename = mode === "rename";
	const submit = () => {
		const v = value.trim();
		if (v) onSave(v);
	};
	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>{isRename ? "Rename category" : "New category"}</DialogTitle>
					<p className="text-muted-foreground text-sm">
						{isRename
							? "Renames this category everywhere it's used."
							: "Group your library your own way — like B-roll, Hooks or Music."}
					</p>
				</DialogHeader>
				<DialogBody>
					<div className="space-y-1.5">
						<span className="text-muted-foreground text-xs font-medium">
							Category name
						</span>
						<Input
							value={value}
							onChange={(e) => setValue(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") submit();
							}}
							placeholder="e.g. B-roll, Hooks, Music"
							autoFocus
						/>
					</div>
				</DialogBody>
				<DialogFooter>
					<Button variant="text" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={submit} disabled={!value.trim()}>
						{isRename ? "Save" : "Add"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function CaptionDialog({
	item,
	onClose,
}: {
	item: VaultItem | null;
	onClose: () => void;
}) {
	const caption = item?.caption ?? "";
	const copy = async () => {
		try {
			await navigator.clipboard.writeText(caption);
			toast.success("Caption copied");
		} catch {
			toast.error("Couldn't copy caption");
		}
	};
	return (
		<Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle className="line-clamp-2 pr-8">
						{item?.name || "Caption"}
					</DialogTitle>
					{item?.source && (
						<p className="text-muted-foreground text-sm">{item.source}</p>
					)}
				</DialogHeader>
				<DialogBody className="max-h-[58vh] overflow-y-auto">
					<p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">
						{caption}
					</p>
				</DialogBody>
				<DialogFooter>
					<Button variant="text" onClick={onClose}>
						Close
					</Button>
					<Button onClick={copy}>
						<Copy className="size-4" />
						Copy caption
					</Button>
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
	const copyCap = async () => {
		if (!item.caption) return;
		try {
			await navigator.clipboard.writeText(item.caption);
			toast.success("Caption copied");
		} catch {
			toast.error("Couldn't copy caption");
		}
	};
	const mediaMaxW = item.caption ? "max-w-[90vw] lg:max-w-[54vw]" : "max-w-[80vw]";

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
							className={`max-h-[85vh] ${mediaMaxW} rounded-lg`}
						/>
					) : (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={fileUrl(cur.key)}
							alt={item.name}
							className={`max-h-[85vh] ${mediaMaxW} rounded-lg object-contain`}
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

				{item.caption && (
					<aside className="hidden max-h-[85vh] w-80 shrink-0 flex-col overflow-hidden rounded-xl bg-neutral-900/95 ring-1 ring-white/10 lg:flex">
						<div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
							<span className="text-sm font-semibold text-white">Caption</span>
							<button
								type="button"
								onClick={copyCap}
								className="flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20"
							>
								<Copy className="size-3.5" />
								Copy
							</button>
						</div>
						<div className="overflow-y-auto px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-white/80">
							{item.caption}
						</div>
					</aside>
				)}
			</div>
		</div>
	);
}
