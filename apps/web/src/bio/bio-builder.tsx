"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	ArrowUpRight,
	ChevronDown,
	ChevronUp,
	GripVertical,
	Plus,
	Trash2,
} from "lucide-react";
import { cn } from "@/utils/ui";
import { Button } from "@/components/ui/button";
import { BioRender } from "./bio-render";
import { fetchOwnerBio, saveBio } from "./bio-client";
import {
	BIO_THEMES,
	type BioBackground,
	type BioData,
	type BioTheme,
	emptyBio,
	slugifyHandle,
} from "./types";

const FIELD =
	"w-full rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-3.5 py-2.5 text-sm text-[var(--mono-ink)] outline-none transition-colors placeholder:text-[var(--mono-ink-3)] focus:border-[var(--mono-strong)]";
const LABEL =
	"mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]";
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

export function BioBuilder({ owner }: { owner: string }) {
	const [data, setData] = useState<BioData | null>(null);
	const [handle, setHandle] = useState("");
	const [published, setPublished] = useState(false);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [dirty, setDirty] = useState(false);

	useEffect(() => {
		if (!owner) return;
		(async () => {
			const page = await fetchOwnerBio(owner).catch(() => null);
			if (page?.data) {
				setData(page.data);
				setHandle(page.handle);
				setPublished(page.published);
			} else {
				const d = emptyBio();
				setData(d);
				setHandle(slugifyHandle(d.displayName));
			}
			setLoading(false);
		})();
	}, [owner]);

	const update = (patch: Partial<BioData>) => {
		setData((d) => (d ? { ...d, ...patch } : d));
		setDirty(true);
	};

	const publicUrl = useMemo(
		() =>
			typeof window !== "undefined"
				? `${window.location.origin}/bio/${handle}`
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

	const moveLink = (i: number, dir: -1 | 1) => {
		const j = i + dir;
		if (j < 0 || j >= data.links.length) return;
		const links = [...data.links];
		[links[i], links[j]] = [links[j], links[i]];
		update({ links });
	};

	return (
		<div className="flex h-full min-h-0">
			{/* Editor */}
			<div className="min-w-0 flex-1 overflow-y-auto">
				<div className="mx-auto max-w-xl px-8 py-8">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h1 className="text-2xl font-semibold tracking-tight">
								Link in bio
							</h1>
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

					{published && (
						<button
							type="button"
							onClick={() => {
								navigator.clipboard?.writeText(publicUrl);
								toast.success("Link copied");
							}}
							className="mt-3 flex w-full items-center justify-between rounded-lg border border-[var(--mono-line)] bg-[var(--mono-hover)] px-3.5 py-2 text-sm text-[var(--mono-ink-2)] hover:text-[var(--mono-ink)]"
						>
							<span className="truncate">{publicUrl}</span>
							<span className="ml-2 shrink-0 text-xs text-[var(--mono-ink-3)]">
								Copy
							</span>
						</button>
					)}

					{/* Profile */}
					<Section title="Profile">
						<div>
							<label className={LABEL}>Display name</label>
							<input
								className={FIELD}
								value={data.displayName}
								onChange={(e) => update({ displayName: e.target.value })}
							/>
						</div>
						<div>
							<label className={LABEL}>Tagline</label>
							<input
								className={FIELD}
								value={data.tagline}
								onChange={(e) => update({ tagline: e.target.value })}
							/>
						</div>
						<div>
							<label className={LABEL}>Avatar URL</label>
							<input
								className={FIELD}
								placeholder="https://…  (or leave blank for initials)"
								value={data.avatarUrl ?? ""}
								onChange={(e) => update({ avatarUrl: e.target.value })}
							/>
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

					{/* Links */}
					<Section
						title="Links"
						action={
							<button
								type="button"
								onClick={() =>
									update({
										links: [...data.links, { id: uid(), label: "", url: "", icon: "" }],
									})
								}
								className="flex items-center gap-1 text-xs text-[var(--mono-ink-2)] hover:text-[var(--mono-ink)]"
							>
								<Plus className="size-3.5" /> Add link
							</button>
						}
					>
						{data.links.length === 0 && (
							<p className="text-sm text-[var(--mono-ink-3)]">No links yet.</p>
						)}
						{data.links.map((l, i) => (
							<div
								key={l.id}
								className="rounded-xl border border-[var(--mono-line)] bg-[var(--mono-hover)] p-3"
							>
								<div className="flex items-center gap-2">
									<GripVertical className="size-4 shrink-0 text-[var(--mono-ink-3)]" />
									<input
										className={cn(FIELD, "w-16 px-2 text-center")}
										placeholder="▶"
										maxLength={2}
										value={l.icon ?? ""}
										onChange={(e) =>
											update({
												links: data.links.map((x) =>
													x.id === l.id ? { ...x, icon: e.target.value } : x,
												),
											})
										}
									/>
									<input
										className={cn(FIELD, "flex-1")}
										placeholder="Label"
										value={l.label}
										onChange={(e) =>
											update({
												links: data.links.map((x) =>
													x.id === l.id ? { ...x, label: e.target.value } : x,
												),
											})
										}
									/>
									<div className="flex flex-col">
										<button
											type="button"
											onClick={() => moveLink(i, -1)}
											className="text-[var(--mono-ink-3)] hover:text-[var(--mono-ink)]"
											aria-label="Move up"
										>
											<ChevronUp className="size-3.5" />
										</button>
										<button
											type="button"
											onClick={() => moveLink(i, 1)}
											className="text-[var(--mono-ink-3)] hover:text-[var(--mono-ink)]"
											aria-label="Move down"
										>
											<ChevronDown className="size-3.5" />
										</button>
									</div>
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
								<input
									className={cn(FIELD, "mt-2")}
									placeholder="https://…"
									value={l.url}
									onChange={(e) =>
										update({
											links: data.links.map((x) =>
												x.id === l.id ? { ...x, url: e.target.value } : x,
											),
										})
									}
								/>
							</div>
						))}
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
								className="flex items-center gap-1 text-xs text-[var(--mono-ink-2)] hover:text-[var(--mono-ink)]"
							>
								<Plus className="size-3.5" /> Add social
							</button>
						}
					>
						{data.socials.map((sNode) => (
							<div key={sNode.id} className="flex items-center gap-2">
								<select
									className={cn(FIELD, "w-32 capitalize")}
									style={{ colorScheme: "dark" }}
									value={sNode.platform}
									onChange={(e) =>
										update({
											socials: data.socials.map((x) =>
												x.id === sNode.id ? { ...x, platform: e.target.value } : x,
											),
										})
									}
								>
									{SOCIAL_PLATFORMS.map((p) => (
										<option key={p} value={p}>
											{p}
										</option>
									))}
								</select>
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
										update({
											socials: data.socials.filter((x) => x.id !== sNode.id),
										})
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
											style={{ background: BIO_THEMES[tk].bg, boxShadow: `0 0 0 1px ${BIO_THEMES[tk].border}` }}
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
						{dirty ? "Unsaved changes" : published ? "Live preview" : "Draft preview"}
					</div>
				</div>
			</div>
		</div>
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
