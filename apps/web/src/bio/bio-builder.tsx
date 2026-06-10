"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	ArrowUpRight,
	BarChart3,
	Code2,
	Download,
	GripVertical,
	Heading,
	Image as ImageIcon,
	Link as LinkIcon,
	Mail,
	Plus,
	QrCode,
	Trash2,
	Youtube,
	Eye,
	EyeOff,
	Upload,
} from "lucide-react";
import { cn } from "@/utils/ui";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/auth/client";
import { BioRender, socialIcon } from "./bio-render";
import { BIO_LINK_ICONS, BioLinkIcon, type BioIconKey } from "./bio-icons";
import { fetchOwnerBio, saveBio } from "./bio-client";
import {
	BIO_THEMES,
	type BioBackground,
	type BioBlockKind,
	type BioData,
	type BioLink,
	type BioTheme,
	emptyBio,
	slugifyHandle,
} from "./types";

const FIELD =
	"w-full rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-3.5 py-2.5 text-sm text-[var(--mono-ink)] outline-none transition-colors placeholder:text-[var(--mono-ink-3)] focus:border-[var(--mono-strong)]";
const LABEL =
	"mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]";
const CHIP =
	"flex items-center gap-1.5 rounded-lg border border-[var(--mono-line)] px-2.5 py-1.5 text-xs text-[var(--mono-ink-2)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]";
const uid = () => Math.random().toString(36).slice(2, 9);

const BACKGROUNDS: { k: BioBackground; label: string }[] = [
	{ k: "glow", label: "Glow" },
	{ k: "grid", label: "Grid" },
	{ k: "plain", label: "Plain" },
];
const SOCIAL_PLATFORMS = [
	"youtube",
	"instagram",
	"tiktok",
	"x",
	"linkedin",
	"github",
	"email",
	"website",
];
const BLOCK_TYPES: { kind: BioBlockKind; label: string; Icon: typeof LinkIcon }[] = [
	{ kind: "link", label: "Link", Icon: LinkIcon },
	{ kind: "header", label: "Header", Icon: Heading },
	{ kind: "youtube", label: "YouTube video", Icon: Youtube },
	{ kind: "image", label: "Image", Icon: ImageIcon },
	{ kind: "email", label: "Email collect", Icon: Mail },
];
const EMOJI_CHOICES = ["🔥", "🎬", "🎵", "📬", "🛒", "📅", "💼", "✨", "🚀", "❤️"];

async function uploadImage(file: File): Promise<string> {
	const ext = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "png";
	const r = await fetch(`/api/import-from-url/upload?ext=${encodeURIComponent(ext)}`, {
		method: "POST",
		headers: { "content-type": file.type || "application/octet-stream" },
		body: file,
	});
	const d = (await r.json().catch(() => ({}))) as { key?: string; error?: string };
	if (!r.ok || !d.key) throw new Error(d.error || "Upload failed");
	return `/api/import-from-url/file?key=${encodeURIComponent(d.key)}`;
}

function IconPicker({
	value,
	onChange,
}: {
	value?: string;
	onChange: (icon: string) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label="Pick icon"
					className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] text-[var(--mono-ink-2)] transition-colors hover:border-[var(--mono-strong)] hover:text-[var(--mono-ink)]"
				>
					{value ? <BioLinkIcon icon={value} /> : <Plus className="size-4" />}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-64 p-2">
				<div className="grid grid-cols-8 gap-1">
					{(Object.keys(BIO_LINK_ICONS) as BioIconKey[]).map((k) => {
						const Cmp = BIO_LINK_ICONS[k];
						return (
							<button
								key={k}
								type="button"
								title={k}
								onClick={() => onChange(`lucide:${k}`)}
								className={cn(
									"flex aspect-square items-center justify-center rounded-md text-[var(--mono-ink-2)] hover:bg-[var(--mono-active)] hover:text-[var(--mono-ink)]",
									value === `lucide:${k}` && "bg-[var(--mono-active)] text-[var(--mono-ink)]",
								)}
							>
								<Cmp className="size-4" />
							</button>
						);
					})}
				</div>
				<div className="mt-2 grid grid-cols-8 gap-1 border-t border-[var(--mono-line)] pt-2">
					{EMOJI_CHOICES.map((e) => (
						<button
							key={e}
							type="button"
							onClick={() => onChange(e)}
							className={cn(
								"flex aspect-square items-center justify-center rounded-md text-base hover:bg-[var(--mono-active)]",
								value === e && "bg-[var(--mono-active)]",
							)}
						>
							{e}
						</button>
					))}
				</div>
				{value && (
					<button
						type="button"
						onClick={() => onChange("")}
						className="mt-2 w-full rounded-md py-1 text-center text-xs text-[var(--mono-ink-3)] hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
					>
						No icon
					</button>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

type Stats = {
	views: { day: string; n: number }[];
	clicks: { key: string; n: number }[];
	referrers: { key: string; n: number }[];
	countries: { key: string; n: number }[];
	leads: number;
	recentLeads: { email: string; created_at: number }[];
};

export function BioBuilder({ owner }: { owner: string }) {
	const { data: session } = useSession();
	const loggedIn = !!session?.user;
	const [data, setData] = useState<BioData | null>(null);
	const [handle, setHandle] = useState("");
	const [published, setPublished] = useState(false);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [dirty, setDirty] = useState(false);
	const [tab, setTab] = useState<"editor" | "insights">("editor");
	const [stats, setStats] = useState<Stats | null>(null);
	const [modal, setModal] = useState<null | "qr" | "embed">(null);
	const dragIndex = useRef<number | null>(null);
	const avatarInput = useRef<HTMLInputElement>(null);
	const imageBlockFor = useRef<string | null>(null);
	const imageInput = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!owner) return;
		(async () => {
			const page = await fetchOwnerBio(owner).catch(() => null);
			if (page?.data) {
				setData(page.data);
				setHandle(page.handle);
				setPublished(page.published);
			} else {
				const d = emptyBio(session?.user?.name || "Your name");
				setData(d);
				setHandle(slugifyHandle(session?.user?.name || ""));
			}
			setLoading(false);
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [owner]);

	useEffect(() => {
		if (tab !== "insights") return;
		fetch(`/api/bio/stats?owner=${encodeURIComponent(owner)}`)
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => setStats(d))
			.catch(() => setStats(null));
	}, [tab, owner]);

	const update = (patch: Partial<BioData>) => {
		setData((d) => (d ? { ...d, ...patch } : d));
		setDirty(true);
	};
	const updateLink = (id: string, patch: Partial<BioLink>) => {
		setData((d) =>
			d
				? { ...d, links: d.links.map((l) => (l.id === id ? { ...l, ...patch } : l)) }
				: d,
		);
		setDirty(true);
	};

	const publicUrl = useMemo(
		() =>
			typeof window !== "undefined"
				? `${window.location.origin}/bio/${slugifyHandle(handle)}`
				: `/bio/${handle}`,
		[handle],
	);

	const save = async (nextPublished = published) => {
		if (!data || busy) return;
		const h = slugifyHandle(handle);
		if (!h) {
			toast.error("Pick a handle");
			return;
		}
		if (nextPublished && !loggedIn) {
			toast.error("Log in to publish", {
				description: "Your handle needs an account so nobody can take it.",
			});
			return;
		}
		setBusy(true);
		const tid = toast.loading("Saving…");
		try {
			const res = await saveBio({ owner, handle: h, data, published: nextPublished });
			if (res.error) throw new Error(res.error);
			setHandle(h);
			setPublished(nextPublished);
			setDirty(false);
			toast.success(nextPublished ? "Published" : "Saved", { id: tid });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Save failed", { id: tid });
		} finally {
			setBusy(false);
		}
	};

	if (loading || !data) {
		return (
			<div className="text-muted-foreground flex h-full items-center justify-center text-sm">
				Loading…
			</div>
		);
	}

	const addBlock = (kind: BioBlockKind) => {
		const base: BioLink = { id: uid(), kind, label: "", url: "", icon: "" };
		if (kind === "link") base.icon = "lucide:link";
		if (kind === "email") base.label = "Join the list";
		update({ links: [...data.links, base] });
	};

	const onDragStart = (i: number) => {
		dragIndex.current = i;
	};
	const onDragOverRow = (e: React.DragEvent, i: number) => {
		e.preventDefault();
		const from = dragIndex.current;
		if (from === null || from === i) return;
		const links = [...data.links];
		const [moved] = links.splice(from, 1);
		links.splice(i, 0, moved);
		dragIndex.current = i;
		update({ links });
	};

	const pickImageFor = (id: string) => {
		imageBlockFor.current = id;
		imageInput.current?.click();
	};

	return (
		<div className="flex h-full min-h-0">
			{/* hidden upload inputs */}
			<input
				ref={avatarInput}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={async (e) => {
					const f = e.target.files?.[0];
					e.currentTarget.value = "";
					if (!f) return;
					const tid = toast.loading("Uploading…");
					try {
						update({ avatarUrl: await uploadImage(f) });
						toast.success("Avatar updated", { id: tid });
					} catch (err) {
						toast.error(err instanceof Error ? err.message : "Upload failed", { id: tid });
					}
				}}
			/>
			<input
				ref={imageInput}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={async (e) => {
					const f = e.target.files?.[0];
					const id = imageBlockFor.current;
					e.currentTarget.value = "";
					if (!f || !id) return;
					const tid = toast.loading("Uploading…");
					try {
						updateLink(id, { url: await uploadImage(f) });
						toast.success("Image added", { id: tid });
					} catch (err) {
						toast.error(err instanceof Error ? err.message : "Upload failed", { id: tid });
					}
				}}
			/>

			{/* Editor column */}
			<div className="min-w-0 flex-1 overflow-y-auto">
				<div className="mx-auto max-w-xl px-4 pt-16 pb-8 sm:px-8 lg:pt-8">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h1 className="text-2xl font-semibold tracking-tight">Link in bio</h1>
							<a
								href={publicUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="mt-1 flex items-center gap-1 text-sm text-[var(--mono-ink-3)] hover:text-[var(--mono-ink)]"
							>
								/bio/{slugifyHandle(handle) || "…"} <ArrowUpRight className="size-3.5" />
							</a>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="ghost" onClick={() => save(published)} disabled={busy}>
								Save
							</Button>
							<Button onClick={() => save(!published)} disabled={busy}>
								{published ? "Unpublish" : "Publish"}
							</Button>
						</div>
					</div>

					{!loggedIn && (
						<div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-200/90">
							You're editing as a guest. Log in to publish and claim your handle.
						</div>
					)}

					{/* toolbar */}
					<div className="mt-4 flex flex-wrap items-center gap-1.5">
						<button
							type="button"
							onClick={() => setTab("editor")}
							className={cn(CHIP, tab === "editor" && "bg-[var(--mono-active)] text-[var(--mono-ink)]")}
						>
							Editor
						</button>
						<button
							type="button"
							onClick={() => setTab("insights")}
							className={cn(CHIP, tab === "insights" && "bg-[var(--mono-active)] text-[var(--mono-ink)]")}
						>
							<BarChart3 className="size-3.5" /> Insights
						</button>
						<div className="mx-1 h-4 w-px bg-[var(--mono-line)]" />
						<button type="button" onClick={() => setModal("qr")} className={CHIP}>
							<QrCode className="size-3.5" /> QR
						</button>
						<button type="button" onClick={() => setModal("embed")} className={CHIP}>
							<Code2 className="size-3.5" /> Embed
						</button>
						{published && (
							<button
								type="button"
								onClick={() => {
									navigator.clipboard?.writeText(publicUrl);
									toast.success("Link copied");
								}}
								className={CHIP}
							>
								Copy link
							</button>
						)}
					</div>

					{tab === "insights" ? (
						<Insights stats={stats} data={data} owner={owner} />
					) : (
						<>
							{/* Profile */}
							<Section title="Profile">
								<div className="flex items-center gap-4">
									<button
										type="button"
										onClick={() => avatarInput.current?.click()}
										className="group relative size-16 shrink-0 overflow-hidden rounded-full border border-[var(--mono-line)] bg-[var(--mono-hover)]"
										aria-label="Upload avatar"
									>
										{data.avatarUrl ? (
											// eslint-disable-next-line @next/next/no-img-element
											<img src={data.avatarUrl} alt="" className="size-full object-cover" />
										) : (
											<span className="flex size-full items-center justify-center text-lg font-bold text-[var(--mono-ink-2)]">
												{(data.displayName || "?").slice(0, 1).toUpperCase()}
											</span>
										)}
										<span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
											<Upload className="size-4 text-white" />
										</span>
									</button>
									<div className="min-w-0 flex-1 space-y-3">
										<input
											className={FIELD}
											placeholder="Display name"
											value={data.displayName}
											onChange={(e) => update({ displayName: e.target.value })}
										/>
										<input
											className={FIELD}
											placeholder="Tagline"
											value={data.tagline}
											onChange={(e) => update({ tagline: e.target.value })}
										/>
									</div>
								</div>
								<div>
									<label className={LABEL}>Handle</label>
									<div className="flex items-center gap-1.5">
										<span className="text-sm text-[var(--mono-ink-3)]">/bio/</span>
										<input
											className={FIELD}
											value={handle}
											onChange={(e) => {
												setHandle(e.target.value);
												setDirty(true);
											}}
											onBlur={() => setHandle((h) => slugifyHandle(h))}
										/>
									</div>
								</div>
							</Section>

							{/* Blocks */}
							<Section
								title="Blocks"
								action={
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<button type="button" className={CHIP}>
												<Plus className="size-3.5" /> Add block
											</button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											{BLOCK_TYPES.map((b) => (
												<DropdownMenuItem key={b.kind} onClick={() => addBlock(b.kind)}>
													<b.Icon className="size-4" /> {b.label}
												</DropdownMenuItem>
											))}
										</DropdownMenuContent>
									</DropdownMenu>
								}
							>
								{data.links.length === 0 && (
									<p className="text-sm text-[var(--mono-ink-3)]">
										No blocks yet. Add a link to get started.
									</p>
								)}
								{data.links.map((l, i) => {
									const kind = l.kind ?? "link";
									return (
										<div
											key={l.id}
											draggable
											onDragStart={() => onDragStart(i)}
											onDragOver={(e) => onDragOverRow(e, i)}
											onDragEnd={() => {
												dragIndex.current = null;
											}}
											className={cn(
												"rounded-xl border border-[var(--mono-line)] bg-[var(--mono-hover)] p-3",
												l.hidden && "opacity-50",
											)}
										>
											<div className="flex items-center gap-2">
												<GripVertical className="size-4 shrink-0 cursor-grab text-[var(--mono-ink-3)]" />
												{kind === "link" && (
													<IconPicker
														value={l.icon}
														onChange={(icon) => updateLink(l.id, { icon })}
													/>
												)}
												{kind !== "link" && (
													<span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--mono-line)] text-[var(--mono-ink-3)]">
														{kind === "header" && <Heading className="size-4" />}
														{kind === "youtube" && <Youtube className="size-4" />}
														{kind === "image" && <ImageIcon className="size-4" />}
														{kind === "email" && <Mail className="size-4" />}
													</span>
												)}
												<input
													className={cn(FIELD, "flex-1")}
													placeholder={
														kind === "header"
															? "Section title"
															: kind === "email"
																? "Form heading"
																: "Label"
													}
													value={l.label}
													onChange={(e) => updateLink(l.id, { label: e.target.value })}
												/>
												<button
													type="button"
													onClick={() => updateLink(l.id, { hidden: !l.hidden })}
													aria-label={l.hidden ? "Show block" : "Hide block"}
													title={l.hidden ? "Hidden" : "Visible"}
													className="text-[var(--mono-ink-3)] hover:text-[var(--mono-ink)]"
												>
													{l.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
												</button>
												<button
													type="button"
													onClick={() =>
														update({ links: data.links.filter((x) => x.id !== l.id) })
													}
													className="text-[var(--mono-ink-3)] hover:text-red-400"
													aria-label="Remove"
												>
													<Trash2 className="size-4" />
												</button>
											</div>
											{(kind === "link" || kind === "youtube") && (
												<input
													className={cn(FIELD, "mt-2")}
													placeholder={
														kind === "youtube" ? "YouTube video URL" : "https://…"
													}
													value={l.url}
													onChange={(e) => updateLink(l.id, { url: e.target.value })}
												/>
											)}
											{kind === "image" && (
												<div className="mt-2 flex items-center gap-2">
													{l.url ? (
														// eslint-disable-next-line @next/next/no-img-element
														<img
															src={l.url}
															alt=""
															className="h-12 w-20 rounded-lg border border-[var(--mono-line)] object-cover"
														/>
													) : null}
													<button
														type="button"
														onClick={() => pickImageFor(l.id)}
														className={CHIP}
													>
														<Upload className="size-3.5" />
														{l.url ? "Replace image" : "Upload image"}
													</button>
												</div>
											)}
										</div>
									);
								})}
							</Section>

							{/* Socials */}
							<Section
								title="Social icons"
								action={
									<button
										type="button"
										onClick={() =>
											update({
												socials: [
													...data.socials,
													{ id: uid(), platform: "youtube", url: "" },
												],
											})
										}
										className={CHIP}
									>
										<Plus className="size-3.5" /> Add social
									</button>
								}
							>
								{data.socials.map((sNode) => (
									<div key={sNode.id} className="flex items-center gap-2">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<button
													type="button"
													className="flex w-36 shrink-0 items-center gap-2 rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-3 py-2.5 text-sm capitalize text-[var(--mono-ink)] transition-colors hover:border-[var(--mono-strong)]"
												>
													{socialIcon(sNode.platform, "size-4")}
													<span className="flex-1 text-left">{sNode.platform}</span>
												</button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="start">
												{SOCIAL_PLATFORMS.map((p) => (
													<DropdownMenuItem
														key={p}
														onClick={() =>
															update({
																socials: data.socials.map((x) =>
																	x.id === sNode.id ? { ...x, platform: p } : x,
																),
															})
														}
														className="capitalize"
													>
														{socialIcon(p, "size-4")} {p}
													</DropdownMenuItem>
												))}
											</DropdownMenuContent>
										</DropdownMenu>
										<input
											className={cn(FIELD, "flex-1")}
											placeholder="URL or @handle"
											value={sNode.url}
											onChange={(e) =>
												update({
													socials: data.socials.map((x) =>
														x.id === sNode.id ? { ...x, url: e.target.value } : x,
													),
												})
											}
										/>
										<button
											type="button"
											onClick={() =>
												update({ socials: data.socials.filter((x) => x.id !== sNode.id) })
											}
											className="text-[var(--mono-ink-3)] hover:text-red-400"
											aria-label="Remove"
										>
											<Trash2 className="size-4" />
										</button>
									</div>
								))}
							</Section>

							{/* Theme */}
							<Section title="Theme">
								<div>
									<label className={LABEL}>Palette</label>
									<div className="flex flex-wrap gap-2">
										{(Object.keys(BIO_THEMES) as BioTheme[]).map((tk) => (
											<button
												key={tk}
												type="button"
												onClick={() => update({ theme: tk })}
												className={cn(
													"flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] transition-colors",
													data.theme === tk
														? "border-[var(--mono-strong)] bg-[var(--mono-active)] text-[var(--mono-ink)]"
														: "border-[var(--mono-line)] text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)]",
												)}
											>
												<span
													className="size-3 rounded-full"
													style={{
														background: BIO_THEMES[tk].bg,
														boxShadow: `0 0 0 1px ${BIO_THEMES[tk].border}`,
													}}
												/>
												{BIO_THEMES[tk].label}
											</button>
										))}
									</div>
								</div>
								<div className="flex gap-4">
									<div>
										<label className={LABEL}>Accent</label>
										<input
											type="color"
											value={data.accent}
											onChange={(e) => update({ accent: e.target.value })}
											className="h-10 w-16 cursor-pointer rounded-lg border border-[var(--mono-line)] bg-transparent"
										/>
									</div>
									<div className="flex-1">
										<label className={LABEL}>Background</label>
										<div className="flex gap-2">
											{BACKGROUNDS.map((b) => (
												<button
													key={b.k}
													type="button"
													onClick={() => update({ background: b.k })}
													className={cn(
														"flex-1 rounded-lg border px-3 py-2 text-[13px] transition-colors",
														data.background === b.k
															? "border-[var(--mono-strong)] bg-[var(--mono-active)] text-[var(--mono-ink)]"
															: "border-[var(--mono-line)] text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)]",
													)}
												>
													{b.label}
												</button>
											))}
										</div>
									</div>
								</div>
							</Section>

							{loggedIn && <CustomDomainSection />}
						</>
					)}

					<div className="h-10" />
				</div>
			</div>

			{/* Live preview */}
			<div className="hidden w-[26rem] shrink-0 items-start justify-center border-l border-[var(--mono-line)] bg-[var(--mono-hover)] p-8 lg:flex">
				<div className="sticky top-8">
					<div
						className="h-[36rem] w-72 overflow-hidden rounded-[2.2rem] border-[6px] border-[#0a0a0a] shadow-2xl"
						style={{ background: "#000" }}
					>
						<div className="h-full overflow-y-auto">
							<BioRender data={data} preview />
						</div>
					</div>
					<div className="mt-3 text-center text-xs text-[var(--mono-ink-3)]">
						{dirty ? "Unsaved changes" : published ? "Live" : "Draft"}
					</div>
				</div>
			</div>

			{modal === "qr" && (
				<QrModal url={publicUrl} onClose={() => setModal(null)} />
			)}
			{modal === "embed" && (
				<EmbedModal
					handle={slugifyHandle(handle)}
					onClose={() => setModal(null)}
				/>
			)}
		</div>
	);
}

function Insights({
	stats,
	data,
	owner,
}: {
	stats: Stats | null;
	data: BioData;
	owner: string;
}) {
	if (!stats) {
		return (
			<div className="py-12 text-center text-sm text-[var(--mono-ink-3)]">
				Loading insights…
			</div>
		);
	}
	const viewTotal = stats.views.reduce((a, v) => a + Number(v.n || 0), 0);
	const clickTotal = stats.clicks.reduce((a, v) => a + Number(v.n || 0), 0);
	const maxDay = Math.max(1, ...stats.views.map((v) => Number(v.n || 0)));
	const linkLabel = (id: string) =>
		data.links.find((l) => l.id === id)?.label || "Removed link";
	const card =
		"rounded-xl border border-[var(--mono-line)] bg-[var(--mono-hover)] p-4";

	return (
		<div className="mt-6 space-y-3">
			<div className="grid grid-cols-3 gap-3">
				{[
					{ label: "Views · 28d", value: viewTotal },
					{ label: "Clicks · 28d", value: clickTotal },
					{ label: "Leads", value: stats.leads },
				].map((s) => (
					<div key={s.label} className={card}>
						<div className="text-[11px] uppercase tracking-wide text-[var(--mono-ink-3)]">
							{s.label}
						</div>
						<div className="mt-1 text-2xl font-semibold tabular-nums">{s.value}</div>
					</div>
				))}
			</div>

			<div className={card}>
				<div className="mb-3 text-sm font-semibold">Views</div>
				{stats.views.length === 0 ? (
					<div className="py-6 text-center text-sm text-[var(--mono-ink-3)]">
						No views yet. Share your link.
					</div>
				) : (
					<div className="flex h-20 items-end gap-1">
						{stats.views.map((v) => (
							<div
								key={v.day}
								title={`${v.day}: ${v.n}`}
								style={{ height: `${(Number(v.n) / maxDay) * 100}%` }}
								className="min-h-1 flex-1 rounded-sm bg-[var(--mono-strong)]"
							/>
						))}
					</div>
				)}
			</div>

			<div className={card}>
				<div className="mb-2 text-sm font-semibold">Link clicks</div>
				{stats.clicks.length === 0 ? (
					<div className="py-4 text-center text-sm text-[var(--mono-ink-3)]">
						No clicks tracked yet.
					</div>
				) : (
					<div className="space-y-1.5">
						{stats.clicks.map((c) => (
							<div key={c.key} className="flex items-center gap-2 text-sm">
								<span className="flex-1 truncate text-[var(--mono-ink-2)]">
									{linkLabel(c.key)}
								</span>
								<span className="tabular-nums text-[var(--mono-ink)]">{c.n}</span>
							</div>
						))}
					</div>
				)}
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className={card}>
					<div className="mb-2 text-sm font-semibold">Top referrers</div>
					{stats.referrers.length === 0 ? (
						<div className="text-sm text-[var(--mono-ink-3)]">No data yet</div>
					) : (
						stats.referrers.map((r) => (
							<div key={r.key} className="flex justify-between text-sm">
								<span className="truncate text-[var(--mono-ink-2)]">{r.key}</span>
								<span className="tabular-nums">{r.n}</span>
							</div>
						))
					)}
				</div>
				<div className={card}>
					<div className="mb-2 text-sm font-semibold">Countries</div>
					{stats.countries.length === 0 ? (
						<div className="text-sm text-[var(--mono-ink-3)]">No data yet</div>
					) : (
						stats.countries.map((r) => (
							<div key={r.key} className="flex justify-between text-sm">
								<span className="text-[var(--mono-ink-2)]">{r.key}</span>
								<span className="tabular-nums">{r.n}</span>
							</div>
						))
					)}
				</div>
			</div>

			<div className={card}>
				<div className="mb-2 flex items-center justify-between">
					<span className="text-sm font-semibold">Email leads</span>
					<a
						href={`/api/bio/leads?owner=${encodeURIComponent(owner)}`}
						className="flex items-center gap-1 text-xs text-[var(--mono-ink-2)] hover:text-[var(--mono-ink)]"
					>
						<Download className="size-3.5" /> Export CSV
					</a>
				</div>
				{stats.recentLeads.length === 0 ? (
					<div className="text-sm text-[var(--mono-ink-3)]">
						Add an "Email collect" block to start gathering subscribers.
					</div>
				) : (
					stats.recentLeads.map((l) => (
						<div key={l.email} className="flex justify-between py-0.5 text-sm">
							<span className="truncate text-[var(--mono-ink-2)]">{l.email}</span>
							<span className="text-xs text-[var(--mono-ink-3)]">
								{new Date(l.created_at).toLocaleDateString()}
							</span>
						</div>
					))
				)}
			</div>
		</div>
	);
}

function QrModal({ url, onClose }: { url: string; onClose: () => void }) {
	const [src, setSrc] = useState("");
	useEffect(() => {
		import("qrcode").then((QR) =>
			QR.toDataURL(url, { width: 480, margin: 1 }).then(setSrc).catch(() => {}),
		);
	}, [url]);
	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-xs gap-0 rounded-2xl border-[var(--mono-line)] bg-[var(--mono-panel)] p-0 text-[var(--mono-ink)]">
				<div className="border-b border-[var(--mono-line)] px-6 py-4">
					<DialogTitle className="text-[15px] font-semibold text-[var(--mono-ink)]">
						QR code
					</DialogTitle>
				</div>
				<div className="flex flex-col items-center gap-3 p-6">
					{src ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={src} alt="QR code" className="w-full rounded-xl bg-white p-3" />
					) : (
						<div className="py-16 text-sm text-[var(--mono-ink-3)]">Generating…</div>
					)}
					{src && (
						<a
							href={src}
							download="bio-qr.png"
							className="text-sm text-[var(--mono-ink-2)] hover:text-[var(--mono-ink)]"
						>
							Download PNG
						</a>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}

function EmbedModal({
	handle,
	onClose,
}: {
	handle: string;
	onClose: () => void;
}) {
	const origin =
		typeof window !== "undefined" ? window.location.origin : "https://edits.51ultron.com";
	const scriptSnippet = `<script src="${origin}/embed.js" data-handle="${handle}" async></script>`;
	const iframeSnippet = `<iframe src="${origin}/bio/${handle}/embed" style="width:100%;border:0;border-radius:16px;height:520px" loading="lazy" title="${handle} — links"></iframe>`;
	const copy = (text: string) => {
		navigator.clipboard?.writeText(text);
		toast.success("Copied");
	};
	const box =
		"rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] p-3 font-mono text-[11px] leading-relaxed text-[var(--mono-ink-2)] break-all";
	return (
		<Dialog open onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-md gap-0 rounded-2xl border-[var(--mono-line)] bg-[var(--mono-panel)] p-0 text-[var(--mono-ink)]">
				<div className="border-b border-[var(--mono-line)] px-6 py-4">
					<DialogTitle className="text-[15px] font-semibold text-[var(--mono-ink)]">
						Embed on your site
					</DialogTitle>
					<p className="mt-1 text-xs text-[var(--mono-ink-3)]">
						Auto-sizing script (recommended) or a plain iframe.
					</p>
				</div>
				<div className="space-y-4 p-6">
					<div>
						<div className="mb-1.5 flex items-center justify-between">
							<span className="text-xs font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]">
								Script
							</span>
							<button
								type="button"
								onClick={() => copy(scriptSnippet)}
								className="text-xs text-[var(--mono-ink-2)] hover:text-[var(--mono-ink)]"
							>
								Copy
							</button>
						</div>
						<div className={box}>{scriptSnippet}</div>
					</div>
					<div>
						<div className="mb-1.5 flex items-center justify-between">
							<span className="text-xs font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]">
								iframe
							</span>
							<button
								type="button"
								onClick={() => copy(iframeSnippet)}
								className="text-xs text-[var(--mono-ink-2)] hover:text-[var(--mono-ink)]"
							>
								Copy
							</button>
						</div>
						<div className={box}>{iframeSnippet}</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function Section({
	title,
	action,
	children,
}: {
	title: string;
	action?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="mt-8">
			<div className="mb-3 flex items-center justify-between">
				<h2 className="text-sm font-semibold text-[var(--mono-ink)]">{title}</h2>
				{action}
			</div>
			<div className="space-y-3">{children}</div>
		</div>
	);
}

function CustomDomainSection() {
	const [state, setState] = useState<{
		domain: string | null;
		status?: string;
		sslStatus?: string;
		target?: string;
	} | null>(null);
	const [input, setInput] = useState("");
	const [busy, setBusy] = useState(false);

	const load = () => {
		fetch("/api/bio/domain")
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => setState(d))
			.catch(() => setState(null));
	};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(load, []);

	const connect = async () => {
		if (!input.trim() || busy) return;
		setBusy(true);
		const tid = toast.loading("Registering domain…");
		try {
			const r = await fetch("/api/bio/domain", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ domain: input.trim() }),
			});
			const d = (await r.json().catch(() => ({}))) as { error?: string };
			if (!r.ok) throw new Error(d.error || "Failed");
			toast.success("Domain registered. Add the DNS record", { id: tid });
			setInput("");
			load();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed", {
				id: tid,
				duration: 9000,
			});
		} finally {
			setBusy(false);
		}
	};

	const remove = async () => {
		if (busy) return;
		setBusy(true);
		try {
			await fetch("/api/bio/domain", { method: "DELETE" });
			load();
		} finally {
			setBusy(false);
		}
	};

	const target = state?.target ?? "bio-edge.51ultron.com";

	return (
		<Section title="Custom domain">
			{state?.domain ? (
				<div className="rounded-xl border border-[var(--mono-line)] bg-[var(--mono-hover)] p-4">
					<div className="flex items-center justify-between gap-3">
						<div className="min-w-0">
							<div className="truncate text-sm font-medium text-[var(--mono-ink)]">
								{state.domain}
							</div>
							<div className="mt-0.5 text-xs text-[var(--mono-ink-3)]">
								{state.status === "active"
									? "Active. Your page is live on this domain"
									: `Status: ${state.status ?? "pending"}${state.sslStatus ? ` · cert ${state.sslStatus}` : ""}`}
							</div>
						</div>
						<span
							className={cn(
								"size-2 shrink-0 rounded-full",
								state.status === "active" ? "bg-green-500" : "bg-amber-400",
							)}
						/>
					</div>
					{state.status !== "active" && (
						<div className="mt-3 rounded-lg border border-[var(--mono-line)] bg-[var(--mono-field)] p-3 text-xs leading-relaxed text-[var(--mono-ink-2)]">
							Add this DNS record at your domain provider, then give it a few
							minutes:
							<div className="mt-2 font-mono">
								CNAME&nbsp;&nbsp;{state.domain}&nbsp;&nbsp;→&nbsp;&nbsp;{target}
							</div>
						</div>
					)}
					<div className="mt-3 flex items-center gap-3">
						<button
							type="button"
							onClick={load}
							className="text-xs text-[var(--mono-ink-2)] hover:text-[var(--mono-ink)]"
						>
							Refresh status
						</button>
						<button
							type="button"
							onClick={remove}
							disabled={busy}
							className="text-xs text-red-400/80 hover:text-red-400"
						>
							Disconnect
						</button>
					</div>
				</div>
			) : (
				<div>
					<div className="flex gap-2">
						<input
							className={FIELD}
							placeholder="links.yourdomain.com"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && connect()}
						/>
						<Button onClick={connect} disabled={busy || !input.trim()}>
							Connect
						</Button>
					</div>
					<p className="mt-2 text-xs leading-relaxed text-[var(--mono-ink-3)]">
						Use a subdomain (e.g. links.yourdomain.com) and point it via CNAME
						to {target}. SSL is issued automatically once DNS resolves.
					</p>
				</div>
			)}
		</Section>
	);
}
