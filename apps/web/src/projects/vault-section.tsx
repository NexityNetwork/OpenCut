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
	ChevronDown,
	Tag,
	Quote,
	Copy,
	Search,
	PanelLeft,
	Settings,
	LogOut,
	Send,
	ListFilter,
	LayoutList,
	HelpCircle,
	Folder,
	Film,
	Layers,
	AudioLines,
	LayoutTemplate,
	Hash,
	Library as LibraryIcon,
	Rocket,
	Pin,
	Link2,
	Archive,
	FolderInput,
	ArrowUpRight,
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
import { useSession, signOut } from "@/auth/client";
import { AuthButton } from "@/auth/auth-button";
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

// Single-tenant for now: publishing is wired to the owner account only.
// (Multi-tenant — per-user channels/tokens — comes later.)
const OWNER_EMAIL = "catalin@nexitynetwork.org";
const PUBLISH_ORIGIN = "https://ultron-publish.catalin-932.workers.dev";

const TABS = [
	{ key: "all", label: "All", Icon: LayoutGrid },
	{ key: "projects", label: "Projects", Icon: Folder },
	{ key: "video", label: "Videos", Icon: Film },
	{ key: "carousel", label: "Carousels", Icon: Layers },
	{ key: "audio", label: "Audio", Icon: AudioLines },
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
	const {
		setSearchQuery,
		searchQuery,
		sortKey,
		sortOrder,
		viewMode,
		setViewMode,
		isHydrated,
	} = useProjectsStore();
	const listView = isHydrated && viewMode === "list";
	const [collapsed, setCollapsed] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [appView, setAppView] = useState<"library" | "publish">("library");
	const readSet = (k: string) => {
		if (typeof window === "undefined") return new Set<string>();
		try {
			return new Set<string>(JSON.parse(localStorage.getItem(k) || "[]"));
		} catch {
			return new Set<string>();
		}
	};
	const [pinned, setPinned] = useState<Set<string>>(() => readSet("vault-pinned"));
	const [archived, setArchived] = useState<Set<string>>(() =>
		readSet("vault-archived"),
	);
	useEffect(() => {
		localStorage.setItem("vault-pinned", JSON.stringify([...pinned]));
	}, [pinned]);
	useEffect(() => {
		localStorage.setItem("vault-archived", JSON.stringify([...archived]));
	}, [archived]);
	const togglePin = (id: string) =>
		setPinned((s) => {
			const n = new Set(s);
			n.has(id) ? n.delete(id) : n.add(id);
			return n;
		});
	const toggleArchive = (id: string) =>
		setArchived((s) => {
			const n = new Set(s);
			n.has(id) ? n.delete(id) : n.add(id);
			return n;
		});
	const sortOption = `${sortKey}-${sortOrder}` as TProjectSortOption;
	const allProjects = useEditor((e) =>
		e.project.getFilteredAndSortedProjects({ searchQuery, sortOption }),
	);
	const projects = useMemo(
		() => allProjects.filter((p) => !archived.has(p.id)),
		[allProjects, archived],
	);
	const allTemplates = useEditor((e) => e.project.getTemplates());
	const templates = useMemo(
		() => allTemplates.filter((t) => !archived.has(t.id)),
		[allTemplates, archived],
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

	const copyLink = async (url: string) => {
		try {
			await navigator.clipboard.writeText(url);
			toast.success("Link copied");
		} catch {
			toast.error("Couldn't copy link");
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

	const useTemplate = async (t: TProjectMetadata) => {
		const tid = toast.loading("Creating project from template…");
		try {
			const id = await editor.project.createProjectFromTemplate({
				templateId: t.id,
			});
			toast.success("Project created", { id: tid });
			router.push(`/editor/${id}`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't use template", {
				id: tid,
			});
		}
	};

	const visibleItems = useMemo(
		() => items.filter((i) => !archived.has(i.id)),
		[items, archived],
	);
	const counts = useMemo(() => {
		const c: Record<string, number> = {
			all: visibleItems.length + projects.length,
			projects: projects.length,
		};
		for (const i of visibleItems) c[i.kind] = (c[i.kind] || 0) + 1;
		return c;
	}, [visibleItems, projects]);
	const { categories, catCounts } = useMemo(() => {
		const cc: Record<string, number> = {};
		for (const i of visibleItems) {
			for (const t of i.tags ?? []) cc[t] = (cc[t] || 0) + 1;
		}
		return {
			categories: Object.keys(cc).sort((a, b) => a.localeCompare(b)),
			catCounts: cc,
		};
	}, [visibleItems]);
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
		return visibleItems.filter(
			(i) =>
				(cat
					? (i.tags ?? []).includes(cat)
					: activeTab === "all" || i.kind === activeTab) &&
				(!q || i.name.toLowerCase().includes(q)),
		);
	}, [visibleItems, activeTab, q]);
	const shownProjects =
		activeTab === "all" || activeTab === "projects" ? projects : [];
	const shownTemplates =
		activeTab === "templates"
			? templates.filter((t) => !q || t.name.toLowerCase().includes(q))
			: [];

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
		...(templates.length
			? [
					{
						key: "templates",
						label: "Templates",
						Icon: LayoutTemplate,
						count: templates.length,
						cat: "",
					},
				]
			: []),
		...categories.map((c) => ({
			key: `cat:${c}`,
			label: c,
			Icon: Hash,
			count: catCounts[c] || 0,
			cat: c,
		})),
	];

	// Recently touched: latest projects + vault items, merged by time.
	const recents: RecentItem[] = [
		...projects.map((p) => ({
			key: `p:${p.id}`,
			id: p.id,
			label: p.name,
			Icon: Folder,
			t: Number(new Date(p.updatedAt)) || 0,
			pinned: pinned.has(p.id),
			onClick: () => router.push(`/editor/${p.id}`),
			onPin: () => togglePin(p.id),
			onRename: () =>
				setRenaming({ id: p.id, name: p.name, kind: "project" as const }),
			onCopyLink: () => copyLink(`${location.origin}/editor/${p.id}`),
			onArchive: () => toggleArchive(p.id),
			onDelete: () => deleteProject(p),
		})),
		...visibleItems.map((i) => ({
			key: `v:${i.id}`,
			id: i.id,
			label: i.name,
			Icon: kindIcon(i.kind),
			t: i.createdAt || 0,
			pinned: pinned.has(i.id),
			onClick: () => {
				setAppView("library");
				if (i.kind === "audio") togglePlay(i);
				else setLightbox(i);
			},
			onPin: () => togglePin(i.id),
			onRename: () =>
				setRenaming({ id: i.id, name: i.name, kind: "vault" as const }),
			onCopyLink: () =>
				copyLink(i.media[0] ? location.origin + fileUrl(i.media[0].key) : i.name),
			onArchive: () => toggleArchive(i.id),
			onDelete: () => remove(i),
			tags: i.tags ?? [],
			onToggleCategory: (c: string) => toggleCategory(i, c),
		})),
	]
		.sort(
			(a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.t - a.t,
		)
		.slice(0, 8);

	return (
		<div className="text-foreground flex h-screen overflow-hidden bg-[#181614]">
			<LibrarySidebar
				collapsed={collapsed}
				onToggleCollapse={() => setCollapsed((c) => !c)}
				onOpenSearch={() => setSearchOpen(true)}
				appView={appView}
				onSelectLibrary={() => setAppView("library")}
				onSelectPublish={() => setAppView("publish")}
				navTabs={navTabs}
				activeTab={activeTab}
				onSelectTab={(k) => {
					setAppView("library");
					setActiveTab(k);
				}}
				onNewProject={createBlankProject}
				onRenameCat={setRenamingCat}
				onDeleteCat={deleteCategory}
				recents={recents}
				categories={categories}
			/>
			<main
				className={cn(
					"min-w-0 flex-1 overflow-y-auto transition-colors",
					dragging && "ring-primary/40 ring-2 ring-inset",
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
				{appView === "publish" ? (
					<PublishPane onNewProject={createBlankProject} />
				) : (
					<div className="px-8 pb-12">
						<div className="flex justify-end pt-4">
							<ViewToggle
								viewMode={viewMode}
								setViewMode={setViewMode}
								isHydrated={isHydrated}
							/>
						</div>
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

			{/* Library grid (navigation lives in the sidebar now) */}
			<div className="mt-6">
				<div className="hidden">
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
				shownVault.length === 0 &&
				shownTemplates.length === 0 ? (
					<div className="flex justify-center py-12">
						<Spinner className="text-muted-foreground size-5" />
					</div>
				) : shownProjects.length === 0 &&
					shownVault.length === 0 &&
					shownTemplates.length === 0 ? (
					<div className="text-muted-foreground py-12 text-center text-sm">
						Nothing here yet — paste a link, upload a file, or start a new
						project.
					</div>
				) : (
					<div
						className={
							listView
								? "flex flex-col gap-0.5"
								: "xs:grid-cols-2 grid grid-cols-1 gap-5 sm:grid-cols-3"
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
						{shownTemplates.map((t) => {
							const props = {
								project: t,
								badge: "Template",
								openLabel: "Use template",
								onOpen: () => useTemplate(t),
								onRename: () =>
									setRenaming({ id: t.id, name: t.name, kind: "project" as const }),
								onDelete: () => deleteProject(t),
							};
							return listView ? (
								<ProjectRow key={t.id} {...props} />
							) : (
								<ProjectCard key={t.id} {...props} />
							);
						})}
					</div>
				)}
			</div>
					</div>
				)}

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
			</main>
			{searchOpen && (
				<SearchModal
					items={items}
					projects={projects}
					onClose={() => setSearchOpen(false)}
					onSelectVault={(i) => {
						setSearchOpen(false);
						setAppView("library");
						if (i.kind === "audio") togglePlay(i);
						else setLightbox(i);
					}}
					onSelectProject={(p) => {
						setSearchOpen(false);
						router.push(`/editor/${p.id}`);
					}}
				/>
			)}
		</div>
	);
}

type NavTab = {
	key: string;
	label: string;
	Icon: typeof Tag;
	count: number;
	cat: string;
};

type RecentItem = {
	key: string;
	id: string;
	label: string;
	Icon: typeof Tag;
	t: number;
	pinned: boolean;
	onClick: () => void;
	onPin: () => void;
	onRename: () => void;
	onCopyLink: () => void;
	onArchive: () => void;
	onDelete: () => void;
	tags?: string[];
	onToggleCategory?: (c: string) => void;
};

function SidebarItem({
	icon: Icon,
	label,
	onClick,
	active,
	badge,
}: {
	icon: typeof Tag;
	label: string;
	onClick: () => void;
	active?: boolean;
	badge?: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-[13px] transition-colors",
				active
					? "bg-white/[0.07] text-[#f1ebdc]"
					: "text-[#c7c0ae] hover:bg-white/[0.04] hover:text-[#f1ebdc]",
			)}
		>
			<Icon className="size-[15px] shrink-0" strokeWidth={1.75} />
			<span className="flex-1 text-left">{label}</span>
			{badge && (
				<span className="bg-primary/15 text-primary rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide">
					{badge}
				</span>
			)}
		</button>
	);
}

function Avatar({
	name,
	image,
	size = 7,
}: {
	name?: string | null;
	image?: string | null;
	size?: 6 | 7 | 8;
}) {
	const sz = size === 8 ? "size-8" : size === 6 ? "size-6" : "size-7";
	if (image)
		// eslint-disable-next-line @next/next/no-img-element
		return <img src={image} alt="" className={cn(sz, "shrink-0 rounded-full")} />;
	return (
		<span
			className={cn(
				sz,
				"bg-muted text-foreground flex shrink-0 items-center justify-center rounded-full text-xs font-semibold",
			)}
		>
			{(name ?? "U").slice(0, 1).toUpperCase()}
		</span>
	);
}

function LibrarySidebar({
	collapsed,
	onToggleCollapse,
	onOpenSearch,
	appView,
	onSelectLibrary,
	onSelectPublish,
	navTabs,
	activeTab,
	onSelectTab,
	onNewProject,
	onRenameCat,
	onDeleteCat,
	recents,
	categories,
}: {
	collapsed: boolean;
	onToggleCollapse: () => void;
	onOpenSearch: () => void;
	appView: "library" | "publish";
	onSelectLibrary: () => void;
	onSelectPublish: () => void;
	navTabs: NavTab[];
	activeTab: string;
	onSelectTab: (k: string) => void;
	onNewProject: () => void;
	onRenameCat: (c: string) => void;
	onDeleteCat: (c: string) => void;
	recents: RecentItem[];
	categories: string[];
}) {
	const { data: session } = useSession();
	const user = session?.user;
	const isOwner = user?.email === OWNER_EMAIL;
	const [moreOpen, setMoreOpen] = useState(false);

	if (collapsed) {
		return (
			<aside className="m-2 flex w-16 shrink-0 flex-col items-center gap-1 rounded-2xl border border-white/[0.07] bg-[#201e1b] py-3 shadow-sm">
				<button
					type="button"
					onClick={onToggleCollapse}
					aria-label="Expand sidebar"
					className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-9 items-center justify-center rounded-md"
				>
					<PanelLeft className="size-5" />
				</button>
				<button
					type="button"
					onClick={onNewProject}
					aria-label="New project"
					className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-9 items-center justify-center rounded-md"
				>
					<Plus className="size-5" />
				</button>
				<button
					type="button"
					onClick={onOpenSearch}
					aria-label="Search"
					className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-9 items-center justify-center rounded-md"
				>
					<Search className="size-5" />
				</button>
				<button
					type="button"
					onClick={onSelectLibrary}
					aria-label="Library"
					className={cn(
						"flex size-9 items-center justify-center rounded-md",
						appView === "library"
							? "bg-muted text-foreground"
							: "text-muted-foreground hover:text-foreground hover:bg-muted",
					)}
				>
					<LayoutGrid className="size-5" />
				</button>
				{isOwner && (
					<button
						type="button"
						onClick={onSelectPublish}
						aria-label="Publish"
						className={cn(
							"flex size-9 items-center justify-center rounded-md",
							appView === "publish"
								? "bg-muted text-foreground"
								: "text-muted-foreground hover:text-foreground hover:bg-muted",
						)}
					>
						<Rocket className="size-5" />
					</button>
				)}
				<div className="mt-auto">
					<Avatar name={user?.name} image={user?.image} size={8} />
				</div>
			</aside>
		);
	}

	return (
		<aside className="m-2 flex w-72 shrink-0 flex-col rounded-2xl border border-white/[0.07] bg-[#201e1b] shadow-sm">
			<div className="flex items-center justify-between px-4 py-4">
				<span className="text-foreground text-xl font-semibold tracking-tight">
					Ultron<span className="ml-1.5 font-normal">Monolith</span>
				</span>
				<div className="flex items-center gap-0.5">
					<button
						type="button"
						onClick={onToggleCollapse}
						aria-label="Collapse sidebar"
						className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-7 items-center justify-center rounded-md"
					>
						<PanelLeft className="size-4" />
					</button>
					<button
						type="button"
						onClick={onOpenSearch}
						aria-label="Search"
						className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-7 items-center justify-center rounded-md"
					>
						<Search className="size-4" />
					</button>
				</div>
			</div>

			<nav className="space-y-0.5 px-2">
				<SidebarItem icon={Plus} label="New project" onClick={onNewProject} />
				<SidebarItem
					icon={LibraryIcon}
					label="Library"
					active={appView === "library"}
					onClick={onSelectLibrary}
				/>
				{isOwner && (
					<SidebarItem
						icon={Rocket}
						label="Publish"
						badge="Beta"
						active={appView === "publish"}
						onClick={onSelectPublish}
					/>
				)}
				<button
					type="button"
					onClick={() => setMoreOpen((v) => !v)}
					className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-[13px] text-[#c7c0ae] transition-colors hover:bg-white/[0.04] hover:text-[#f1ebdc]"
				>
					<ChevronDown
						className={cn(
							"size-[15px] shrink-0 transition-transform",
							moreOpen && "rotate-180",
						)}
					/>
					<span className="flex-1 text-left">More</span>
				</button>
				{moreOpen && (
					<div className="space-y-0.5">
						<SidebarItem icon={Settings} label="Customize" onClick={() => {}} />
						<SidebarItem icon={HelpCircle} label="Get help" onClick={() => {}} />
					</div>
				)}
			</nav>

			<div className="flex items-center justify-between px-4 pt-4 pb-1">
				<span className="text-[11px] font-semibold tracking-wide text-[#8b8676] uppercase">
					Browse
				</span>
				<ListFilter className="size-3.5 text-[#8b8676]" />
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
				{navTabs.map((t) => {
					const active = appView === "library" && activeTab === t.key;
					return (
						<div key={t.key} className="group/row relative">
							<button
								type="button"
								onClick={() => onSelectTab(t.key)}
								title={t.label}
								className={cn(
									"flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-colors",
									active
										? "bg-white/[0.07] text-[#f1ebdc]"
										: "text-[#c7c0ae] hover:bg-white/[0.04] hover:text-[#f1ebdc]",
								)}
							>
								<t.Icon className="size-[15px] shrink-0" strokeWidth={1.75} />
								<span className="flex-1 truncate text-[13px]">{t.label}</span>
								{t.count > 0 && (
									<span
										className={cn(
											"text-[11px] tabular-nums text-[#8b8676]",
											t.cat && "transition-opacity group-hover/row:opacity-0",
										)}
									>
										{t.count}
									</span>
								)}
							</button>
							{t.cat && (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<button
											type="button"
											aria-label={`Manage "${t.cat}" category`}
											className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded text-[#8b8676] opacity-0 transition-opacity hover:bg-white/[0.06] hover:text-[#f1ebdc] group-hover/row:opacity-100 data-[state=open]:opacity-100"
										>
											<MoreHorizontal className="size-3.5" />
										</button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onClick={() => onRenameCat(t.cat)}>
											<Pencil className="size-4" />
											Rename category
										</DropdownMenuItem>
										<DropdownMenuItem
											variant="destructive"
											onClick={() => onDeleteCat(t.cat)}
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
					{recents.length > 0 && (
						<>
							<div className="px-2 pt-4 pb-1 text-[11px] font-semibold tracking-wide text-[#8b8676] uppercase">
								Recents
							</div>
							{recents.map((r) => (
								<div key={r.key} className="group/row relative">
									<button
										type="button"
										onClick={r.onClick}
										title={r.label}
										className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1 pr-7 text-left text-[#c7c0ae] transition-colors hover:bg-white/[0.04] hover:text-[#f1ebdc]"
									>
										<r.Icon className="size-[15px] shrink-0" strokeWidth={1.75} />
										<span className="flex-1 truncate text-[13px]">{r.label}</span>
										{r.pinned && (
											<Pin className="size-3 shrink-0 fill-current text-[#8b8676]" />
										)}
									</button>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<button
												type="button"
												aria-label="Item options"
												className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded text-[#8b8676] opacity-0 transition-opacity hover:bg-white/[0.06] hover:text-[#f1ebdc] group-hover/row:opacity-100 data-[state=open]:opacity-100"
											>
												<MoreHorizontal className="size-3.5" />
											</button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="start" className="w-48">
											<DropdownMenuItem onClick={r.onClick}>
												<ArrowUpRight className="size-4" />
												Open
											</DropdownMenuItem>
											<DropdownMenuItem onClick={r.onPin}>
												<Pin className="size-4" />
												{r.pinned ? "Unpin" : "Pin"}
											</DropdownMenuItem>
											<DropdownMenuItem onClick={r.onRename}>
												<Pencil className="size-4" />
												Rename
											</DropdownMenuItem>
											<DropdownMenuItem onClick={r.onCopyLink}>
												<Link2 className="size-4" />
												Copy link
											</DropdownMenuItem>
											{r.onToggleCategory && (
												<DropdownMenuSub>
													<DropdownMenuSubTrigger>
														<FolderInput className="size-4" />
														Move to group
													</DropdownMenuSubTrigger>
													<DropdownMenuSubContent className="max-h-72 overflow-y-auto">
														{categories.length === 0 ? (
															<DropdownMenuItem disabled>
																No categories yet
															</DropdownMenuItem>
														) : (
															categories.map((c) => (
																<DropdownMenuCheckboxItem
																	key={c}
																	checked={(r.tags ?? []).includes(c)}
																	onCheckedChange={() => r.onToggleCategory?.(c)}
																>
																	{c}
																</DropdownMenuCheckboxItem>
															))
														)}
													</DropdownMenuSubContent>
												</DropdownMenuSub>
											)}
											<DropdownMenuItem onClick={r.onArchive}>
												<Archive className="size-4" />
												Archive
											</DropdownMenuItem>
											<DropdownMenuSeparator />
											<DropdownMenuItem variant="destructive" onClick={r.onDelete}>
												<Trash2 className="size-4" />
												Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							))}
						</>
					)}
			</div>

			<div className="p-2">
				{user ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="hover:bg-muted/50 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors"
							>
								<Avatar name={user.name} image={user.image} size={6} />
								<span className="min-w-0 flex-1 truncate text-[13px]">
									<span className="text-foreground">{user.name ?? "You"}</span>
									<span className="text-muted-foreground"> · Max</span>
								</span>
								<ChevronDown className="text-muted-foreground size-4 shrink-0" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-56">
							<div className="text-muted-foreground truncate px-2 py-1.5 text-xs">
								{user.email}
							</div>
							<DropdownMenuSeparator />
							<DropdownMenuItem disabled>
								<Settings className="size-4" />
								Settings
							</DropdownMenuItem>
							<DropdownMenuItem disabled>
								<HelpCircle className="size-4" />
								Get help
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								variant="destructive"
								onClick={() => {
									void signOut().finally(() => window.location.reload());
								}}
							>
								<LogOut className="size-4" />
								Log out
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				) : (
					<AuthButton />
				)}
			</div>
		</aside>
	);
}

function ViewToggle({
	viewMode,
	setViewMode,
	isHydrated,
}: {
	viewMode: string;
	setViewMode: (a: { viewMode: "grid" | "list" }) => void;
	isHydrated: boolean;
}) {
	const opts: [("grid" | "list"), typeof Tag][] = [
		["grid", LayoutGrid],
		["list", LayoutList],
	];
	return (
		<div className="border-border/60 flex items-center gap-0.5 rounded-md border p-0.5">
			{opts.map(([m, Icon]) => (
				<button
					key={m}
					type="button"
					onClick={() => setViewMode({ viewMode: m })}
					aria-label={`${m} view`}
					className={cn(
						"flex size-7 items-center justify-center rounded transition-colors",
						isHydrated && viewMode === m
							? "bg-muted text-foreground"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					<Icon className="size-4" />
				</button>
			))}
		</div>
	);
}

function kindIcon(kind: string): typeof Tag {
	return kind === "audio"
		? Music2
		: kind === "carousel"
			? ImagesIcon
			: kind === "image"
				? ImageIcon
				: VideoIcon;
}

function SearchModal({
	items,
	projects,
	onClose,
	onSelectVault,
	onSelectProject,
}: {
	items: VaultItem[];
	projects: TProjectMetadata[];
	onClose: () => void;
	onSelectVault: (i: VaultItem) => void;
	onSelectProject: (p: TProjectMetadata) => void;
}) {
	const [q, setQ] = useState("");
	const ql = q.trim().toLowerCase();
	const pRes = (ql
		? projects.filter((p) => p.name.toLowerCase().includes(ql))
		: projects
	).slice(0, 6);
	const vRes = (ql
		? items.filter(
				(i) =>
					i.name.toLowerCase().includes(ql) ||
					(i.caption ?? "").toLowerCase().includes(ql),
			)
		: items
	).slice(0, 12);
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);
	return (
		<div
			className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 p-4 pt-[12vh]"
			onClick={onClose}
		>
			<div
				className="bg-popover border-border w-full max-w-xl overflow-hidden rounded-xl border shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="border-border/60 flex items-center gap-2 border-b px-4">
					<Search className="text-muted-foreground size-4" />
					<input
						autoFocus
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="Search your library and projects…"
						className="flex-1 bg-transparent py-3.5 text-sm outline-none"
					/>
					<button type="button" onClick={onClose} aria-label="Close">
						<X className="text-muted-foreground hover:text-foreground size-4" />
					</button>
				</div>
				<div className="max-h-[55vh] overflow-y-auto p-2">
					{pRes.length === 0 && vRes.length === 0 ? (
						<div className="text-muted-foreground py-10 text-center text-sm">
							No matches
						</div>
					) : (
						<>
							{pRes.map((p) => (
								<SearchRow
									key={p.id}
									Icon={Clapperboard}
									title={p.name}
									meta="Project"
									onClick={() => onSelectProject(p)}
								/>
							))}
							{vRes.map((i) => (
								<SearchRow
									key={i.id}
									Icon={kindIcon(i.kind)}
									title={i.name}
									meta={i.source || i.kind}
									onClick={() => onSelectVault(i)}
								/>
							))}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

function SearchRow({
	Icon,
	title,
	meta,
	onClick,
}: {
	Icon: typeof Tag;
	title: string;
	meta: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="hover:bg-muted flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors"
		>
			<Icon className="text-muted-foreground size-4 shrink-0" />
			<span className="min-w-0 flex-1 truncate text-sm">{title}</span>
			<span className="text-muted-foreground shrink-0 text-xs capitalize">{meta}</span>
		</button>
	);
}

function pubPlatformIcon(p: string) {
	const k = (p || "").toLowerCase();
	if (k.includes("you")) return <SiYoutube style={{ color: "#FF0000" }} className="size-3.5" />;
	if (k.includes("insta")) return <SiInstagram style={{ color: "#E4405F" }} className="size-3.5" />;
	if (k.includes("tik")) return <SiTiktok className="size-3.5" />;
	return <Send className="size-3.5" />;
}
function pubWhen(ts?: number) {
	if (!ts) return "";
	try {
		return new Date(ts).toLocaleString(undefined, {
			month: "short",
			day: "numeric",
			hour: "numeric",
			minute: "2-digit",
		});
	} catch {
		return "";
	}
}
const pubStatusColor = (s: string) =>
	/publish|done|success/.test(s)
		? "text-green-500"
		: /fail|error|cancel/.test(s)
			? "text-red-500"
			: /upload|process/.test(s)
				? "text-amber-400"
				: "text-muted-foreground";

type PubStatus = {
	counts?: Record<string, number>;
	upcoming?: {
		slug: string;
		platform: string;
		scheduled_for?: number;
	}[];
	recent?: {
		slug: string;
		platform: string;
		status: string;
		external_url?: string | null;
		published_at?: number;
	}[];
};

type Channel = {
	id: string;
	platform: string;
	label: string;
	platform_handle?: string | null;
	status: string;
};

function ChannelsSection() {
	const [channels, setChannels] = useState<Channel[] | null>(null);
	const [pending, setPending] = useState<{
		platform: string;
		connection_id: string;
		label: string;
	} | null>(null);
	const [busy, setBusy] = useState(false);
	const load = () => {
		fetch("/api/publish/channels")
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => setChannels(d?.channels ?? []))
			.catch(() => setChannels([]));
	};
	useEffect(() => {
		load();
	}, []);

	const connectYouTube = () => {
		window.open(`${PUBLISH_ORIGIN}/oauth2/youtube/start`, "_blank", "noopener");
		toast.message("Authorize YouTube in the new tab, then hit Refresh.");
	};
	const initiate = async (platform: string) => {
		const label = window.prompt(`Name this ${platform} account`, "");
		if (!label?.trim()) return;
		setBusy(true);
		try {
			const r = await fetch(`/api/publish/channels/initiate/${platform}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ entity_id: "default" }),
			});
			const d = await r.json().catch(() => ({}));
			if (!r.ok || !d.redirect_url)
				throw new Error(d.error || d.hint || "Couldn't start connect");
			window.open(d.redirect_url, "_blank", "noopener");
			setPending({ platform, connection_id: d.connection_id, label: label.trim() });
			toast.message(
				`Authorize ${platform} in the new tab, then click "Finish connecting".`,
			);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Connect failed");
		} finally {
			setBusy(false);
		}
	};
	const finish = async () => {
		if (!pending) return;
		setBusy(true);
		try {
			const r = await fetch("/api/publish/channels", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					platform: pending.platform,
					label: pending.label,
					composio_entity_id: "default",
					composio_connection_id: pending.connection_id,
				}),
			});
			const d = await r.json().catch(() => ({}));
			if (!r.ok || !d.ok)
				throw new Error(d.error || "Couldn't finish — did you approve it?");
			toast.success(`${pending.platform} connected`);
			setPending(null);
			load();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Finish failed");
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="mt-9">
			<div className="mb-2 flex items-center justify-between">
				<h2 className="text-sm font-semibold">Channels</h2>
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={load}
						className="text-muted-foreground hover:text-foreground text-xs"
					>
						Refresh
					</button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								disabled={busy}
								className="border-border/60 hover:bg-muted/50 flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium"
							>
								<Plus className="size-3.5" /> Connect
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={connectYouTube}>
								<SiYoutube style={{ color: "#FF0000" }} /> YouTube
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => initiate("instagram")}>
								<SiInstagram style={{ color: "#E4405F" }} /> Instagram
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => initiate("tiktok")}>
								<SiTiktok /> TikTok
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			{pending && (
				<div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
					<span>
						Approve <span className="capitalize">{pending.platform}</span> in the
						other tab, then finish.
					</span>
					<button
						type="button"
						onClick={finish}
						disabled={busy}
						className="bg-primary text-primary-foreground shrink-0 rounded-md px-3 py-1 text-xs font-medium"
					>
						Finish connecting
					</button>
				</div>
			)}

			{channels === null ? (
				<div className="text-muted-foreground py-4 text-sm">Loading channels…</div>
			) : channels.length === 0 ? (
				<div className="text-muted-foreground border-border/60 rounded-xl border border-dashed py-6 text-center text-sm">
					No channels connected yet — use Connect.
				</div>
			) : (
				<div className="flex flex-wrap gap-2">
					{channels.map((ch) => (
						<div
							key={ch.id}
							className="border-border/60 bg-card/40 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
						>
							{pubPlatformIcon(ch.platform)}
							<span className="font-medium">{ch.label}</span>
							{ch.platform_handle && (
								<span className="text-muted-foreground text-xs">
									{ch.platform_handle}
								</span>
							)}
							<span
								className={cn(
									"size-1.5 rounded-full",
									ch.status === "active" ? "bg-green-500" : "bg-muted-foreground/50",
								)}
							/>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function PublishPane({ onNewProject }: { onNewProject: () => void }) {
	const [online, setOnline] = useState<boolean | null>(null);
	const [status, setStatus] = useState<PubStatus | null>(null);
	useEffect(() => {
		fetch("/api/publish/health")
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => setOnline(!!d?.ok))
			.catch(() => setOnline(false));
		fetch("/api/publish/status")
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => setStatus(d))
			.catch(() => setStatus(null));
	}, []);
	const c = status?.counts ?? {};
	const stat = [
		{ label: "Published", value: c.published, color: "text-green-500" },
		{ label: "Queued", value: c.queued, color: "text-foreground" },
		{ label: "Uploading", value: c.uploading, color: "text-amber-400" },
		{ label: "Failed", value: c.failed, color: "text-red-500" },
	];
	const upcoming = status?.upcoming ?? [];
	const recent = status?.recent ?? [];
	return (
		<div className="mx-auto max-w-3xl px-8 py-10">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Publishing</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						Schedule and track posts across your channels.
					</p>
				</div>
				<span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
					<span
						className={cn(
							"size-1.5 rounded-full",
							online ? "bg-green-500" : "bg-muted-foreground/50",
						)}
					/>
					Engine {online == null ? "…" : online ? "online" : "offline"}
				</span>
			</div>

			<div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
				{stat.map((s) => (
					<div
						key={s.label}
						className="border-border/60 bg-card/40 rounded-xl border p-4"
					>
						<div className="text-muted-foreground text-xs">{s.label}</div>
						<div className={cn("mt-1.5 text-2xl font-semibold", s.color)}>
							{s.value ?? 0}
						</div>
					</div>
				))}
			</div>

			<ChannelsSection />

			{/* Upcoming */}
			<div className="mt-9">
				<h2 className="mb-2 text-sm font-semibold">Upcoming</h2>
				{upcoming.length === 0 ? (
					<div className="text-muted-foreground border-border/60 rounded-xl border border-dashed py-8 text-center text-sm">
						Nothing scheduled.
					</div>
				) : (
					<div className="border-border/60 divide-border/60 divide-y overflow-hidden rounded-xl border">
						{upcoming.slice(0, 12).map((u, i) => (
							<div
								key={`${u.slug}-${u.platform}-${i}`}
								className="hover:bg-muted/30 flex items-center gap-3 px-4 py-2.5"
							>
								{pubPlatformIcon(u.platform)}
								<span className="flex-1 truncate font-mono text-xs">{u.slug}</span>
								<span className="text-muted-foreground text-xs capitalize">
									{u.platform}
								</span>
								<span className="text-muted-foreground shrink-0 text-xs">
									{pubWhen(u.scheduled_for)}
								</span>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Recent */}
			<div className="mt-8">
				<h2 className="mb-2 text-sm font-semibold">Recent</h2>
				{recent.length === 0 ? (
					<div className="text-muted-foreground border-border/60 rounded-xl border border-dashed py-8 text-center text-sm">
						No posts yet.
					</div>
				) : (
					<div className="border-border/60 divide-border/60 divide-y overflow-hidden rounded-xl border">
						{recent.slice(0, 15).map((p, i) => (
							<div
								key={`${p.slug}-${p.platform}-${i}`}
								className="hover:bg-muted/30 flex items-center gap-3 px-4 py-2.5"
							>
								{pubPlatformIcon(p.platform)}
								<span className="flex-1 truncate font-mono text-xs">{p.slug}</span>
								<span className={cn("text-xs capitalize", pubStatusColor(p.status))}>
									{p.status}
								</span>
								{p.external_url ? (
									<a
										href={p.external_url}
										target="_blank"
										rel="noopener noreferrer"
										className="text-muted-foreground hover:text-foreground shrink-0"
										title="Open post"
									>
										<ArrowUpRight className="size-4" />
									</a>
								) : (
									<span className="text-muted-foreground/40 shrink-0 text-xs">
										{pubWhen(p.published_at)}
									</span>
								)}
							</div>
						))}
					</div>
				)}
			</div>

			<button
				type="button"
				onClick={onNewProject}
				className="bg-primary text-primary-foreground hover:bg-primary/90 mt-8 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
			>
				<Plus className="size-4" />
				New post
			</button>
		</div>
	);
}

function ProjectCard({
	project,
	onOpen,
	onRename,
	onDelete,
	badge = "Project",
	openLabel = "Open",
}: {
	project: TProjectMetadata;
	onOpen: () => void;
	onRename: () => void;
	onDelete: () => void;
	badge?: string;
	openLabel?: string;
}) {
	return (
		<div className="group relative">
			<button type="button" onClick={onOpen} className="block w-full text-left">
				<div className="bg-muted relative aspect-[4/5] overflow-hidden rounded-xl border border-white/[0.12] shadow-md ring-1 ring-black/20 transition-all duration-200 group-hover:border-white/25 group-hover:shadow-xl group-hover:shadow-black/40">
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
							{openLabel}
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
					{badge}
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
				<div className="bg-muted relative aspect-[4/5] overflow-hidden rounded-xl border border-white/[0.12] shadow-md ring-1 ring-black/20 transition-all duration-200 group-hover:border-white/25 group-hover:shadow-xl group-hover:shadow-black/40">
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
	badge = "Project",
}: {
	project: TProjectMetadata;
	onOpen: () => void;
	onRename: () => void;
	onDelete: () => void;
	badge?: string;
	openLabel?: string;
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
				{badge}
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
