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
	Check,
	CalendarDays,
	Clock,
	Sun,
	Moon,
	Star,
	Heart,
	Bookmark,
	Flame,
	Zap,
	Sparkles,
	Camera,
	Mic,
	Megaphone,
	Briefcase,
	Globe,
	TrendingUp,
	Flag,
	Crown,
	Palette,
	Wand2,
	Smile,
	Coffee,
	Calendar as CalendarIcon,
	Frame,
	FileText,
	Linkedin,
	Home as HomeIcon,
	BarChart3,
	ScrollText,
	Scissors,
	MessagesSquare,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
	SiYoutube,
	SiYoutubemusic,
	SiSoundcloud,
	SiInstagram,
	SiTiktok,
	SiVimeo,
	SiX,
	SiReddit,
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
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/utils/ui";
import { useEditor } from "@/editor/use-editor";
import { processMediaAssets } from "@/media/processing";
import { useProjectsStore } from "@/app/projects/store";
import { getVaultOwner } from "@/projects/vault-owner";
import { loadFonts } from "@/fonts/google-fonts";
import { getElementFontFamilies } from "@/timeline/element-utils";
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
import { BioBuilder } from "@/bio/bio-builder";
import { ClipsStudio } from "@/clips/clips-studio";
import { BrandKitView } from "@/brand/brand-kit";
import { StudioPane } from "@/projects/studio-pane";
import { InboxView, INBOX_TABS, type InboxTab } from "@/inbox/inbox-view";
import { AssetDetail } from "@/projects/asset-detail";
import { AddMediaAssetCommand } from "@/commands/media";
import { InsertElementCommand } from "@/commands/timeline";
import { BatchCommand } from "@/commands";
import type { ClipSuggestion } from "@/app/api/clips/route";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { mediaTimeFromSeconds } from "@/wasm";
import { insertCaptionChunksAsTextTrack } from "@/subtitles/insert";
import {
	uploadExportToVault,
	uploadCarouselToVault,
} from "@/canvas-editor/publish-export";
import { renderPagesToBlobs } from "@/canvas-editor/export";
import { ParticleTextEffect } from "@/components/home/particle-text";

const PLATFORMS = [
	{ Icon: SiYoutube, label: "YouTube", color: "#FF0000" },
	{ Icon: SiYoutubemusic, label: "YouTube Music", color: "#FF0000" },
	{ Icon: SiSoundcloud, label: "SoundCloud", color: "#FF5500" },
	{ Icon: SiInstagram, label: "Instagram", color: "#E4405F" },
	{ Icon: SiTiktok, label: "TikTok", color: "" },
	{ Icon: SiVimeo, label: "Vimeo", color: "#1AB7EA" },
	{ Icon: SiX, label: "X", color: "" },
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

// Always-visible browse tabs (shown even when empty).
const STICKY_TABS = new Set(["all", "projects", "video", "carousel", "audio"]);

// Icon catalog for custom sections (filter → New section → pick an icon).
const SECTION_ICONS: { name: string; Icon: typeof Tag }[] = [
	{ name: "hash", Icon: Hash },
	{ name: "star", Icon: Star },
	{ name: "heart", Icon: Heart },
	{ name: "bookmark", Icon: Bookmark },
	{ name: "flame", Icon: Flame },
	{ name: "zap", Icon: Zap },
	{ name: "sparkles", Icon: Sparkles },
	{ name: "rocket", Icon: Rocket },
	{ name: "film", Icon: Film },
	{ name: "camera", Icon: Camera },
	{ name: "mic", Icon: Mic },
	{ name: "megaphone", Icon: Megaphone },
	{ name: "layers", Icon: Layers },
	{ name: "folder", Icon: Folder },
	{ name: "briefcase", Icon: Briefcase },
	{ name: "globe", Icon: Globe },
	{ name: "trending", Icon: TrendingUp },
	{ name: "calendar", Icon: CalendarIcon },
	{ name: "flag", Icon: Flag },
	{ name: "crown", Icon: Crown },
	{ name: "palette", Icon: Palette },
	{ name: "wand", Icon: Wand2 },
	{ name: "smile", Icon: Smile },
	{ name: "coffee", Icon: Coffee },
];
const ICON_MAP: Record<string, typeof Tag> = Object.fromEntries(
	SECTION_ICONS.map((i) => [i.name, i.Icon]),
);
type CustomSection = { name: string; icon: string };
// Top-level dashboard views (sidebar drives this). "studio" is the HyperFrames
// prompting tab for beta testers.
type AppView =
	| "home"
	| "library"
	| "publish"
	| "bio"
	| "clips"
	| "brand"
	| "inbox"
	| "studio";
const APP_VIEWS: AppView[] = [
	"home",
	"library",
	"publish",
	"bio",
	"clips",
	"brand",
	"inbox",
	"studio",
];

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
// Bidirectional: mounts the heavy <video> when near the viewport AND unmounts
// it once scrolled well away. A one-way latch leaked hundreds of live <video>
// elements as you scrolled a 200-clip library, which starved the browser's
// decoders and made opening any single video stutter badly.
function useInView<T extends Element>(rootMargin = "300px") {
	const ref = useRef<T | null>(null);
	const [inView, setInView] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const io = new IntersectionObserver(
			(entries) => {
				const e = entries[0];
				if (e) setInView(e.isIntersecting);
			},
			{ rootMargin },
		);
		io.observe(el);
		return () => io.disconnect();
	}, [rootMargin]);
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
	const [mobileNav, setMobileNav] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	// The active view is persisted in the URL (?view=) + sessionStorage, so a
	// refresh or returning from the editor lands on the same view (e.g. the
	// Library) instead of always resetting to the Home dashboard.
	const [appView, setAppView] = useState<AppView>(() => {
		if (typeof window === "undefined") return "home";
		const v =
			new URLSearchParams(window.location.search).get("view") ||
			sessionStorage.getItem("vault-app-view") ||
			"home";
		return APP_VIEWS.includes(v as AppView) ? (v as AppView) : "home";
	});
	// Which SM Automation subsection is active (the sidebar drives it directly).
	const [inboxTab, setInboxTab] = useState<InboxTab>("comments");
	const selectInboxTab = (t: InboxTab) => {
		setAppView("inbox");
		setInboxTab(t);
	};
	// "Export & publish" hand-off from the editors: /projects?compose=<itemId>
	const [composePrefill, setComposePrefill] = useState<string | null>(null);
	useEffect(() => {
		const id = new URLSearchParams(window.location.search).get("compose");
		if (id) {
			setComposePrefill(id);
			setAppView("publish");
			window.history.replaceState(null, "", "/projects");
		}
	}, []);
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
	const [customSections, setCustomSections] = useState<CustomSection[]>(() => {
		if (typeof window === "undefined") return [];
		try {
			return JSON.parse(localStorage.getItem("vault-sections") || "[]");
		} catch {
			return [];
		}
	});
	const [newSectionOpen, setNewSectionOpen] = useState(false);
	useEffect(() => {
		localStorage.setItem("vault-sections", JSON.stringify(customSections));
	}, [customSections]);
	const createSection = (name: string, icon: string) => {
		const n = name.trim();
		if (!n) return;
		setCustomSections((prev) =>
			prev.some((s) => s.name === n)
				? prev.map((s) => (s.name === n ? { ...s, icon } : s))
				: [...prev, { name: n, icon }],
		);
		setAppView("library");
		setActiveTab(`cat:${n}`);
	};
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

	// Brain: reconcile local project documents with the server mirror, and
	// materialize any AI-authored edit recipes into real projects, once the
	// store is loaded.
	const brainSyncedRef = useRef(false);
	useEffect(() => {
		if (!isInitialized || brainSyncedRef.current) return;
		const metas = [...allProjects, ...allTemplates].map((p) => ({
			id: p.id,
			updatedAt: p.updatedAt,
		}));
		if (metas.length === 0 && !userId) return;
		brainSyncedRef.current = true;
		void import("@/brain/project-sync")
			.then((m) => m.bulkSyncProjects(metas))
			.catch(() => {});
		void import("@/brain/edit-materializer")
			.then((m) => m.materializePendingEdits(editor, userId ?? ""))
			.then((built) => {
				// The materializer owns the progress/success toast; just refresh.
				if (built > 0) void editor.project.loadAllProjects();
			})
			.catch(() => {});
	}, [isInitialized, allProjects, allTemplates, editor, userId]);
	// Multi-tenant: every signed-in user gets their own Publish + inbox (each
	// scoped to their own connected channels). Signed-out visitors see a preview.
	const isOwner = !!session?.user?.id;
	const { resolvedTheme } = useTheme();
	const [owner, setOwner] = useState("");
	const [items, setItems] = useState<VaultItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [text, setText] = useState("");
	const [busy, setBusy] = useState(false);
	// The open tab lives in the URL (?tab=…) so a refresh or coming back from
	// the editor lands on the same category instead of resetting to "all".
	// sessionStorage is the fallback when the URL has no tab.
	const [activeTab, setActiveTab] = useState<string>(() => {
		if (typeof window === "undefined") return "all";
		const p = new URLSearchParams(window.location.search);
		const cat = p.get("cat");
		if (cat) return `cat:${cat}`;
		return p.get("tab") || sessionStorage.getItem("vault-active-tab") || "all";
	});
	// Mirror the current view + tab into the URL (and sessionStorage) so a
	// refresh or a back-from-editor restores both — building the query from
	// scratch so we never leave a stale/contradictory param (e.g. a tab on the
	// Home view). Home is the clean default "/projects".
	useEffect(() => {
		if (typeof window === "undefined") return;
		sessionStorage.setItem("vault-active-tab", activeTab);
		sessionStorage.setItem("vault-app-view", appView);
		const params = new URLSearchParams();
		if (appView !== "home") params.set("view", appView);
		if (appView === "library") {
			if (activeTab.startsWith("cat:")) params.set("cat", activeTab.slice(4));
			else if (activeTab !== "all") params.set("tab", activeTab);
		}
		const qs = params.toString();
		const next = qs ? `/projects?${qs}` : "/projects";
		if (`${window.location.pathname}${window.location.search}` !== next) {
			window.history.replaceState(null, "", next);
		}
	}, [activeTab, appView]);
	// Asset detail opens inline (sidebar stays); cleared whenever you navigate.
	const [selectedAsset, setSelectedAsset] = useState<VaultItem | null>(null);
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

	const librarySearchRef = useRef<HTMLInputElement | null>(null);
	const onChange = (v: string) => {
		setText(v);
		setSearchQuery({ query: isUrl(v) ? "" : v });
		// Typing a search on Home flips straight into the library results;
		// the library search box (same state) picks up focus so typing never
		// gets interrupted.
		if (appView === "home" && v.trim() && !isUrl(v)) setAppView("library");
	};
	useEffect(() => {
		if (appView !== "library") return;
		const el = librarySearchRef.current;
		if (el && text.trim() && document.activeElement !== el) {
			el.focus();
			el.setSelectionRange(el.value.length, el.value.length);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [appView]);

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
			setAppView("library");
			setActiveTab(item.kind);
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
			setAppView("library");
			if (added[0]) setActiveTab(added[0].kind);
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: close the sheet on any navigation
	useEffect(() => setMobileNav(false), [appView, activeTab]);
	// Any navigation closes the inline asset detail.
	useEffect(() => setSelectedAsset(null), [appView, activeTab]);
	// Instagram-style incremental rendering for big libraries.
	const [visibleCount, setVisibleCount] = useState(24);
	const moreRef = useRef<HTMLDivElement | null>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset on tab change
	useEffect(() => setVisibleCount(24), [activeTab, appView]);
	useEffect(() => {
		const el = moreRef.current;
		if (!el) return;
		const io = new IntersectionObserver(
			(es) => es[0]?.isIntersecting && setVisibleCount((c) => c + 24),
			{ rootMargin: "600px" },
		);
		io.observe(el);
		return () => io.disconnect();
	});

	const [confirmAsk, setConfirmAsk] = useState<{
		title: string;
		body: string;
		confirmLabel: string;
		onConfirm: () => void;
	} | null>(null);

	const deleteProject = (p: TProjectMetadata) => {
		setConfirmAsk({
			title: `Delete "${p.name}"?`,
			body: "The project and its media are removed permanently. This can't be undone.",
			confirmLabel: "Delete project",
			onConfirm: () => void editor.project.deleteProjects({ ids: [p.id] }),
		});
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
		setConfirmAsk({
			title: `Remove the "${name}" category?`,
			body: `${n} item${n === 1 ? "" : "s"} keep${n === 1 ? "s" : ""} their files — only the category label is removed.`,
			confirmLabel: "Remove category",
			onConfirm: () => {
				for (const i of items) {
					if (!(i.tags ?? []).includes(name)) continue;
					void setItemTags(
						i.id,
						(i.tags ?? []).filter((t) => t !== name),
					);
				}
				setCustomSections((prev) => prev.filter((sec) => sec.name !== name));
				if (activeTab === `cat:${name}`) setActiveTab("all");
			},
		});
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

	// AI Clips: new project containing the source video pre-trimmed to the
	// suggested range, then straight into the editor.
	const makeClipProject = async (
		item: VaultItem,
		clip: ClipSuggestion,
		opts: {
			segments: { text: string; start: number; end: number }[];
			captions: boolean;
			navigate: boolean;
		},
	): Promise<string | null> => {
		const tid = toast.loading(`Cutting "${clip.title}"…`);
		try {
			const name = (clip.title || item.name || "Clip").slice(0, 60);
			const projectId = await editor.project.createNewProject({ name });
			const m = item.media.find((x) => x.type === "video");
			if (!m) throw new Error("No video media on this item");
			const blob = await (await fetch(fileUrl(m.key))).blob();
			const file = new File([blob], `${name}.${m.ext || "mp4"}`, {
				type: m.contentType || blob.type,
			});
			const [processed] = await processMediaAssets({ files: [file] });
			if (!processed) throw new Error("Couldn't process the video");
			const asset = await editor.media.addMediaAsset({
				projectId,
				asset: processed,
			});
			const assetId = (asset as { id?: string } | null)?.id ?? "";
			if (!assetId) throw new Error("Couldn't add the video to the project");
			const sourceDur = processed.duration ?? clip.end;
			const start = Math.max(0, Math.min(clip.start, sourceDur));
			const end = Math.max(start + 1, Math.min(clip.end, sourceDur));
			const element = buildElementFromMedia({
				mediaId: assetId,
				mediaType: "video",
				name,
				duration: mediaTimeFromSeconds({ seconds: end - start }),
				startTime: mediaTimeFromSeconds({ seconds: 0 }),
			}) as ReturnType<typeof buildElementFromMedia> & {
				trimStart?: unknown;
				trimEnd?: unknown;
				sourceDuration?: unknown;
			};
			element.trimStart = mediaTimeFromSeconds({ seconds: start });
			element.trimEnd = mediaTimeFromSeconds({
				seconds: Math.max(0, sourceDur - end),
			});
			element.sourceDuration = mediaTimeFromSeconds({ seconds: sourceDur });
			editor.timeline.insertElement({ element, placement: { mode: "auto" } });

			// Burn the transcript into auto-captions, re-timed to the clip.
			if (opts.captions && opts.segments.length > 0) {
				const cues = opts.segments
					.filter((seg) => seg.end > start + 0.2 && seg.start < end - 0.2)
					.map((seg) => {
						const cueStart = Math.max(0, seg.start - start);
						const cueEnd = Math.min(end - start, seg.end - start);
						return {
							text: seg.text,
							startTime: cueStart,
							duration: Math.max(0.4, cueEnd - cueStart),
						};
					});
				if (cues.length > 0) {
					insertCaptionChunksAsTextTrack({ editor, captions: cues });
				}
			}

			await editor.project.saveCurrentProject();
			toast.success("Clip ready", { id: tid });
			if (opts.navigate) router.push(`/editor/${projectId}`);
			return projectId;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't create clip", {
				id: tid,
			});
			return null;
		}
	};

	// Straight-to-publish: build each clip project, export it headlessly,
	// upload the mp4 to the vault and park platform DRAFTS in Publish.
	const clipAndQueue = async (
		item: VaultItem,
		clips: ClipSuggestion[],
		opts: {
			segments: { text: string; start: number; end: number }[];
			captions: boolean;
		},
	) => {
		let queued = 0;
		for (let i = 0; i < clips.length; i++) {
			const clip = clips[i];
			const pid = await makeClipProject(item, clip, {
				...opts,
				navigate: false,
			});
			if (!pid) continue;
			const tid = toast.loading(
				`Exporting ${i + 1}/${clips.length}: "${clip.title}"…`,
			);
			let step = "export";
			try {
				const project = editor.project.getActive();
				// Captions need their fonts in document.fonts before rendering —
				// outside the editor route nothing preloaded them.
				await loadFonts({
					families: [
						...new Set(
							getElementFontFamilies({
								tracks: editor.scenes.getActiveScene().tracks,
							}),
						),
					],
				}).catch(() => {});
				await new Promise((r) => setTimeout(r, 50));
				const result = await editor.project.export({
					options: {
						format: "mp4",
						quality: "high",
						fps: project.settings.fps,
						includeAudio: true,
					},
				});
				if (!result.success || !result.buffer) {
					throw new Error(result.error || "Export failed");
				}
				step = "upload";
				const vaultId = await uploadExportToVault({
					owner,
					name: clip.title,
					data: result.buffer,
					ext: "mp4",
					contentType: "video/mp4",
					kind: "video",
					durationSec: clip.end - clip.start,
				});
				step = "draft";
				const r = await fetch("/api/publish-post", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						owner,
						itemId: vaultId,
						platforms: ["youtube", "instagram"],
						title: clip.title,
						caption: clip.hook || clip.title,
						description: clip.reason || clip.hook || clip.title,
						scheduledFor: Date.now() + (queued + 1) * 86400_000,
						draft: true,
					}),
				});
				const d = (await r.json().catch(() => ({}))) as { error?: string };
				if (!r.ok) throw new Error(d.error || "Couldn't queue draft");
				queued++;
				toast.success(`Drafted "${clip.title}"`, { id: tid });
			} catch (e) {
				console.error("clip&queue failed at", step, e);
				toast.error(
					`${step}: ${e instanceof Error ? e.message : "Failed"}`,
					{ id: tid, duration: 10000 },
				);
			} finally {
				editor.project.clearExportState();
			}
		}
		editor.project.closeProject();
		const next = await fetchVault(owner).catch(() => null);
		if (next) setItems(next);
		if (queued > 0) {
			toast.success(
				`${queued} clip${queued === 1 ? "" : "s"} drafted — review them in Publish → Drafts`,
				{ duration: 9000 },
			);
			setAppView("publish");
		}
	};

	// Draft -> published: render the project (video for editor projects, image
	// or carousel for canvas) into a real library item, then open it so the
	// title/caption can be polished right away.
	const publishingRef = useRef(false);
	const publishProject = async (p: TProjectMetadata) => {
		if (publishingRef.current) return;
		publishingRef.current = true;
		const tid = toast.loading(`Publishing "${p.name}"…`);
		try {
			await editor.project.loadProject({ id: p.id });
			const project = editor.project.getActive();
			let vaultId: string;
			let kind: VaultItem["kind"];
			if (p.isCanvas) {
				const scenes = editor.scenes.getScenes();
				const mediaAssets = editor.media.getAssets();
				const blobs = await renderPagesToBlobs({
					project,
					scenes,
					mediaAssets,
					onProgress: (d, t) =>
						toast.loading(`Rendering page ${d}/${t}…`, { id: tid }),
				});
				if (blobs.length === 0) throw new Error("Nothing to render yet");
				if (blobs.length === 1) {
					kind = "image";
					vaultId = await uploadExportToVault({
						owner,
						name: p.name,
						data: blobs[0],
						ext: "png",
						contentType: "image/png",
						kind: "image",
					});
				} else {
					kind = "carousel";
					vaultId = await uploadCarouselToVault({
						owner,
						name: p.name,
						pages: blobs,
						onProgress: (d, t) =>
							toast.loading(`Uploading ${d}/${t}…`, { id: tid }),
					});
				}
			} else {
				// loadProject already pulled the fonts; give layout one tick.
				await new Promise((r) => setTimeout(r, 50));
				const result = await editor.project.export({
					options: {
						format: "mp4",
						quality: "high",
						fps: project.settings.fps,
						includeAudio: true,
					},
				});
				if (!result.success || !result.buffer) {
					throw new Error(result.error || "Export failed");
				}
				toast.loading("Uploading…", { id: tid });
				kind = "video";
				vaultId = await uploadExportToVault({
					owner,
					name: p.name,
					data: result.buffer,
					ext: "mp4",
					contentType: "video/mp4",
					kind: "video",
				});
			}

			// Flip the project out of draft state.
			editor.project.getActive().metadata.publishedItemId = vaultId;
			await editor.project.saveCurrentProject();

			const next = await fetchVault(owner).catch(() => null);
			if (next) setItems(next);
			setAppView("library");
			setActiveTab(kind === "video" ? "video" : kind);
			toast.success("Published to your library", { id: tid });
			// Open the new item inline so its title/caption can be polished.
			const fresh = next?.find((i) => i.id === vaultId) ?? null;
			if (fresh) setTimeout(() => setSelectedAsset(fresh), 0);
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : "Couldn't publish the project",
				{ id: tid },
			);
		} finally {
			editor.project.clearExportState();
			editor.project.closeProject();
			publishingRef.current = false;
		}
	};

	const createBlankProject = async () => {
		const id = await editor.project.createNewProject({ name: "New project" });
		router.push(`/editor/${id}`);
	};

	const [newCanvasOpen, setNewCanvasOpen] = useState(false);
	const createCanvas = async (size: { width: number; height: number }) => {
		const id = await editor.project.createNewProject({
			name: "New canvas",
			canvasSize: size,
			isCanvas: true,
		});
		router.push(`/canvas/${id}`);
	};

	// Open the inline asset detail. setAppView may fire the clear-on-nav effect,
	// so set the asset on the next tick so it wins.
	const openAsset = (i: VaultItem) => {
		setAppView("library");
		setTimeout(() => setSelectedAsset(i), 0);
	};

	// Carousel / image -> a static Canvas project: one page per image.
	const openInCanvas = async (item: VaultItem) => {
		const tid = toast.loading("Building canvas…");
		try {
			const imgs = item.media.filter((m) => m.type === "image");
			if (imgs.length === 0) throw new Error("No images to place");
			// Size the canvas to the first image so pages aren't letterboxed.
			const size = await new Promise<{ width: number; height: number }>((resolve) => {
				const im = new Image();
				im.onload = () =>
					resolve({ width: im.naturalWidth || 1080, height: im.naturalHeight || 1350 });
				im.onerror = () => resolve({ width: 1080, height: 1350 });
				im.src = fileUrl(imgs[0].key);
			});
			const id = await editor.project.createNewProject({
				name: item.name || "Canvas",
				canvasSize: size,
				isCanvas: true,
			});
			const scenes = editor.scenes.getScenes();
			let mainSceneId = scenes[0]?.id;
			for (let i = 0; i < imgs.length; i++) {
				const blob = await (await fetch(fileUrl(imgs[i].key))).blob();
				const file = new File([blob], `page-${i + 1}.${imgs[i].ext || "png"}`, {
					type: imgs[i].contentType || blob.type || "image/png",
				});
				const [asset] = await processMediaAssets({ files: [file] });
				if (!asset) continue;
				let sceneId = mainSceneId;
				if (i > 0) {
					sceneId = await editor.scenes.createScene({
						name: `Page ${i + 1}`,
						isMain: false,
					});
				}
				if (sceneId) await editor.scenes.switchToScene({ sceneId });
				const addCmd = new AddMediaAssetCommand({ projectId: id, asset });
				const element = buildElementFromMedia({
					mediaId: addCmd.getAssetId(),
					mediaType: "image",
					name: asset.name,
					duration: mediaTimeFromSeconds({ seconds: 5 }),
					startTime: mediaTimeFromSeconds({ seconds: 0 }),
				});
				const insertCmd = new InsertElementCommand({
					element,
					placement: { mode: "auto", trackType: "video" },
				});
				editor.command.execute({ command: new BatchCommand([addCmd, insertCmd]) });
			}
			if (mainSceneId) await editor.scenes.switchToScene({ sceneId: mainSceneId });
			await editor.project.saveCurrentProject();
			toast.success("Opening canvas…", { id: tid });
			router.push(`/canvas/${id}`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't open in canvas", {
				id: tid,
			});
		}
	};

	// Canvas projects open in the static design editor, everything else in /editor.
	const projectHref = (p: TProjectMetadata) =>
		p.isCanvas ? `/canvas/${p.id}` : `/editor/${p.id}`;

	const useTemplate = async (t: TProjectMetadata) => {
		const tid = toast.loading("Creating project from template…");
		try {
			const id = await editor.project.createProjectFromTemplate({
				templateId: t.id,
			});
			toast.success("Project created", { id: tid });
			router.push(t.isCanvas ? `/canvas/${id}` : `/editor/${id}`);
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
		// Projects can be categorised too (e.g. a batch of "CTW Final" drafts),
		// so a category tab can hold vault items, projects, or both.
		for (const p of projects) {
			if (p.category) cc[p.category] = (cc[p.category] || 0) + 1;
		}
		return {
			categories: Object.keys(cc).sort((a, b) => a.localeCompare(b)),
			catCounts: cc,
		};
	}, [visibleItems, projects]);
	// Merge tag-derived categories with user-created (possibly empty) sections.
	const sectionNames = useMemo(
		() =>
			Array.from(
				new Set([...categories, ...customSections.map((s) => s.name)]),
			).sort((a, b) => a.localeCompare(b)),
		[categories, customSections],
	);
	const sectionIcon = (name: string) =>
		customSections.find((s) => s.name === name)?.icon ?? "";
	// Note: we intentionally do NOT auto-reset a "cat:" tab when it's missing
	// from sectionNames — categories (vault tags vs project categories) load at
	// different times, and that race was wiping a restored tab back to "All".
	// Category deletion/rename are handled explicitly where they happen.
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
		activeTab === "all" || activeTab === "projects"
			? projects
			: activeTab.startsWith("cat:")
				? projects.filter((p) => p.category === activeTab.slice(4))
				: [];
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
		...TABS.filter((t) => STICKY_TABS.has(t.key) || counts[t.key]).map((t) => ({
			key: t.key,
			label: t.label,
			Icon: t.Icon,
			count: counts[t.key] || 0,
			cat: "",
		})),
		{
			key: "templates",
			label: "Templates",
			Icon: LayoutTemplate,
			count: templates.length,
			cat: "",
		},
		...sectionNames.map((c) => ({
			key: `cat:${c}`,
			label: c,
			Icon: ICON_MAP[sectionIcon(c)] ?? Hash,
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
			onClick: () => router.push(projectHref(p)),
			onPin: () => togglePin(p.id),
			onRename: () =>
				setRenaming({ id: p.id, name: p.name, kind: "project" as const }),
			onCopyLink: () => copyLink(`${location.origin}${projectHref(p)}`),
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
				if (i.kind === "audio") {
					setAppView("library");
					togglePlay(i);
				} else openAsset(i);
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
		<div className="text-foreground flex h-screen overflow-hidden bg-[var(--mono-app)]">
			{/* Desktop sidebar (inline) */}
			<div className="hidden lg:contents">
				<LibrarySidebar
				collapsed={collapsed}
				onToggleCollapse={() => setCollapsed((c) => !c)}
				onOpenSearch={() => setSearchOpen(true)}
				appView={appView}
				onSelectHome={() => setAppView("home")}
				onSelectLibrary={() => { setSelectedAsset(null); setAppView("library"); }}
				onSelectPublish={() => setAppView("publish")}
				onSelectStudio={() => setAppView("studio")}
				onSelectBio={() => setAppView("bio")}
				onSelectClips={() => setAppView("clips")}
					onSelectBrand={() => setAppView("brand")}
					inboxTab={inboxTab}
					onSelectInboxTab={selectInboxTab}
				navTabs={navTabs}
				activeTab={activeTab}
				onSelectTab={(k) => {
					setAppView("library");
					setActiveTab(k);
				}}
				onNewProject={createBlankProject}
				onNewCanvas={() => setNewCanvasOpen(true)}
				onRenameCat={setRenamingCat}
				onDeleteCat={deleteCategory}
				onNewSection={() => setNewSectionOpen(true)}
				recents={recents}
				categories={categories}
			/>
			</div>
			{/* Mobile: floating opener + slide-over (overlays, never pushes) */}
			{!mobileNav && (
				<button
					type="button"
					onClick={() => setMobileNav(true)}
					aria-label="Open menu"
					className="fixed top-3 left-3 z-40 flex size-10 items-center justify-center rounded-full border border-[var(--mono-line)] bg-[var(--mono-panel)] text-[var(--mono-ink-2)] shadow-lg lg:hidden"
				>
					<PanelLeft className="size-4" />
				</button>
			)}
			<div
				className={cn(
					"fixed inset-0 z-50 lg:hidden",
					!mobileNav && "pointer-events-none",
				)}
			>
				<div
					className={cn(
						"absolute inset-0 bg-black/60 transition-opacity duration-200",
						mobileNav ? "opacity-100" : "opacity-0",
					)}
					onClick={() => setMobileNav(false)}
					onKeyDown={(e) => e.key === "Escape" && setMobileNav(false)}
					role="button"
					tabIndex={-1}
					aria-label="Close menu"
				/>
				<div
					className={cn(
						"absolute inset-y-0 left-0 flex transition-transform duration-200",
						mobileNav ? "translate-x-0" : "-translate-x-full",
					)}
				>
					<LibrarySidebar
				collapsed={collapsed}
				onToggleCollapse={() => setCollapsed((c) => !c)}
				onOpenSearch={() => setSearchOpen(true)}
				appView={appView}
				onSelectHome={() => setAppView("home")}
				onSelectLibrary={() => { setSelectedAsset(null); setAppView("library"); }}
				onSelectPublish={() => setAppView("publish")}
				onSelectStudio={() => setAppView("studio")}
				onSelectBio={() => setAppView("bio")}
					onSelectClips={() => setAppView("clips")}
					onSelectBrand={() => setAppView("brand")}
					inboxTab={inboxTab}
					onSelectInboxTab={selectInboxTab}
				navTabs={navTabs}
				activeTab={activeTab}
				onSelectTab={(k) => {
					setAppView("library");
					setActiveTab(k);
				}}
				onNewProject={createBlankProject}
				onNewCanvas={() => setNewCanvasOpen(true)}
				onRenameCat={setRenamingCat}
				onDeleteCat={deleteCategory}
				onNewSection={() => setNewSectionOpen(true)}
				recents={recents}
				categories={categories}
			/>
				</div>
			</div>
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
				{selectedAsset ? (
					<AssetDetail
						item={selectedAsset}
						owner={owner}
						onBack={() => setSelectedAsset(null)}
						onSaved={(u) => {
							setItems((prev) => prev.map((i) => (i.id === u.id ? u : i)));
							setSelectedAsset(u);
						}}
						onOpenEditor={addToProject}
						onOpenCanvas={openInCanvas}
						onCompose={(it) => {
							setSelectedAsset(null);
							setComposePrefill(it.id);
							setAppView("publish");
						}}
					/>
				) : appView === "studio" ? (
					<StudioPane owner={owner} isOwner={isOwner} />
				) : appView === "publish" ? (
					<PublishPane
						items={visibleItems}
						owner={owner}
						isOwner={isOwner}
						initialComposeItem={composePrefill}
						categories={sectionNames}
					/>
				) : appView === "bio" ? (
					<BioBuilder owner={owner} />
				) : appView === "brand" ? (
					<BrandKitView owner={owner} />
				) : appView === "inbox" ? (
					<InboxView owner={owner} preview={!isOwner} tab={inboxTab} />
				) : appView === "clips" ? (
					<ClipsStudio
						items={visibleItems}
						onMakeProject={makeClipProject}
						onClipQueue={clipAndQueue}
						onImportLink={async (url) => {
							try {
								const item = await importLinkToVault(owner, url, "video");
								setItems((prev) => [item, ...prev]);
								return item;
							} catch (e) {
								toast.error(
									e instanceof Error ? e.message : "Import failed",
								);
								return null;
							}
						}}
					/>
				) : (
					<div className="px-4 pb-24 sm:px-8">
						{appView === "library" && (
							<div className="flex items-center gap-3 pt-14 lg:pt-4">
								<div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--mono-line)] bg-[var(--mono-hover)] px-4 py-2">
									<Search className="size-4 shrink-0 text-[var(--mono-ink-3)]" />
									<input
										ref={librarySearchRef}
										value={text}
										onChange={(e) => onChange(e.target.value)}
										placeholder="Search your library and projects…"
										className="min-w-0 flex-1 bg-transparent text-sm text-[var(--mono-ink)] outline-none placeholder:text-[var(--mono-ink-2)]"
									/>
									{text && (
										<button
											type="button"
											aria-label="Clear search"
											onClick={() => onChange("")}
											className="text-[var(--mono-ink-3)] hover:text-[var(--mono-ink)]"
										>
											<X className="size-4" />
										</button>
									)}
								</div>
								<ViewToggle
									viewMode={viewMode}
									setViewMode={setViewMode}
									isHydrated={isHydrated}
								/>
							</div>
						)}
						{appView === "home" && (<>
						{/* Hero */}
			<div className="flex flex-col items-center pt-16 pb-2 sm:pt-24">
				<ParticleTextEffect
					key={resolvedTheme}
					text="What will you create today?"
					colors={
						resolvedTheme === "light"
							? ["3c3326", "6b5234", "a8632e", "c98a4e", "55503f"]
							: undefined
					}
					className="mb-4 h-24 w-full max-w-3xl sm:h-28"
				/>
				<div className="w-full max-w-2xl">
					<div
						className={cn(
							"bg-card flex items-center gap-2 rounded-[1.75rem] border py-2 pr-2 pl-5 shadow-sm transition-colors",
							urlMode
								? "border-primary/60"
								: "border-border focus-within:border-foreground/30",
						)}
					>
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
								if (e.key !== "Enter") return;
								e.preventDefault();
								if (urlMode) void submit();
								else if (text.trim()) setAppView("library");
							}}
							placeholder="Paste a link to import, or search your projects…"
							disabled={busy}
							className="text-[var(--mono-ink)] placeholder:text-[var(--mono-ink-2)] flex-1 bg-transparent py-1.5 text-base outline-none"
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
					<div className="mt-3 flex items-center gap-1.5">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button type="button" className={HOME_CHIP_CLS}>
									<Zap className="size-3.5" />
									Quick actions
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								<DropdownMenuItem onClick={createBlankProject}>
									<Plus className="size-4" /> New project
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setNewCanvasOpen(true)}>
									<Frame className="size-4" /> Create post
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={() => fileInputRef.current?.click()}
								>
									<Paperclip className="size-4" /> Import media
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setAppView("publish")}>
									<Rocket className="size-4" /> Open Publish
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button type="button" className={HOME_CHIP_CLS}>
									<Globe className="size-3.5" />
									Channels
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start">
								{PLATFORMS.map((p) => (
									<DropdownMenuItem key={p.label}>
										<p.Icon className="size-4" style={p.color ? { color: p.color } : undefined} />
										{p.label}
										<Check className="ml-auto size-3.5 text-green-500/90" />
									</DropdownMenuItem>
								))}
							</DropdownMenuContent>
						</DropdownMenu>
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className={HOME_CHIP_CLS}
						>
							<Paperclip className="size-3.5" />
							Import media
						</button>
					</div>
				</div>
			</div>

			<HomeDashboard
				assetCount={counts.all || 0}
				projectCount={counts.projects || 0}
				isOwner={isOwner}
				owner={owner}
			/>
			</>)}

			{/* Library grid (navigation lives in the sidebar now) */}
			{appView === "library" && (
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
					<LibraryEmptyState
						tab={activeTab}
						label={navTabs.find((t) => t.key === activeTab)?.label ?? activeTab}
						query={text.trim()}
					/>
				) : (
					<div
						className={
							listView
								? "flex flex-col gap-0.5"
								: "grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3"
						}
					>
						{(() => {
							const projectCell = (p: TProjectMetadata) => {
								const props = {
									project: p,
									badge: p.isCanvas ? "Canvas" : "Project",
									onOpen: () => router.push(projectHref(p)),
									onRename: () =>
										setRenaming({ id: p.id, name: p.name, kind: "project" as const }),
									onDelete: () => deleteProject(p),
									onPublish: () => void publishProject(p),
								};
								return {
									t: Number(new Date(p.updatedAt)) || 0,
									node: listView ? (
										<ProjectRow key={p.id} {...props} />
									) : (
										<ProjectCard key={p.id} {...props} />
									),
								};
							};
							const vaultCell = (item: VaultItem) => {
								const props = {
									item,
									allCategories: categories,
									onOpen: () =>
										item.kind === "audio"
											? togglePlay(item)
											: openAsset(item),
									onAdd: () => addToProject(item),
									onRename: () =>
										setRenaming({ id: item.id, name: item.name, kind: "vault" as const }),
									onRemove: () => remove(item),
									onToggleCategory: (cat: string) => toggleCategory(item, cat),
									onNewCategory: () => setCatFor(item),
									onCaption: () => setCaptionItem(item),
									onCopyCaption: () => copyCaption(item),
								};
								return {
									t: item.createdAt || 0,
									node: listView ? (
										<VaultRow key={item.id} {...props} />
									) : (
										<VaultTile
											key={item.id}
											{...props}
											playing={playingId === item.id}
										/>
									),
								};
							};
							const templateCell = (t: TProjectMetadata) => {
								const props = {
									project: t,
									badge: "Template",
									openLabel: "Use template",
									onOpen: () => useTemplate(t),
									onRename: () =>
										setRenaming({ id: t.id, name: t.name, kind: "project" as const }),
									onDelete: () => deleteProject(t),
								};
								return {
									t: Number(new Date(t.updatedAt)) || 0,
									node: listView ? (
										<ProjectRow key={t.id} {...props} />
									) : (
										<ProjectCard key={t.id} {...props} />
									),
								};
							};
							const cells = [
								...shownProjects.map(projectCell),
								...shownVault.map(vaultCell),
								...shownTemplates.map(templateCell),
							];
							// "All" interleaves everything newest-first so fresh imports
							// surface at the top instead of under the project pile;
							// single-type tabs keep their existing order.
							if (activeTab === "all") cells.sort((a, b) => b.t - a.t);
							return (
								<>
									{cells.slice(0, visibleCount).map((c) => c.node)}
									{cells.length > visibleCount && (
										<div ref={moreRef} className="col-span-full h-2" />
									)}
								</>
							);
						})()}
					</div>
				)}
			</div>
			)}
					</div>
				)}

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
			<NewSectionDialog
				open={newSectionOpen}
				onOpenChange={setNewSectionOpen}
				onCreate={createSection}
			/>
			<NewCanvasDialog
				open={newCanvasOpen}
				onOpenChange={setNewCanvasOpen}
				onCreate={createCanvas}
			/>
			<ConfirmDialog ask={confirmAsk} onClose={() => setConfirmAsk(null)} />

			</main>
			{searchOpen && (
				<SearchModal
					items={items}
					projects={projects}
					onClose={() => setSearchOpen(false)}
					onSelectVault={(i) => {
						setSearchOpen(false);
						if (i.kind === "audio") {
							setAppView("library");
							togglePlay(i);
						} else openAsset(i);
					}}
					onSelectProject={(p) => {
						setSearchOpen(false);
						router.push(projectHref(p));
					}}
				/>
			)}
		</div>
	);
}

function ConfirmDialog({
	ask,
	onClose,
}: {
	ask: {
		title: string;
		body: string;
		confirmLabel: string;
		onConfirm: () => void;
	} | null;
	onClose: () => void;
}) {
	return (
		<Dialog open={!!ask} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-sm gap-0 rounded-2xl border-[var(--mono-line)] bg-[var(--mono-panel)] p-0 text-[var(--mono-ink)]">
				<div className="p-6">
					<DialogTitle className="text-[15px] font-semibold text-[var(--mono-ink)]">
						{ask?.title}
					</DialogTitle>
					<p className="mt-2 text-sm leading-relaxed text-[var(--mono-ink-2)]">
						{ask?.body}
					</p>
				</div>
				<div className="flex items-center justify-end gap-3 border-t border-[var(--mono-line)] px-6 py-4">
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={() => {
							ask?.onConfirm();
							onClose();
						}}
					>
						{ask?.confirmLabel}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// Real overview under the hero: live activity feed + publishing series.
function HomeDashboard({
	assetCount,
	projectCount,
	isOwner,
	owner,
}: {
	assetCount: number;
	projectCount: number;
	isOwner: boolean;
	owner: string;
}) {
	const [pub, setPub] = useState<{ published?: number; queued?: number }>({});
	const [activity, setActivity] = useState<{
		feed: { what: string; who: string; when: string }[];
		series: { day: string; n: number }[];
		platforms?: { platform: string; n: number }[];
		counts: { published30: number; queued: number; failed30: number };
	} | null>(null);
	useEffect(() => {
		if (isOwner) {
			fetch("/api/publish/status")
				.then((r) => (r.ok ? r.json() : null))
				.then((d) => setPub(d?.counts ?? {}))
				.catch(() => {});
		}
		if (!owner) return;
		fetch(
			`/api/activity?owner=${encodeURIComponent(owner)}&publish=${isOwner ? "1" : "0"}`,
		)
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => setActivity(d))
			.catch(() => setActivity(null));
	}, [isOwner, owner]);

	const card =
		"rounded-xl border border-[var(--mono-line)] bg-[var(--mono-hover)]";
	const stats = [
		{ label: "Library assets", value: assetCount, sub: "across all sections" },
		{ label: "Projects", value: projectCount, sub: "edits in progress" },
		{ label: "Published", value: pub.published ?? "·", sub: "all-time posts" },
		{ label: "Queued", value: pub.queued ?? "·", sub: "waiting to go out" },
	];

	// Pad the 30-day series so the chart always shows a full month.
	const series = useMemo(() => {
		const map = new Map(
			(activity?.series ?? []).map((sd) => [sd.day, sd.n]),
		);
		const out: { day: string; n: number }[] = [];
		for (let i = 29; i >= 0; i--) {
			const d = new Date(Date.now() - i * 86400_000)
				.toISOString()
				.slice(0, 10);
			out.push({ day: d, n: map.get(d) ?? 0 });
		}
		return out;
	}, [activity]);
	const maxDay = Math.max(1, ...series.map((sd) => sd.n));
	const c30 = activity?.counts;
	const successRate =
		c30 && c30.published30 + c30.failed30 > 0
			? Math.round((c30.published30 / (c30.published30 + c30.failed30)) * 100)
			: null;

	return (
		<div className="mx-auto mt-12 w-full max-w-4xl">
			<div
				className={cn(
					card,
					"grid grid-cols-2 divide-x divide-y divide-[var(--mono-line)] overflow-hidden lg:grid-cols-4 lg:divide-y-0",
				)}
			>
				{stats.map((st) => (
					<div key={st.label} className="p-4">
						<div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]">
							{st.label}
						</div>
						<div className="mt-1.5 text-2xl font-semibold text-[var(--mono-ink)] tabular-nums">
							{st.value}
						</div>
						<div className="mt-0.5 text-[11px] text-[var(--mono-ink-3)]">
							{st.sub}
						</div>
					</div>
				))}
			</div>

			<div className="mt-3 grid gap-3 lg:grid-cols-3">
				{/* Publishing activity (real) */}
				<div className={cn(card, "flex flex-col p-4 lg:col-span-2")}>
					<div className="flex items-center justify-between">
						<span className="text-sm font-semibold text-[var(--mono-ink)]">
							<BarChart3 className="mr-1.5 inline size-4" />
							Publishing activity
						</span>
						<span className="text-[11px] text-[var(--mono-ink-3)]">
							last 30 days
						</span>
					</div>
					<div className="mt-4 flex items-center gap-4">
						<div>
							<div className="text-lg font-semibold text-[var(--mono-ink)]">
								{c30?.published30 ?? "·"}
							</div>
							<div className="text-[11px] text-[var(--mono-ink-3)]">
								Published · 30d
							</div>
						</div>
						<div>
							<div className="text-lg font-semibold text-[var(--mono-ink)]">
								{c30?.queued ?? "·"}
							</div>
							<div className="text-[11px] text-[var(--mono-ink-3)]">
								In queue
							</div>
						</div>
						<div>
							<div
								className={cn(
									"text-lg font-semibold",
									successRate == null
										? "text-[var(--mono-ink)]"
										: successRate >= 90
											? "text-green-500"
											: "text-amber-400",
								)}
							>
								{successRate == null ? "·" : `${successRate}%`}
							</div>
							<div className="text-[11px] text-[var(--mono-ink-3)]">
								Success rate
							</div>
						</div>
						<div>
							<div
								className={cn(
									"text-lg font-semibold",
									(c30?.failed30 ?? 0) > 0
										? "text-red-400"
										: "text-[var(--mono-ink)]",
								)}
							>
								{c30?.failed30 ?? "·"}
							</div>
							<div className="text-[11px] text-[var(--mono-ink-3)]">
								Failed · 30d
							</div>
						</div>
					</div>
					<div className="mt-4 flex min-h-28 flex-1 items-end gap-1">
						{series.map((sd) => (
							<div
								key={sd.day}
								title={`${sd.day}: ${sd.n}`}
								style={{ height: `${Math.max(3, (sd.n / maxDay) * 100)}%` }}
								className={cn(
									"flex-1 rounded-sm",
									sd.n > 0
										? "bg-[var(--mono-strong)]"
										: "bg-[var(--mono-line)]",
								)}
							/>
						))}
					</div>
					<div className="mt-2 flex justify-between text-[10px] text-[var(--mono-ink-3)]">
						<span>{series[0]?.day.slice(5)}</span>
						<span>{series[14]?.day.slice(5)}</span>
						<span>{series[29]?.day.slice(5)}</span>
					</div>
					{(activity?.platforms?.length ?? 0) > 0 && (
						<div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--mono-line)] pt-3">
							{activity?.platforms?.map((p) => (
								<span
									key={p.platform}
									className="flex items-center gap-1.5 rounded-full border border-[var(--mono-line)] px-2.5 py-1 text-[11px] text-[var(--mono-ink-2)] capitalize"
								>
									{pubPlatformIcon(p.platform)}
									{p.platform}
									<span className="font-semibold text-[var(--mono-ink)] tabular-nums">{p.n}</span>
								</span>
							))}
						</div>
					)}
				</div>

				{/* Activity feed (real) */}
				<div className={cn(card, "p-4")}>
					<div className="flex items-center justify-between">
						<span className="text-sm font-semibold text-[var(--mono-ink)]">
							<ScrollText className="mr-1.5 inline size-4" />
							Activity
						</span>
					</div>
					<div className="mt-3 max-h-[26rem] divide-y divide-[var(--mono-line)] overflow-y-auto pr-1">
						{!activity || activity.feed.length === 0 ? (
							<div className="py-4 text-sm text-[var(--mono-ink-3)]">
								Nothing yet — import something or schedule a post.
							</div>
						) : (
							activity.feed.map((a, i) => (
								<div key={`${a.what}-${i}`} className="py-2 first:pt-0 last:pb-0">
									<div className="truncate text-[13px] text-[var(--mono-ink-2)]">
										{a.what}
									</div>
									<div className="mt-0.5 text-[11px] text-[var(--mono-ink-3)]">
										{a.who} · {a.when}
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

const HOME_CHIP_CLS =
	"flex items-center gap-1.5 rounded-lg border border-[var(--mono-line)] bg-[var(--mono-hover)] px-2.5 py-1.5 text-xs text-[var(--mono-ink-2)] transition-colors hover:bg-[var(--mono-active)] hover:text-[var(--mono-ink)]";

function NewSectionDialog({
	open,
	onOpenChange,
	onCreate,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	onCreate: (name: string, icon: string) => void;
}) {
	const [name, setName] = useState("");
	const [icon, setIcon] = useState("hash");
	useEffect(() => {
		if (open) {
			setName("");
			setIcon("hash");
		}
	}, [open]);
	const submit = () => {
		if (!name.trim()) return;
		onCreate(name, icon);
		onOpenChange(false);
	};
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md gap-0 rounded-2xl border-[var(--mono-line)] bg-[var(--mono-panel)] p-0 text-[var(--mono-ink)]">
				<div className="border-b border-[var(--mono-line)] px-6 py-4">
					<DialogTitle className="text-[15px] font-semibold text-[var(--mono-ink)]">
						New section
					</DialogTitle>
				</div>
				<div className="p-6">
					<input
						// biome-ignore lint/a11y/noAutofocus: focus the field on open
						autoFocus
						value={name}
						onChange={(e) => setName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && submit()}
						placeholder="Section name"
						className="w-full rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-3.5 py-2.5 text-sm text-[var(--mono-ink)] outline-none transition-colors placeholder:text-[var(--mono-ink-3)] focus:border-[var(--mono-strong)]"
					/>
					<div className="mt-5">
						<div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]">
							Icon
						</div>
						<div className="grid grid-cols-8 gap-1.5">
							{SECTION_ICONS.map(({ name: n, Icon }) => {
								const on = icon === n;
								return (
									<button
										key={n}
										type="button"
										onClick={() => setIcon(n)}
										className={cn(
											"flex aspect-square items-center justify-center rounded-lg border transition-colors",
											on
												? "border-[var(--mono-strong)] bg-[var(--mono-active)] text-[var(--mono-ink)]"
												: "border-[var(--mono-line)] text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]",
										)}
									>
										<Icon className="size-4" />
									</button>
								);
							})}
						</div>
					</div>
				</div>
				<div className="flex items-center justify-end gap-3 border-t border-[var(--mono-line)] px-6 py-4">
					<Button variant="ghost" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={submit} disabled={!name.trim()}>
						Create section
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

const CANVAS_PRESETS = [
	{ label: "Instagram Post", hint: "4:5", width: 1080, height: 1350 },
	{ label: "Square", hint: "1:1", width: 1080, height: 1080 },
	{ label: "Story / Reel", hint: "9:16", width: 1080, height: 1920 },
	{ label: "Landscape", hint: "16:9", width: 1920, height: 1080 },
	{ label: "YouTube Thumbnail", hint: "16:9", width: 1280, height: 720 },
	{ label: "A4 Document", hint: "print", width: 2480, height: 3508 },
];

function NewCanvasDialog({
	open,
	onOpenChange,
	onCreate,
}: {
	open: boolean;
	onOpenChange: (o: boolean) => void;
	onCreate: (size: { width: number; height: number }) => Promise<void>;
}) {
	const [w, setW] = useState("1080");
	const [h, setH] = useState("1350");
	const [busy, setBusy] = useState(false);
	useEffect(() => {
		if (open) {
			setW("1080");
			setH("1350");
			setBusy(false);
		}
	}, [open]);

	const create = async (width: number, height: number) => {
		if (busy) return;
		if (
			!Number.isFinite(width) ||
			!Number.isFinite(height) ||
			width < 16 ||
			height < 16 ||
			width > 8192 ||
			height > 8192
		) {
			toast.error("Enter a size between 16 and 8192 px");
			return;
		}
		setBusy(true);
		try {
			await onCreate({ width: Math.round(width), height: Math.round(height) });
			onOpenChange(false);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't create canvas");
			setBusy(false);
		}
	};

	const fieldCls =
		"w-full rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-3.5 py-2.5 text-sm text-[var(--mono-ink)] outline-none transition-colors placeholder:text-[var(--mono-ink-3)] focus:border-[var(--mono-strong)]";

	return (
		<Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
			<DialogContent className="max-w-md gap-0 rounded-2xl border-[var(--mono-line)] bg-[var(--mono-panel)] p-0 text-[var(--mono-ink)]">
				<div className="border-b border-[var(--mono-line)] px-6 py-4">
					<DialogTitle className="text-[15px] font-semibold text-[var(--mono-ink)]">
						Create a post
					</DialogTitle>
				</div>
				<div className="p-6">
					<div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]">
						Custom size
					</div>
					<div className="flex items-end gap-2">
						<div className="flex-1">
							<label className="mb-1 block text-xs text-[var(--mono-ink-3)]">
								Width
							</label>
							<input
								value={w}
								onChange={(e) => setW(e.target.value.replace(/[^\d]/g, ""))}
								inputMode="numeric"
								className={fieldCls}
							/>
						</div>
						<span className="pb-2.5 text-[var(--mono-ink-3)]">×</span>
						<div className="flex-1">
							<label className="mb-1 block text-xs text-[var(--mono-ink-3)]">
								Height
							</label>
							<input
								value={h}
								onChange={(e) => setH(e.target.value.replace(/[^\d]/g, ""))}
								inputMode="numeric"
								className={fieldCls}
							/>
						</div>
						<Button
							onClick={() => create(Number(w), Number(h))}
							disabled={busy || !w || !h}
							className="shrink-0"
						>
							{busy ? "Creating…" : "Create"}
						</Button>
					</div>

					<div className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]">
						Suggested
					</div>
					<div className="grid grid-cols-2 gap-1.5">
						{CANVAS_PRESETS.map((p) => (
							<button
								key={p.label}
								type="button"
								disabled={busy}
								onClick={() => create(p.width, p.height)}
								className="rounded-xl border border-[var(--mono-line)] px-3 py-2.5 text-left transition-colors hover:bg-[var(--mono-hover)]"
							>
								<div className="text-[13px] font-medium text-[var(--mono-ink)]">
									{p.label}
								</div>
								<div className="text-[11px] text-[var(--mono-ink-3)]">
									{p.width} × {p.height} px · {p.hint}
								</div>
							</button>
						))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
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
					? "bg-[var(--mono-active)] text-[var(--mono-ink)]"
					: "text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]",
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

function SidebarGroupLabel({ children }: { children: React.ReactNode }) {
	return (
		<div className="px-2 pt-3 pb-1 text-[10px] font-semibold tracking-wide text-[var(--mono-ink-3)] uppercase">
			{children}
		</div>
	);
}

function CollapsibleGroup({
	label,
	open,
	onToggle,
	children,
}: {
	label: string;
	open: boolean;
	onToggle: () => void;
	children: React.ReactNode;
}) {
	return (
		<>
			<button
				type="button"
				onClick={onToggle}
				className="mt-2 flex w-full items-center gap-1 px-2 pt-1 pb-1 text-[10px] font-semibold tracking-wide text-[var(--mono-ink-3)] uppercase transition-colors hover:text-[var(--mono-ink-2)]"
			>
				<span className="flex-1 text-left">{label}</span>
				<ChevronDown
					className={cn(
						"size-3.5 shrink-0 transition-transform",
						!open && "-rotate-90",
					)}
				/>
			</button>
			{open && <div className="space-y-0.5">{children}</div>}
		</>
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
	onSelectHome,
	onSelectLibrary,
	onSelectPublish,
	onSelectStudio,
	onSelectBio,
	onSelectClips,
	onSelectBrand,
	inboxTab,
	onSelectInboxTab,
	navTabs,
	activeTab,
	onSelectTab,
	onNewProject,
	onNewCanvas,
	onRenameCat,
	onDeleteCat,
	onNewSection,
	recents,
	categories,
}: {
	collapsed: boolean;
	onToggleCollapse: () => void;
	onOpenSearch: () => void;
	appView: AppView;
	inboxTab: InboxTab;
	onSelectInboxTab: (t: InboxTab) => void;
	onSelectHome: () => void;
	onSelectLibrary: () => void;
	onSelectPublish: () => void;
	onSelectStudio: () => void;
	onSelectBio: () => void;
	onSelectClips: () => void;
	onSelectBrand: () => void;
	navTabs: NavTab[];
	activeTab: string;
	onSelectTab: (k: string) => void;
	onNewProject: () => void;
	onNewCanvas: () => void;
	onRenameCat: (c: string) => void;
	onDeleteCat: (c: string) => void;
	onNewSection: () => void;
	recents: RecentItem[];
	categories: string[];
}) {
	const { data: session } = useSession();
	const user = session?.user;
	const { resolvedTheme, setTheme } = useTheme();
	const [moreOpen, setMoreOpen] = useState(false);
	const [smOpen, setSmOpen] = useState(true);

	if (collapsed) {
		return (
			<aside className="m-2 flex w-16 shrink-0 flex-col items-center gap-1 rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-panel)] py-3 shadow-sm">
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
					onClick={onSelectHome}
					aria-label="Home"
					className={cn(
						"flex size-9 items-center justify-center rounded-md",
						appView === "home"
							? "bg-muted text-foreground"
							: "text-muted-foreground hover:text-foreground hover:bg-muted",
					)}
				>
					<HomeIcon className="size-5" />
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
					onClick={onNewCanvas}
					aria-label="Create post"
					className="text-muted-foreground hover:text-foreground hover:bg-muted flex size-9 items-center justify-center rounded-md"
				>
					<Frame className="size-5" />
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
				<button
					type="button"
					onClick={onSelectStudio}
					aria-label="Studio"
					className={cn(
						"flex size-9 items-center justify-center rounded-md",
						appView === "studio"
							? "bg-muted text-foreground"
							: "text-muted-foreground hover:text-foreground hover:bg-muted",
					)}
				>
					<Clapperboard className="size-5" />
				</button>
				<div className="mt-auto">
					<Avatar name={user?.name} image={user?.image} size={8} />
				</div>
			</aside>
		);
	}

	return (
		<aside className="m-2 flex w-72 shrink-0 flex-col rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-panel)] shadow-sm">
			<div className="flex items-center justify-between px-4 py-4">
				<button
					type="button"
					onClick={onSelectHome}
					className="text-foreground text-xl font-semibold tracking-tight"
				>
					Ultron<span className="ml-1.5 font-normal">Monolith</span>
				</button>
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
				<SidebarItem
					icon={HomeIcon}
					label="Home"
					active={appView === "home"}
					onClick={onSelectHome}
				/>

				<SidebarGroupLabel>Create</SidebarGroupLabel>
				<SidebarItem icon={Plus} label="New project" onClick={onNewProject} />
				<SidebarItem icon={Frame} label="Create post" onClick={onNewCanvas} />
				<SidebarItem
					icon={Clapperboard}
					label="Studio"
					badge="New"
					active={appView === "studio"}
					onClick={onSelectStudio}
				/>

				<SidebarGroupLabel>Workspace</SidebarGroupLabel>
				<SidebarItem
					icon={LibraryIcon}
					label="Library"
					active={appView === "library"}
					onClick={onSelectLibrary}
				/>
				<SidebarItem
					icon={Rocket}
					label="Publish"
					badge="Beta"
					active={appView === "publish"}
					onClick={onSelectPublish}
				/>

				<CollapsibleGroup
					label="SM Automation"
					open={smOpen}
					onToggle={() => setSmOpen((v) => !v)}
				>
					{INBOX_TABS.map((t) => (
						<SidebarItem
							key={t.key}
							icon={t.Icon}
							label={t.label}
							active={appView === "inbox" && inboxTab === t.key}
							onClick={() => onSelectInboxTab(t.key)}
						/>
					))}
				</CollapsibleGroup>

				<CollapsibleGroup
					label="More Tools"
					open={moreOpen}
					onToggle={() => setMoreOpen((v) => !v)}
				>
					<SidebarItem
						icon={Link2}
						label="Link in bio"
						active={appView === "bio"}
						onClick={onSelectBio}
					/>
					<SidebarItem
						icon={Scissors}
						label="Clipping Engine"
						active={appView === "clips"}
						onClick={onSelectClips}
					/>
					<SidebarItem
						icon={Palette}
						label="Brand kit"
						active={appView === "brand"}
						onClick={onSelectBrand}
					/>
				</CollapsibleGroup>
			</nav>

			<div className="flex items-center justify-between px-4 pt-4 pb-1">
				<span className="text-[11px] font-semibold tracking-wide text-[var(--mono-ink-3)] uppercase">
					Browse
				</span>
				<button
					type="button"
					onClick={onNewSection}
					aria-label="New section"
					title="New section"
					className="flex size-6 items-center justify-center rounded text-[var(--mono-ink-3)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
				>
					<Plus className="size-3.5" />
				</button>
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
										? "bg-[var(--mono-active)] text-[var(--mono-ink)]"
										: "text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]",
								)}
							>
								<t.Icon className="size-[15px] shrink-0" strokeWidth={1.75} />
								<span className="flex-1 truncate text-[13px]">{t.label}</span>
								{t.count > 0 && (
									<span
										className={cn(
											"text-[11px] tabular-nums text-[var(--mono-ink-3)]",
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
											className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded text-[var(--mono-ink-3)] opacity-0 transition-opacity hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)] group-hover/row:opacity-100 data-[state=open]:opacity-100"
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
							<div className="px-2 pt-4 pb-1 text-[11px] font-semibold tracking-wide text-[var(--mono-ink-3)] uppercase">
								Recents
							</div>
							{recents.map((r) => (
								<div key={r.key} className="group/row relative">
									<button
										type="button"
										onClick={r.onClick}
										title={r.label}
										className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1 pr-7 text-left text-[var(--mono-ink-2)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
									>
										<r.Icon className="size-[15px] shrink-0" strokeWidth={1.75} />
										<span className="flex-1 truncate text-[13px]">{r.label}</span>
										{r.pinned && (
											<Pin className="size-3 shrink-0 fill-current text-[var(--mono-ink-3)]" />
										)}
									</button>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<button
												type="button"
												aria-label="Item options"
												className="absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded text-[var(--mono-ink-3)] opacity-0 transition-opacity hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)] group-hover/row:opacity-100 data-[state=open]:opacity-100"
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
									
								</span>
								<ChevronDown className="text-muted-foreground size-4 shrink-0" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-56">
							<div className="text-muted-foreground truncate px-2 py-1.5 text-xs">
								{user.email}
							</div>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onSelect={(e) => {
									e.preventDefault();
									setTheme(resolvedTheme === "dark" ? "light" : "dark");
								}}
							>
								{resolvedTheme === "dark" ? (
									<Sun className="size-4" />
								) : (
									<Moon className="size-4" />
								)}
								{resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
							</DropdownMenuItem>
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
				className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-panel)] text-[var(--mono-ink)] shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center gap-2 border-b border-[var(--mono-line)] px-4">
					<Search className="text-muted-foreground size-4" />
					<input
						autoFocus
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="Search your library and projects…"
						className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-[var(--mono-ink-2)]"
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
	if (k.includes("linked")) return <Linkedin style={{ color: "#0A66C2" }} className="size-3.5" />;
	if (k.includes("reddit")) return <SiReddit style={{ color: "#FF4500" }} className="size-3.5" />;
	return <Send className="size-3.5" />;
}
function pubPlatformIconLg(p: string) {
	const k = (p || "").toLowerCase();
	if (k.includes("you")) return <SiYoutube style={{ color: "#FF0000" }} className="size-[18px]" />;
	if (k.includes("insta")) return <SiInstagram style={{ color: "#E4405F" }} className="size-[18px]" />;
	if (k.includes("tik")) return <SiTiktok className="size-[18px]" />;
	if (k.includes("linked")) return <Linkedin style={{ color: "#0A66C2" }} className="size-[18px]" />;
	if (k.includes("reddit")) return <SiReddit style={{ color: "#FF4500" }} className="size-[18px]" />;
	return <Send className="size-[18px]" />;
}
const PLATFORM_FILTERS = [
	{ k: "all", label: "All" },
	{ k: "youtube", label: "YouTube" },
	{ k: "instagram", label: "Instagram" },
	{ k: "tiktok", label: "TikTok" },
	{ k: "linkedin", label: "LinkedIn" },
	{ k: "reddit", label: "Reddit" },
];
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

// Demo data for the non-owner preview — never the real account's queue.
const DEMO_COUNTS: Record<string, number> = {
	published: 128,
	queued: 24,
	uploading: 1,
	failed: 0,
};

// Loading placeholder rows for the publish view, so we show shimmer instead of
// misleading empty/zero state while channels + queue + status are fetching.
function PubSkeletonRows({ rows = 4 }: { rows?: number }) {
	return (
		<div className="divide-y divide-[var(--mono-line)] overflow-hidden rounded-xl border border-[var(--mono-line)]">
			{Array.from({ length: rows }).map((_, i) => (
				<div key={i} className="flex items-center gap-3 px-4 py-3">
					<div className="size-4 shrink-0 animate-pulse rounded bg-[var(--mono-line)]" />
					<div className="h-3.5 flex-1 animate-pulse rounded bg-[var(--mono-line)]" />
					<div className="h-3 w-16 shrink-0 animate-pulse rounded bg-[var(--mono-line)]" />
				</div>
			))}
		</div>
	);
}
const DEMO_CHANNELS: Channel[] = [
	{ id: "demo-yt", platform: "youtube", label: "your-channel", platform_handle: "@yourbrand", status: "active" },
	{ id: "demo-ig", platform: "instagram", label: "your-ig", platform_handle: "@yourbrand", status: "active" },
	{ id: "demo-tt", platform: "tiktok", label: "your-tiktok", platform_handle: "@yourbrand", status: "active" },
];
const DEMO_TITLES = [
	"How I automate my whole content pipeline",
	"3 tools that replaced my agency",
	"POV: you shipped it in a weekend",
	"The workflow nobody talks about",
	"I tried this for 30 days. Here's what happened",
	"Stop doing this in 2026",
];
function demoQueueRows() {
	const now = Date.now();
	const plats = ["youtube", "instagram"];
	const rows: {
		id: string;
		slug: string;
		platform: string;
		status: string;
		scheduled_for?: number;
		published_at?: number | null;
		external_url?: string | null;
	}[] = [];
	for (let i = 0; i < 6; i++) {
		rows.push({
			id: `demo-up-${i}`,
			slug: DEMO_TITLES[i % DEMO_TITLES.length],
			platform: plats[i % 2],
			status: "queued",
			scheduled_for: now + (i + 1) * 6 * 3600_000,
		});
	}
	for (let i = 0; i < 6; i++) {
		rows.push({
			id: `demo-rc-${i}`,
			slug: DEMO_TITLES[(i + 3) % DEMO_TITLES.length],
			platform: plats[i % 2],
			status: "published",
			published_at: now - (i + 1) * 9 * 3600_000,
			external_url: "#",
		});
	}
	return rows;
}

function ChannelsSection({ preview = false }: { preview?: boolean }) {
	const { data: channelSession } = useSession();
	const channelOwner = channelSession?.user?.id ?? "";
	const [channels, setChannels] = useState<Channel[] | null>(
		preview ? DEMO_CHANNELS : null,
	);
	const [pending, setPending] = useState<{
		platform: string;
		connection_id: string;
		label: string;
	} | null>(null);
	const [busy, setBusy] = useState(false);
	const load = () => {
		if (preview) return;
		fetch("/api/publish/channels")
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => setChannels(d?.channels ?? []))
			.catch(() => setChannels([]));
	};
	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Carry the signed-in user's id so the token connects under THEIR account.
	const ownerQS = channelOwner ? `?owner=${encodeURIComponent(channelOwner)}` : "";
	const connectYouTube = () => {
		window.open(`${PUBLISH_ORIGIN}/oauth2/youtube/start${ownerQS}`, "_blank", "noopener");
		toast.message("Authorize YouTube in the new tab, then hit Refresh.");
	};
	const connectLinkedIn = () => {
		window.open(`${PUBLISH_ORIGIN}/oauth2/linkedin/start${ownerQS}`, "_blank", "noopener");
		toast.message("Authorize LinkedIn in the new tab, then hit Refresh.");
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
				throw new Error(d.error || "Couldn't finish. Did you approve it?");
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
				{!preview && (
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={load}
							className="text-[var(--mono-ink-3)] hover:text-[var(--mono-ink)] text-xs transition-colors"
						>
							Refresh
						</button>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									disabled={busy}
									className="flex items-center gap-1.5 rounded-full border border-[var(--mono-line)] px-3 py-1 text-xs font-medium text-[var(--mono-ink-2)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
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
								<DropdownMenuItem onClick={connectLinkedIn}>
									<Linkedin style={{ color: "#0A66C2" }} /> LinkedIn
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => initiate("reddit")}>
									<SiReddit style={{ color: "#FF4500" }} /> Reddit
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				)}
			</div>

			{pending && !preview && (
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
				<PubSkeletonRows rows={2} />
			) : channels.length === 0 ? (
				<div className="rounded-xl border border-dashed border-[var(--mono-line)] py-6 text-center text-sm text-[var(--mono-ink-3)]">
					No channels connected yet. Use Connect.
				</div>
			) : (
				<div className="divide-y divide-[var(--mono-line)] overflow-hidden rounded-xl border border-[var(--mono-line)]">
					{channels.map((ch) => (
						<div key={ch.id} className="flex items-center gap-3 px-4 py-3">
							<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--mono-hover)]">
								{pubPlatformIconLg(ch.platform)}
							</span>
							<div className="min-w-0 flex-1">
								<div className="truncate text-sm font-medium text-[var(--mono-ink)]">
									{ch.label}
								</div>
								{ch.platform_handle && (
									<div className="truncate text-xs text-[var(--mono-ink-3)]">
										{ch.platform_handle}
									</div>
								)}
							</div>
							<span className="flex items-center gap-1.5 text-xs text-[var(--mono-ink-3)]">
								<span
									className={cn(
										"size-1.5 rounded-full",
										ch.status === "active"
											? "bg-green-500"
											: "bg-muted-foreground/50",
									)}
								/>
								{ch.status === "active" ? "Active" : ch.status}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

const COMPOSE_ASPECTS = ["9:16", "16:9", "1:1", "4:3"];
const LABEL_CLS =
	"mb-2 block text-[11px] font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]";
const FIELD_CLS =
	"w-full rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-3.5 py-2.5 text-[var(--mono-ink)] placeholder:text-[var(--mono-ink-3)] outline-none transition-colors focus:border-[var(--mono-strong)]";

// Small scaled-rectangle icon mirroring the editor's aspect-ratio preview.
function RatioIcon({ ratio }: { ratio: string }) {
	const [w, h] = ratio.split(":").map(Number);
	const max = 15;
	const width = w >= h ? max : (w / h) * max;
	const height = h >= w ? max : (h / w) * max;
	return (
		<div
			style={{ width, height }}
			className="rounded-[2px] border-[1.5px] border-current opacity-80"
		/>
	);
}

function pad2(n: number) {
	return String(n).padStart(2, "0");
}

const FileTextIconLg = () => <FileText className="size-10" strokeWidth={1.5} />;

function clamp(n: number, lo: number, hi: number) {
	return Math.max(lo, Math.min(hi, n));
}

function to12(t: string) {
	const [H, M] = t.split(":").map(Number);
	const ampm = (H || 0) >= 12 ? "PM" : "AM";
	let h = (H || 0) % 12;
	if (h === 0) h = 12;
	return { h, m: M || 0, ampm };
}

function to24(h: number, m: number, ampm: string) {
	let H = h % 12;
	if (ampm === "PM") H += 12;
	return `${pad2(H)}:${pad2(m)}`;
}

// Themed date + time picker (no native popups) — calendar + 12h time, opens
// upward so it never gets clipped by the dialog.
function DateTimePicker({
	date,
	time,
	setDate,
	setTime,
}: {
	date: string;
	time: string;
	setDate: (s: string) => void;
	setTime: (s: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (!open) return;
		const onDoc = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, [open]);

	const selectedDate = useMemo(() => {
		const [y, m, d] = date.split("-").map(Number);
		return new Date(y || 1970, (m || 1) - 1, d || 1);
	}, [date]);
	const { h: h12, m: min, ampm } = to12(time);

	const label = useMemo(() => {
		const dd = new Date(`${date}T${time || "00:00"}`);
		if (Number.isNaN(dd.getTime())) return "Pick date & time";
		return `${dd.toLocaleDateString(undefined, {
			weekday: "short",
			month: "short",
			day: "numeric",
		})} · ${dd.toLocaleTimeString(undefined, {
			hour: "numeric",
			minute: "2-digit",
		})}`;
	}, [date, time]);

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className={cn(FIELD_CLS, "flex items-center justify-between text-left text-sm")}
			>
				<span>{label}</span>
				<CalendarDays className="size-4 shrink-0 text-[var(--mono-ink-3)]" />
			</button>
			{open && (
				<div className="absolute bottom-full left-0 z-50 mb-2 w-[20rem] rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-elev)] p-2 shadow-2xl">
					<Calendar
						mode="single"
						selected={selectedDate}
						defaultMonth={selectedDate}
						onSelect={(d?: Date) => {
							if (d)
								setDate(
									`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
								);
						}}
						classNames={{
							day_selected:
								"bg-[var(--mono-active)] text-[var(--mono-ink)] hover:bg-[var(--mono-active)] focus:bg-[var(--mono-active)]",
							day_today: "font-semibold text-[var(--mono-ink)] underline",
							head_cell:
								"text-[var(--mono-ink-3)] rounded-md w-8 font-normal text-[0.8rem]",
							caption_label: "text-sm font-medium text-[var(--mono-ink)]",
						}}
					/>
					<div className="mt-1 flex items-center gap-2 border-t border-[var(--mono-line)] px-2 py-2.5">
						<Clock className="size-4 shrink-0 text-[var(--mono-ink-3)]" />
						<input
							value={pad2(h12)}
							inputMode="numeric"
							onChange={(e) =>
								setTime(to24(clamp(Number.parseInt(e.target.value, 10) || 0, 1, 12), min, ampm))
							}
							className="w-11 rounded-lg border border-[var(--mono-line)] bg-[var(--mono-field)] px-2 py-1.5 text-center text-sm text-[var(--mono-ink)] outline-none focus:border-[var(--mono-strong)]"
						/>
						<span className="text-[var(--mono-ink-3)]">:</span>
						<input
							value={pad2(min)}
							inputMode="numeric"
							onChange={(e) =>
								setTime(to24(h12, clamp(Number.parseInt(e.target.value, 10) || 0, 0, 59), ampm))
							}
							className="w-11 rounded-lg border border-[var(--mono-line)] bg-[var(--mono-field)] px-2 py-1.5 text-center text-sm text-[var(--mono-ink)] outline-none focus:border-[var(--mono-strong)]"
						/>
						<div className="ml-auto flex overflow-hidden rounded-lg border border-[var(--mono-line)]">
							{["AM", "PM"].map((a) => (
								<button
									key={a}
									type="button"
									onClick={() => setTime(to24(h12, min, a))}
									className={cn(
										"px-2.5 py-1.5 text-xs transition-colors",
										ampm === a
											? "bg-[var(--mono-active)] text-[var(--mono-ink)]"
											: "text-[var(--mono-ink-3)] hover:text-[var(--mono-ink)]",
									)}
								>
									{a}
								</button>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function ComposePostModal({
	owner,
	items,
	onClose,
	onPosted,
	initialItemId,
}: {
	owner: string;
	items: VaultItem[];
	onClose: () => void;
	onPosted: () => void;
	initialItemId?: string | null;
}) {
	// Videos, images, carousels and PDFs (LinkedIn docs) are postable.
	const videos = useMemo(
		() =>
			items.filter(
				(i) =>
					i.kind === "pdf" ||
					i.media?.some((m) => m.type === "video" || m.type === "image"),
			),
		[items],
	);
	const [channels, setChannels] = useState<Channel[] | null>(null);
	useEffect(() => {
		fetch("/api/publish/channels")
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => setChannels(d?.channels ?? []))
			.catch(() => setChannels([]));
	}, []);
	const available = useMemo(() => {
		const set = new Set(
			(channels ?? [])
				.filter((c) => c.status === "active")
				.map((c) => c.platform.toLowerCase()),
		);
		return ["youtube", "instagram", "tiktok", "linkedin", "reddit"].filter(
			(p) => set.has(p),
		);
	}, [channels]);

	const [picked, setPicked] = useState<VaultItem | null>(null);
	const [q, setQ] = useState("");
	const [title, setTitle] = useState("");
	const [caption, setCaption] = useState("");
	const [sel, setSel] = useState<Set<string>>(new Set());
	const [subreddit, setSubreddit] = useState("");
	const [ratio, setRatio] = useState("9:16");
	const init = useMemo(() => new Date(Date.now() + 60 * 60 * 1000), []);
	const [date, setDate] = useState(
		() => `${init.getFullYear()}-${pad2(init.getMonth() + 1)}-${pad2(init.getDate())}`,
	);
	const [time, setTime] = useState(
		() => `${pad2(init.getHours())}:${pad2(init.getMinutes())}`,
	);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (available.length) setSel(new Set(available));
	}, [available]);

	// Measure the preview stage and size the frame to the chosen ratio so
	// every aspect (incl. 1:1 / 4:3) renders correctly and never overflows.
	const stageRef = useRef<HTMLDivElement>(null);
	const [box, setBox] = useState<{ w: number; h: number } | null>(null);
	useEffect(() => {
		if (!picked) return;
		const el = stageRef.current;
		if (!el) return;
		const compute = () => {
			const cw = el.clientWidth;
			const ch = el.clientHeight;
			if (!cw || !ch) return;
			const [rw, rh] = ratio.split(":").map(Number);
			const ar = rw / rh;
			let w = cw;
			let h = w / ar;
			if (h > ch) {
				h = ch;
				w = h * ar;
			}
			setBox({ w: Math.round(w), h: Math.round(h) });
		};
		compute();
		const ro = new ResizeObserver(compute);
		ro.observe(el);
		return () => ro.disconnect();
	}, [ratio, picked]);

	const filtered = useMemo(() => {
		const s = q.trim().toLowerCase();
		return s ? videos.filter((v) => v.name.toLowerCase().includes(s)) : videos;
	}, [videos, q]);

	const choose = (it: VaultItem) => {
		setPicked(it);
		setTitle(it.name || "");
		setCaption(it.caption || "");
		if (it.kind === "carousel") {
			// Native Instagram carousel (2-10 images).
			setSel(new Set(available.filter((p) => p === "instagram")));
		} else if (it.kind === "pdf") {
			// Native LinkedIn document post.
			setSel(new Set(available.filter((p) => p === "linkedin")));
		} else if (!it.media?.some((m) => m.type === "video")) {
			// Photos: IG natively; LinkedIn/Reddit as link posts.
			setSel(
				new Set(
					available.filter((p) =>
						["instagram", "linkedin", "reddit"].includes(p),
					),
				),
			);
		}
	};

	// Open straight on a specific item (Export & publish hand-off).
	useEffect(() => {
		if (!initialItemId || picked) return;
		const it = videos.find((v) => v.id === initialItemId);
		if (it) choose(it);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialItemId, videos]);

	const isCarousel = picked?.kind === "carousel";
	const isPdf = picked?.kind === "pdf";
	const videoKey =
		(!isCarousel && !isPdf
			? picked?.media.find((m) => m.type === "video")?.key
			: "") || "";
	const imageKey = videoKey
		? ""
		: picked?.media.find((m) => m.type === "image")?.key || "";
	const pdfKey = isPdf
		? picked?.media.find((m) => m.type === "pdf")?.key || ""
		: "";
	const isImage = !isCarousel && !isPdf && !!imageKey;

	const submit = async (asDraft = false) => {
		if (!picked || busy) return;
		const platforms = [...sel];
		if (platforms.length === 0) {
			toast.error("Pick at least one channel");
			return;
		}
		const ms = new Date(`${date}T${time || "00:00"}`).getTime();
		if (!Number.isFinite(ms)) {
			toast.error("Pick a valid date and time");
			return;
		}
		if (sel.has("reddit") && !subreddit.trim()) {
			toast.error("Pick a subreddit for the Reddit post");
			return;
		}
		setBusy(true);
		const tid = toast.loading(asDraft ? "Saving draft…" : "Scheduling…");
		try {
			const r = await fetch("/api/publish-post", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					owner,
					itemId: picked.id,
					platforms,
					title,
					caption,
					description: caption,
					privacy: "public",
					subreddit: subreddit.trim(),
					scheduledFor: ms,
					draft: asDraft,
				}),
			});
			const d = (await r.json().catch(() => ({}))) as {
				ok?: boolean;
				created?: unknown[];
				error?: string;
			};
			if (!r.ok || !d.ok) throw new Error(d.error || "Couldn't schedule");
			const n = d.created?.length ?? 0;
			toast.success(
				asDraft
					? `Draft saved for ${n} channel${n === 1 ? "" : "s"}`
					: `Scheduled to ${n} channel${n === 1 ? "" : "s"}`,
				{ id: tid, description: asDraft ? undefined : pubWhen(ms) },
			);
			onPosted();
			onClose();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed", { id: tid });
		} finally {
			setBusy(false);
		}
	};

	const poster = (v: VaultItem) => {
		if (v.thumbUrl)
			// eslint-disable-next-line @next/next/no-img-element
			return <img src={v.thumbUrl} alt="" className="size-full object-cover" />;
		const vid = v.media.find((m) => m.type === "video")?.key;
		if (vid)
			return <VideoThumb src={fileUrl(vid)} className="size-full object-cover" />;
		const img = v.media.find((m) => m.type === "image")?.key;
		if (img)
			// eslint-disable-next-line @next/next/no-img-element
			return (
				<img src={fileUrl(img)} alt="" className="size-full object-cover" />
			);
		if (v.kind === "pdf")
			return (
				<div className="flex size-full items-center justify-center text-[var(--mono-ink-3)]">
					<FileTextIconLg />
				</div>
			);
		return null;
	};

	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex h-[88vh] max-w-[76rem] flex-col gap-0 overflow-hidden rounded-2xl border-[var(--mono-line)] bg-[var(--mono-panel)] p-0 text-[var(--mono-ink)]">
				<div className="flex shrink-0 items-center border-b border-[var(--mono-line)] px-6 py-4">
					<DialogTitle className="text-[15px] font-semibold text-[var(--mono-ink)]">
						{picked ? "Schedule post" : "Choose a video"}
					</DialogTitle>
				</div>

				{!picked ? (
					<div className="flex min-h-0 flex-1 flex-col p-6">
						<input
							placeholder="Search your videos…"
							value={q}
							onChange={(e) => setQ(e.target.value)}
							className={cn(FIELD_CLS, "mb-4 max-w-sm text-sm")}
						/>
						{filtered.length === 0 ? (
							<div className="flex flex-1 items-center justify-center text-sm text-[var(--mono-ink-3)]">
								No videos in your library yet.
							</div>
						) : (
							<div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-6">
								{filtered.map((v) => (
									<button
										key={v.id}
										type="button"
										onClick={() => choose(v)}
										className="group text-left"
									>
										<div className="relative aspect-[9/16] overflow-hidden rounded-xl border border-[var(--mono-line)] bg-black/30 transition group-hover:border-[var(--mono-strong)]">
											{poster(v)}
										</div>
										<div className="mt-1.5 truncate text-xs text-[var(--mono-ink-2)]">
											{v.name || "Untitled"}
										</div>
									</button>
								))}
							</div>
						)}
					</div>
				) : (
					<div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-visible">
						{/* Aspect-ratio rail */}
						<div className="hidden w-44 shrink-0 flex-col gap-1 overflow-y-auto border-r border-[var(--mono-line)] p-3 lg:flex">
							<div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]">
								Aspect ratio
							</div>
							{COMPOSE_ASPECTS.map((r) => {
								const on = ratio === r;
								return (
									<button
										key={r}
										type="button"
										onClick={() => setRatio(r)}
										className={cn(
											"flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
											on
												? "bg-[var(--mono-active)] text-[var(--mono-ink)]"
												: "text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]",
										)}
									>
										<span className="flex size-5 items-center justify-center">
											<RatioIcon ratio={r} />
										</span>
										<span className="flex-1 text-left">{r}</span>
										{on && <Check className="size-3.5" />}
									</button>
								);
							})}
							<div className="mt-auto pt-3">
								<button
									type="button"
									onClick={() => setPicked(null)}
									className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] text-[var(--mono-ink-3)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
								>
									<ChevronLeft className="size-3.5" /> Change video
								</button>
							</div>
						</div>

						{/* Centered preview */}
						<div className="relative flex min-h-[44vh] min-w-0 flex-1 bg-black/30">
							<div
								ref={stageRef}
								className="absolute inset-5 flex items-center justify-center"
							>
								{box && (videoKey || imageKey || isPdf) && (
									<div
										style={{ width: box.w, height: box.h }}
										className="relative overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10"
									>
										{videoKey ? (
											// biome-ignore lint/a11y/useMediaCaption: preview only
											<video
												key={videoKey}
												src={`${fileUrl(videoKey)}#t=0.1`}
												controls
												playsInline
												className="size-full object-cover"
											/>
										) : imageKey ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img
												src={fileUrl(imageKey)}
												alt=""
												className="size-full object-contain"
											/>
										) : (
											<div className="flex size-full flex-col items-center justify-center gap-2 text-[var(--mono-ink-3)]">
												<FileTextIconLg />
												<span className="text-sm">PDF document</span>
											</div>
										)}
										{isCarousel && (
											<span className="absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
												{picked?.media.filter((m) => m.type === "image").length}{" "}
												pages
											</span>
										)}
									</div>
								)}
							</div>
						</div>

						{/* Fields */}
						<div className="flex w-full shrink-0 flex-col gap-5 border-t border-[var(--mono-line)] p-6 lg:w-[26rem] lg:border-t-0 lg:border-l">
							{(!!videoKey || isPdf || sel.has("reddit")) && (
								<div>
									<label className={LABEL_CLS}>Title</label>
									<input
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										maxLength={100}
										placeholder="Add a title…"
										className={cn(FIELD_CLS, "text-[15px]")}
									/>
								</div>
							)}

							<div className="flex min-h-0 flex-1 flex-col">
								<label className={LABEL_CLS}>Caption</label>
								<textarea
									value={caption}
									onChange={(e) => setCaption(e.target.value)}
									placeholder="Write a caption…"
									className={cn(
										FIELD_CLS,
										"min-h-[10rem] flex-1 resize-none text-sm leading-relaxed",
									)}
								/>
							</div>

							<div>
								<label className={LABEL_CLS}>Channels</label>
								{channels === null ? (
									<div className="text-sm text-[var(--mono-ink-3)]">Loading…</div>
								) : available.length === 0 ? (
									<div className="rounded-xl border border-dashed border-[var(--mono-line)] p-3 text-sm text-[var(--mono-ink-3)]">
										No channels connected yet.
									</div>
								) : (
									<div className="flex flex-wrap gap-2">
										{available.map((p) => {
											const on = sel.has(p);
											const blocked =
												(isCarousel && p !== "instagram") ||
												(isPdf && p !== "linkedin") ||
												(isImage &&
													!["instagram", "linkedin", "reddit"].includes(p));
											return (
												<button
													key={p}
													type="button"
													disabled={blocked}
													title={
														blocked
															? isCarousel
																? "Carousels post to Instagram"
																: isPdf
																	? "PDFs post to LinkedIn"
																	: "Photos can't go to this platform"
															: undefined
													}
													onClick={() =>
														setSel((s) => {
															const n = new Set(s);
															on ? n.delete(p) : n.add(p);
															return n;
														})
													}
													className={cn(
														"flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] capitalize transition-colors",
														on
															? "border-[var(--mono-strong)] bg-[var(--mono-active)] text-[var(--mono-ink)]"
															: "border-[var(--mono-line)] text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]",
														blocked && "pointer-events-none opacity-35",
													)}
												>
													{pubPlatformIcon(p)} {p}
												</button>
											);
										})}
										{isCarousel && (
											<span className="flex items-center gap-1.5 rounded-full border border-dashed border-[var(--mono-line)] px-3 py-1.5 text-[13px] text-[var(--mono-ink-3)]">
												<Layers className="size-3.5" /> Posts as an Instagram
												carousel
											</span>
										)}
									</div>
								)}
							</div>

							{sel.has("reddit") && (
								<div>
									<label className={LABEL_CLS}>Subreddit</label>
									<input
										value={subreddit}
										onChange={(e) => setSubreddit(e.target.value)}
										placeholder="e.g. SideProject (without r/)"
										className={cn(FIELD_CLS, "text-sm")}
									/>
								</div>
							)}

							<div>
								<label className={LABEL_CLS}>Publish at</label>
								<DateTimePicker
									date={date}
									time={time}
									setDate={setDate}
									setTime={setTime}
								/>
							</div>
						</div>
					</div>
				)}

				{picked && (
					<div className="flex shrink-0 items-center justify-end gap-3 border-t border-[var(--mono-line)] px-6 py-4">
						<Button variant="ghost" onClick={onClose} disabled={busy}>
							Cancel
						</Button>
						<Button
							variant="outline"
							onClick={() => submit(true)}
							disabled={busy || sel.size === 0}
						>
							Save draft
						</Button>
						<Button onClick={() => submit(false)} disabled={busy || sel.size === 0}>
							{busy ? "Working…" : "Schedule post"}
						</Button>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

type QueueRow = {
	id: string;
	slug: string;
	platform: string;
	status: string;
	scheduled_for?: number;
	published_at?: number | null;
	external_url?: string | null;
};

// Read-only "full view" of a scheduled/published post — same vibe as the
// composer but not editable. Pulls the row's metadata (title/caption/video)
// from the engine's /queue/:id.
function ReadOnlyPostModal({
	id,
	onClose,
	onChanged,
}: {
	id: string;
	onClose: () => void;
	onChanged: () => void;
}) {
	const [item, setItem] = useState<Record<string, unknown> | null>(null);
	const [failed, setFailed] = useState(false);
	const [busy, setBusy] = useState(false);
	useEffect(() => {
		fetch(`/api/publish/queue/${id}`)
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => (d?.item ? setItem(d.item) : setFailed(true)))
			.catch(() => setFailed(true));
	}, [id]);
	const meta = useMemo(() => {
		try {
			return item
				? (JSON.parse(String(item.metadata_json)) as Record<string, unknown>)
				: {};
		} catch {
			return {};
		}
	}, [item]);
	const videoUrl = typeof meta.video_url === "string" ? meta.video_url : "";
	const title = String(meta.title || "");
	const caption = String(meta.caption || meta.description || "");
	const platform = String(item?.platform || "");
	const status = String(item?.status || "");
	const when =
		(item?.published_at as number) || (item?.scheduled_for as number) || 0;
	const externalUrl =
		typeof item?.external_url === "string" ? (item.external_url as string) : "";

	const cancelPost = async () => {
		if (busy) return;
		setBusy(true);
		try {
			const r = await fetch(`/api/publish/queue/${id}`, { method: "DELETE" });
			if (!r.ok) throw new Error();
			toast.success("Post cancelled");
			onChanged();
			onClose();
		} catch {
			toast.error("Couldn't cancel");
		} finally {
			setBusy(false);
		}
	};

	const metaLabel =
		"w-24 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]";

	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="flex h-[80vh] max-w-[60rem] flex-col gap-0 overflow-hidden rounded-2xl border-[var(--mono-line)] bg-[var(--mono-panel)] p-0 text-[var(--mono-ink)]">
				<div className="flex shrink-0 items-center gap-3 border-b border-[var(--mono-line)] px-6 py-4">
					<DialogTitle className="text-[15px] font-semibold text-[var(--mono-ink)]">
						Post
					</DialogTitle>
					{status && (
						<span
							className={cn(
								"rounded-full border border-[var(--mono-line)] px-2 py-0.5 text-[11px] capitalize",
								pubStatusColor(status),
							)}
						>
							{status}
						</span>
					)}
				</div>

				{!item ? (
					<div className="flex flex-1 items-center justify-center text-sm text-[var(--mono-ink-3)]">
						{failed ? "Couldn't load this post." : "Loading…"}
					</div>
				) : (
					<div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-visible">
						<div className="flex min-w-0 flex-1 items-center justify-center bg-black/30 p-6">
							{videoUrl ? (
								// biome-ignore lint/a11y/useMediaCaption: preview only
								<video
									src={videoUrl}
									controls
									playsInline
									className="max-h-full max-w-full rounded-xl bg-black shadow-2xl ring-1 ring-white/10"
								/>
							) : (
								<div className="text-sm text-[var(--mono-ink-3)]">No preview</div>
							)}
						</div>
						<div className="flex w-full shrink-0 flex-col gap-5 overflow-y-auto border-t border-[var(--mono-line)] p-6 lg:w-[24rem] lg:border-t-0 lg:border-l">
							{title && (
								<div>
									<div className={LABEL_CLS}>Title</div>
									<div className="text-[15px] text-[var(--mono-ink)]">{title}</div>
								</div>
							)}
							<div className="flex min-h-0 flex-1 flex-col">
								<div className={LABEL_CLS}>Caption</div>
								<div className="flex-1 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-[var(--mono-ink-2)]">
									{caption || "—"}
								</div>
							</div>
							<div className="space-y-3 border-t border-[var(--mono-line)] pt-4">
								<div className="flex items-center gap-3 text-sm">
									<span className={metaLabel}>Channel</span>
									<span className="flex items-center gap-1.5 capitalize text-[var(--mono-ink-2)]">
										{pubPlatformIcon(platform)}
										{String(meta.channel || platform)}
									</span>
								</div>
								<div className="flex items-center gap-3 text-sm">
									<span className={metaLabel}>
										{status === "published" ? "Published" : "Scheduled"}
									</span>
									<span className="text-[var(--mono-ink-2)]">{pubWhen(when) || "—"}</span>
								</div>
							</div>
						</div>
					</div>
				)}

				<div className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--mono-line)] px-6 py-4">
					<div>
						{status === "queued" && (
							<button
								type="button"
								onClick={cancelPost}
								disabled={busy}
								className="text-sm text-red-400/90 transition-colors hover:text-red-400"
							>
								Cancel post
							</button>
						)}
					</div>
					<div className="flex items-center gap-3">
						{externalUrl && (
							<a
								href={externalUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1.5 text-sm text-[var(--mono-ink-2)] transition-colors hover:text-[var(--mono-ink)]"
							>
								Open post <ArrowUpRight className="size-4" />
							</a>
						)}
						<Button variant="ghost" onClick={onClose}>
							Close
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

// Recurring slots: "fill these times every day from this section". The
// satellite cron does the filling; this manages the rules.
type QueueRuleRow = {
	id: string;
	platform: string;
	section: string;
	slots: string[];
	active: boolean;
	filled: number;
};

function utcToLocal(hhmm: string): string {
	const [h, m] = hhmm.split(":").map(Number);
	const d = new Date();
	d.setUTCHours(h, m, 0, 0);
	return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}
function localToUtc(hhmm: string): string | null {
	const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
	if (!m) return null;
	const d = new Date();
	d.setHours(Number(m[1]), Number(m[2]), 0, 0);
	return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
}

function QueueRulesSection({
	owner,
	categories,
}: {
	owner: string;
	categories: string[];
}) {
	const [rules, setRules] = useState<QueueRuleRow[] | null>(null);
	const [adding, setAdding] = useState(false);
	const [platform, setPlatform] = useState("youtube");
	const [section, setSection] = useState("");
	const [times, setTimes] = useState("16:30, 20:30");
	const [busy, setBusy] = useState(false);

	const load = () => {
		fetch(`/api/publish-rules?owner=${encodeURIComponent(owner)}`)
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => setRules(d?.rules ?? []))
			.catch(() => setRules([]));
	};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(load, [owner]);

	const create = async () => {
		const slots = times
			.split(",")
			.map((t) => localToUtc(t))
			.filter((t): t is string => !!t);
		if (!section || slots.length === 0) {
			toast.error("Pick a section and at least one valid time");
			return;
		}
		setBusy(true);
		try {
			const r = await fetch("/api/publish-rules", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ owner, platform, section, slots }),
			});
			const d = (await r.json().catch(() => ({}))) as { error?: string };
			if (!r.ok) throw new Error(d.error || "Failed");
			toast.success("Queue rule active — the next slots fill automatically");
			setAdding(false);
			setSection("");
			load();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed");
		} finally {
			setBusy(false);
		}
	};

	const toggle = async (rule: QueueRuleRow) => {
		await fetch("/api/publish-rules", {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ id: rule.id, active: !rule.active }),
		});
		load();
	};
	const removeRule = async (rule: QueueRuleRow) => {
		await fetch(`/api/publish-rules?id=${encodeURIComponent(rule.id)}`, {
			method: "DELETE",
		});
		load();
	};

	return (
		<div className="mt-9">
			<div className="mb-2 flex items-center justify-between">
				<h2 className="text-sm font-semibold">Queues</h2>
				<button
					type="button"
					onClick={() => setAdding((v) => !v)}
					className="flex items-center gap-1.5 rounded-full border border-white/[0.1] px-3 py-1 text-xs font-medium text-[var(--mono-ink-2)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
				>
					<Plus className="size-3.5" /> New rule
				</button>
			</div>

			{adding && (
				<div className="mb-3 rounded-xl border border-[var(--mono-line)] bg-[var(--mono-hover)] p-4">
					<div className="grid gap-3 sm:grid-cols-3">
						<div>
							<div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]">
								Platform
							</div>
							<div className="flex flex-wrap gap-1.5">
								{["youtube", "instagram", "tiktok", "linkedin"].map((p) => (
									<button
										key={p}
										type="button"
										onClick={() => setPlatform(p)}
										className={cn(
											"flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs capitalize transition-colors",
											platform === p
												? "border-[var(--mono-strong)] bg-[var(--mono-active)] text-[var(--mono-ink)]"
												: "border-[var(--mono-line)] text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)]",
										)}
									>
										{pubPlatformIcon(p)}
									</button>
								))}
							</div>
						</div>
						<div>
							<div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]">
								Section
							</div>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										className="flex w-full items-center justify-between rounded-lg border border-[var(--mono-line)] bg-[var(--mono-field)] px-3 py-2 text-sm text-[var(--mono-ink)]"
									>
										{section || "Pick a section…"}
										<ChevronDown className="size-3.5 text-[var(--mono-ink-3)]" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									{categories.length === 0 ? (
										<DropdownMenuItem disabled>
											No sections yet — tag videos first
										</DropdownMenuItem>
									) : (
										categories.map((c) => (
											<DropdownMenuItem key={c} onClick={() => setSection(c)}>
												<Hash className="size-4" /> {c}
											</DropdownMenuItem>
										))
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
						<div>
							<div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]">
								Times (local, comma-sep)
							</div>
							<input
								value={times}
								onChange={(e) => setTimes(e.target.value)}
								placeholder="16:30, 20:30"
								className="w-full rounded-lg border border-[var(--mono-line)] bg-[var(--mono-field)] px-3 py-2 text-sm text-[var(--mono-ink)] outline-none placeholder:text-[var(--mono-ink-3)] focus:border-[var(--mono-strong)]"
							/>
						</div>
					</div>
					<div className="mt-3 flex justify-end gap-2">
						<Button variant="ghost" onClick={() => setAdding(false)}>
							Cancel
						</Button>
						<Button onClick={create} disabled={busy}>
							{busy ? "Creating…" : "Create rule"}
						</Button>
					</div>
				</div>
			)}

			{rules === null ? (
				<div className="text-sm text-[var(--mono-ink-3)]">Loading…</div>
			) : rules.length === 0 ? (
				!adding && (
					<div className="rounded-xl border border-dashed border-[var(--mono-line)] py-5 text-center text-sm text-[var(--mono-ink-3)]">
						No standing queues. A rule auto-fills daily slots from a section —
						set it once, keep the section stocked.
					</div>
				)
			) : (
				<div className="divide-y divide-[var(--mono-line)] overflow-hidden rounded-xl border border-[var(--mono-line)]">
					{rules.map((r) => (
						<div key={r.id} className="flex items-center gap-3 px-4 py-3">
							{pubPlatformIcon(r.platform)}
							<div className="min-w-0 flex-1">
								<div className="truncate text-sm text-[var(--mono-ink)]">
									<span className="font-medium">{r.section}</span>
									<span className="text-[var(--mono-ink-3)]">
										{" "}
										· {r.slots.map(utcToLocal).join(", ")} daily
									</span>
								</div>
								<div className="text-[11px] text-[var(--mono-ink-3)]">
									{r.filled} filled so far
								</div>
							</div>
							<button
								type="button"
								onClick={() => toggle(r)}
								className={cn(
									"rounded-full border px-2.5 py-1 text-xs transition-colors",
									r.active
										? "border-green-500/40 text-green-500"
										: "border-[var(--mono-line)] text-[var(--mono-ink-3)]",
								)}
							>
								{r.active ? "Active" : "Paused"}
							</button>
							<button
								type="button"
								onClick={() => removeRule(r)}
								aria-label="Delete rule"
								className="text-[var(--mono-ink-3)] transition-colors hover:text-red-400"
							>
								<Trash2 className="size-3.5" />
							</button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function PublishPane({
	items,
	owner,
	isOwner,
	initialComposeItem,
	categories,
}: {
	items: VaultItem[];
	owner: string;
	isOwner: boolean;
	initialComposeItem?: string | null;
	categories: string[];
}) {
	const preview = !isOwner;
	const [status, setStatus] = useState<PubStatus | null>(null);
	const [queue, setQueue] = useState<QueueRow[] | null>(
		preview ? (demoQueueRows() as QueueRow[]) : null,
	);
	const [composing, setComposing] = useState(!preview && !!initialComposeItem);
	const [detailId, setDetailId] = useState<string | null>(null);
	const [pfilter, setPfilter] = useState("all");
	const loadStatus = () => {
		if (preview) return;
		fetch("/api/publish/status")
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => setStatus(d ?? { counts: {} }))
			.catch(() => setStatus({ counts: {} }));
	};
	const loadQueue = () => {
		if (preview) return;
		fetch("/api/publish/queue?limit=200")
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => setQueue(Array.isArray(d?.items) ? d.items : []))
			.catch(() => setQueue([]));
	};
	const reload = () => {
		loadStatus();
		loadQueue();
	};
	useEffect(() => {
		if (preview) return;
		loadStatus();
		loadQueue();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const requestAccess = () =>
		toast.success("Access requested", {
			description: "Publishing is in private beta — we'll reach out soon.",
		});

	const c = preview ? DEMO_COUNTS : status?.counts ?? {};
	const statusLoading = !preview && status === null;
	const stat = [
		{ label: "Published", value: c.published, color: "text-green-500" },
		{ label: "Queued", value: c.queued, color: "text-[var(--mono-ink)]" },
		{ label: "Uploading", value: c.uploading, color: "text-amber-400" },
		{ label: "Failed", value: c.failed, color: "text-red-500" },
	];
	const rows = queue ?? [];
	const matchP = (p: string) => pfilter === "all" || p === pfilter;
	const upcoming = useMemo(
		() =>
			rows
				.filter((r) => r.status === "queued" && matchP(r.platform))
				.sort((a, b) => (a.scheduled_for || 0) - (b.scheduled_for || 0)),
		[queue, pfilter],
	);
	const drafts = useMemo(
		() =>
			rows
				.filter((r) => r.status === "draft" && matchP(r.platform))
				.sort((a, b) => (b.scheduled_for || 0) - (a.scheduled_for || 0)),
		[queue, pfilter],
	);
	const draftAction = async (id: string, action: "schedule" | "delete") => {
		try {
			const r = await fetch("/api/publish-post", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ id, action }),
			});
			if (!r.ok) throw new Error("Failed");
			toast.success(action === "schedule" ? "Draft scheduled" : "Draft deleted");
			reload();
		} catch {
			toast.error("Couldn't update draft");
		}
	};
	const recent = useMemo(
		() =>
			rows
				.filter(
					(r) =>
						r.status !== "queued" && r.status !== "draft" && matchP(r.platform),
				)
				.sort(
					(a, b) =>
						(b.published_at || b.scheduled_for || 0) -
						(a.published_at || a.scheduled_for || 0),
				),
		[queue, pfilter],
	);
	const onRow = (id: string) => (preview ? requestAccess() : setDetailId(id));

	return (
		<div className="mx-auto max-w-3xl px-4 pt-16 pb-12 sm:px-8 lg:pt-10">
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-2.5">
					<h1 className="text-2xl font-semibold tracking-tight">Publishing</h1>
					{preview && (
						<button
							type="button"
							onClick={requestAccess}
							className="rounded-full border border-[var(--mono-strong)] bg-[var(--mono-hover)] px-3 py-1 text-xs font-medium text-[var(--mono-ink-2)] transition-colors hover:bg-[var(--mono-active)] hover:text-[var(--mono-ink)]"
						>
							Request access
						</button>
					)}
				</div>
				<Button
					onClick={() => setComposing(true)}
					disabled={preview}
					className={cn("shrink-0", preview && "opacity-50")}
				>
					New post
				</Button>
			</div>

			<div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
				{stat.map((s) => (
					<div
						key={s.label}
						className="rounded-xl border border-[var(--mono-line)] bg-[var(--mono-hover)] p-4"
					>
						<div className="text-xs text-[var(--mono-ink-3)]">{s.label}</div>
						{statusLoading ? (
							<div className="mt-2 h-7 w-10 animate-pulse rounded-md bg-[var(--mono-line)]" />
						) : (
							<div className={cn("mt-1.5 text-2xl font-semibold", s.color)}>
								{s.value ?? 0}
							</div>
						)}
					</div>
				))}
			</div>

			<ChannelsSection preview={preview} />

			{!preview && <QueueRulesSection owner={owner} categories={categories} />}

			{/* Platform filter */}
			<div className="mt-9 flex flex-wrap items-center gap-1.5">
				{PLATFORM_FILTERS.map((f) => {
					const on = pfilter === f.k;
					return (
						<button
							key={f.k}
							type="button"
							onClick={() => setPfilter(f.k)}
							className={cn(
								"flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors",
								on
									? "border-[var(--mono-strong)] bg-[var(--mono-active)] text-[var(--mono-ink)]"
									: "border-[var(--mono-line)] text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]",
							)}
						>
							{f.k !== "all" && pubPlatformIcon(f.k)}
							{f.label}
						</button>
					);
				})}
			</div>

			{/* Drafts */}
			{drafts.length > 0 && (
				<div className="mt-5">
					<h2 className="mb-2 text-sm font-semibold">Drafts</h2>
					<div className="divide-y divide-[var(--mono-line)] overflow-hidden rounded-xl border border-[var(--mono-line)]">
						{drafts.map((d) => (
							<div
								key={d.id}
								className="flex w-full items-center gap-3 px-4 py-2.5"
							>
								{pubPlatformIcon(d.platform)}
								<span className="flex-1 truncate text-[13px] text-[var(--mono-ink-2)]">
									{d.slug}
								</span>
								<span className="text-xs capitalize text-[var(--mono-ink-3)]">
									{d.platform}
								</span>
								<button
									type="button"
									onClick={() => draftAction(d.id, "schedule")}
									className="rounded-full border border-[var(--mono-line)] px-2.5 py-1 text-xs text-[var(--mono-ink-2)] transition-colors hover:bg-[var(--mono-active)] hover:text-[var(--mono-ink)]"
								>
									Schedule
								</button>
								<button
									type="button"
									onClick={() => draftAction(d.id, "delete")}
									aria-label="Delete draft"
									className="text-[var(--mono-ink-3)] transition-colors hover:text-red-400"
								>
									<Trash2 className="size-3.5" />
								</button>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Upcoming */}
			<div className="mt-5">
				<h2 className="mb-2 text-sm font-semibold">Upcoming</h2>
				{queue === null ? (
					<PubSkeletonRows />
				) : upcoming.length === 0 ? (
					<div className="rounded-xl border border-dashed border-[var(--mono-line)] py-8 text-center text-sm text-[var(--mono-ink-3)]">
						Nothing scheduled.
					</div>
				) : (
					<div className="divide-y divide-[var(--mono-line)] overflow-hidden rounded-xl border border-[var(--mono-line)]">
						{upcoming.slice(0, 80).map((u) => (
							<button
								type="button"
								key={u.id}
								onClick={() => onRow(u.id)}
								className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--mono-hover)]"
							>
								{pubPlatformIcon(u.platform)}
								<span className="flex-1 truncate text-[13px] text-[var(--mono-ink-2)]">
									{u.slug}
								</span>
								<span className="text-xs capitalize text-[var(--mono-ink-3)]">
									{u.platform}
								</span>
								<span className="shrink-0 text-xs text-[var(--mono-ink-3)]">
									{pubWhen(u.scheduled_for)}
								</span>
							</button>
						))}
					</div>
				)}
			</div>

			{/* Recent */}
			<div className="mt-8">
				<h2 className="mb-2 text-sm font-semibold">Recent</h2>
				{queue === null ? (
					<PubSkeletonRows />
				) : recent.length === 0 ? (
					<div className="rounded-xl border border-dashed border-[var(--mono-line)] py-8 text-center text-sm text-[var(--mono-ink-3)]">
						No posts yet.
					</div>
				) : (
					<div className="divide-y divide-[var(--mono-line)] overflow-hidden rounded-xl border border-[var(--mono-line)]">
						{recent.slice(0, 80).map((p) => (
							<button
								type="button"
								key={p.id}
								onClick={() => onRow(p.id)}
								className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--mono-hover)]"
							>
								{pubPlatformIcon(p.platform)}
								<span className="flex-1 truncate text-[13px] text-[var(--mono-ink-2)]">
									{p.slug}
								</span>
								<span className={cn("text-xs capitalize", pubStatusColor(p.status))}>
									{p.status}
								</span>
								{p.external_url ? (
									<ArrowUpRight className="size-4 shrink-0 text-[var(--mono-ink-3)]" />
								) : (
									<span className="shrink-0 text-xs text-[var(--mono-ink-3)]/60">
										{pubWhen(p.published_at || p.scheduled_for)}
									</span>
								)}
							</button>
						))}
					</div>
				)}
			</div>

			{!preview && composing && (
				<ComposePostModal
					owner={owner}
					items={items}
					onClose={() => setComposing(false)}
					onPosted={reload}
					initialItemId={initialComposeItem}
				/>
			)}
			{!preview && detailId && (
				<ReadOnlyPostModal
					id={detailId}
					onClose={() => setDetailId(null)}
					onChanged={reload}
				/>
			)}
		</div>
	);
}

const EMPTY_STATES: Record<
	string,
	{ Icon: typeof LayoutGrid; title: string; sub: string }
> = {
	all: {
		Icon: LayoutGrid,
		title: "Your library is empty",
		sub: "Paste a link, upload a file, or start a new project.",
	},
	projects: {
		Icon: Folder,
		title: "No projects yet",
		sub: "Hit New project in the sidebar to start editing.",
	},
	video: {
		Icon: Film,
		title: "No videos yet",
		sub: "Import a video, or publish a project to see it here.",
	},
	carousel: {
		Icon: Layers,
		title: "No carousels yet",
		sub: "Design one in Create post and publish it to the library.",
	},
	audio: {
		Icon: AudioLines,
		title: "No audio yet",
		sub: "Paste a link or upload an audio file to keep it here.",
	},
	image: {
		Icon: ImageIcon,
		title: "No images yet",
		sub: "Upload images, or publish a single page from Create post.",
	},
	templates: {
		Icon: LayoutTemplate,
		title: "No templates yet",
		sub: "Save any project as a template to reuse it later.",
	},
};

function LibraryEmptyState({
	tab,
	label,
	query,
}: {
	tab: string;
	label: string;
	query: string;
}) {
	if (query) {
		return (
			<div className="flex flex-col items-center justify-center py-24 text-center">
				<div className="mb-5 flex size-20 items-center justify-center rounded-3xl border border-[var(--mono-line)] bg-[var(--mono-panel)]">
					<Search className="size-9 text-[var(--mono-ink-3)]" strokeWidth={1.5} />
				</div>
				<div className="text-[15px] font-semibold text-[var(--mono-ink)]">
					No matches for "{query}"
				</div>
				<p className="mt-1 text-sm text-[var(--mono-ink-2)]">
					Try a different name or clear the search.
				</p>
			</div>
		);
	}
	const preset = EMPTY_STATES[tab] ?? {
		Icon: Hash,
		title: `Nothing in ${label} yet`,
		sub: "Add items to this section from any card menu.",
	};
	return (
		<div className="flex flex-col items-center justify-center py-24 text-center">
			<div className="mb-5 flex size-20 items-center justify-center rounded-3xl border border-[var(--mono-line)] bg-[var(--mono-panel)]">
				<preset.Icon
					className="size-9 text-[var(--mono-ink-3)]"
					strokeWidth={1.5}
				/>
			</div>
			<div className="text-[15px] font-semibold text-[var(--mono-ink)]">
				{preset.title}
			</div>
			<p className="mt-1 text-sm text-[var(--mono-ink-2)]">{preset.sub}</p>
		</div>
	);
}

function ProjectStatusChip({ project }: { project: TProjectMetadata }) {
	if (project.isTemplate) return null;
	return project.publishedItemId ? (
		<span className="inline-flex items-center gap-1 rounded-md bg-[var(--mono-active)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--mono-ink)]">
			<Check className="size-3" />
			Published
		</span>
	) : (
		<span className="inline-flex items-center rounded-md border border-dashed border-[var(--mono-line)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--mono-ink-3)]">
			Draft
		</span>
	);
}

function ProjectCard({
	project,
	onOpen,
	onRename,
	onDelete,
	onPublish,
	badge = "Project",
	openLabel = "Open",
}: {
	project: TProjectMetadata;
	onOpen: () => void;
	onRename: () => void;
	onDelete: () => void;
	onPublish?: () => void;
	badge?: string;
	openLabel?: string;
}) {
	return (
		<div className="group relative">
			<button type="button" onClick={onOpen} className="block w-full text-left">
				<div className="bg-muted relative aspect-[4/5] overflow-hidden rounded-xl border border-[var(--mono-strong)] shadow-md ring-1 ring-black/20 transition-all duration-200 group-hover:border-[var(--mono-strong)] group-hover:shadow-xl group-hover:shadow-black/40">
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
					{onPublish && !project.isTemplate && (
						<DropdownMenuItem onClick={onPublish}>
							<LibraryIcon className="size-4" />
							{project.publishedItemId
								? "Publish again to library"
								: "Publish to library"}
						</DropdownMenuItem>
					)}
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
				<div className="flex shrink-0 items-center gap-1.5">
					<ProjectStatusChip project={project} />
					<span className="bg-muted/70 text-muted-foreground rounded-md px-2 py-0.5 text-xs">
						{badge}
					</span>
				</div>
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
					: item.kind === "pdf"
						? FileText
						: VideoIcon;
	const meta =
		item.kind === "carousel"
			? `${item.media.length} slides`
			: item.kind === "audio"
				? "Audio"
				: item.kind === "image"
					? "Image"
					: item.kind === "pdf"
						? "PDF"
						: "Video";
	return (
		<div className="group relative">
			<button type="button" onClick={onOpen} className="block w-full text-left">
				<div className="bg-muted relative aspect-[4/5] overflow-hidden rounded-xl border border-[var(--mono-strong)] shadow-md ring-1 ring-black/20 transition-all duration-200 group-hover:border-[var(--mono-strong)] group-hover:shadow-xl group-hover:shadow-black/40">
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
	onPublish,
	badge = "Project",
}: {
	project: TProjectMetadata;
	onOpen: () => void;
	onRename: () => void;
	onDelete: () => void;
	onPublish?: () => void;
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
			<span className="hidden shrink-0 sm:block">
				<ProjectStatusChip project={project} />
			</span>
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
					{onPublish && !project.isTemplate && (
						<DropdownMenuItem onClick={onPublish}>
							<LibraryIcon className="size-4" />
							{project.publishedItemId
								? "Publish again to library"
								: "Publish to library"}
						</DropdownMenuItem>
					)}
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
