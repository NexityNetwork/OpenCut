"use client";

// Per-asset detail — rendered INSIDE the library (sidebar stays put), not a
// separate route. Media fits its own frame (no pillarbox bars); title/caption
// are editable; the asset can be pushed into the editor, the canvas, or a post.

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	Clapperboard,
	Download,
	FileText,
	Frame,
	Loader2,
	Rocket,
} from "lucide-react";
import { cn } from "@/utils/ui";
import { Button } from "@/components/ui/button";
import { fileUrl, type VaultItem } from "@/projects/vault-client";

function fmtDur(sec?: number): string {
	if (!sec || !Number.isFinite(sec)) return "";
	const m = Math.floor(sec / 60);
	const s = Math.floor(sec % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

const NO_SCROLLBAR =
	"[scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function AssetDetail({
	item,
	owner,
	onBack,
	onSaved,
	onOpenEditor,
	onOpenCanvas,
	onCompose,
}: {
	item: VaultItem;
	owner: string;
	onBack: () => void;
	onSaved: (item: VaultItem) => void;
	onOpenEditor: (item: VaultItem) => Promise<void>;
	onOpenCanvas: (item: VaultItem) => Promise<void>;
	onCompose: (item: VaultItem) => void;
}) {
	const [title, setTitle] = useState(item.name);
	const [caption, setCaption] = useState(item.caption ?? "");
	const [saving, setSaving] = useState(false);
	const [busy, setBusy] = useState<"editor" | "canvas" | null>(null);
	const [page, setPage] = useState(0);

	useEffect(() => {
		setTitle(item.name);
		setCaption(item.caption ?? "");
		setPage(0);
	}, [item]);

	const dirty = title.trim() !== item.name || caption !== (item.caption ?? "");
	const isPdf = item.kind === "pdf";
	const isVideo = item.kind === "video";
	const images = item.media.filter((m) => m.type === "image");
	const cur = item.media[Math.min(page, item.media.length - 1)];
	const canCanvas = item.kind === "carousel" || item.kind === "image";

	const save = async () => {
		if (saving || !dirty) return;
		setSaving(true);
		try {
			const r = await fetch("/api/vault", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ owner, id: item.id, name: title.trim() || item.name, caption }),
			});
			if (!r.ok) throw new Error("Save failed");
			onSaved({ ...item, name: title.trim() || item.name, caption: caption.trim() ? caption : undefined });
			toast.success("Saved");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Save failed");
		} finally {
			setSaving(false);
		}
	};

	const run = async (kind: "editor" | "canvas") => {
		if (busy) return;
		setBusy(kind);
		try {
			await (kind === "editor" ? onOpenEditor(item) : onOpenCanvas(item));
		} finally {
			setBusy(null);
		}
	};

	return (
		<div className="px-4 pt-14 pb-16 sm:px-8 lg:pt-4">
			<div className="mb-4 flex items-center justify-between">
				<button
					type="button"
					onClick={onBack}
					className="flex items-center gap-1.5 text-[13px] text-[var(--mono-ink-2)] transition-colors hover:text-[var(--mono-ink)]"
				>
					<ArrowLeft className="size-4" /> Library
				</button>
				<span className="rounded-md bg-[var(--mono-active)] px-2 py-0.5 text-[11px] font-medium text-[var(--mono-ink-2)] capitalize">
					{item.kind}
				</span>
			</div>

			<div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
				{/* Media — fits its own aspect, no bars */}
				<div className="flex min-w-0 flex-col items-center">
					{isVideo ? (
						// biome-ignore lint/a11y/useMediaCaption: user media
						<video
							key={item.id}
							src={fileUrl(item.media[0]?.key || "")}
							controls
							autoPlay
							playsInline
							className="max-h-[78vh] max-w-full rounded-2xl border border-[var(--mono-line)]"
						/>
					) : isPdf ? (
						<iframe
							title={item.name}
							src={fileUrl(item.media[0]?.key || "")}
							className="h-[78vh] w-full max-w-[56ch] rounded-2xl border border-[var(--mono-line)] bg-white"
						/>
					) : (
						<div className="relative inline-flex">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={fileUrl(cur?.key || "")}
								alt={item.name}
								className="block max-h-[78vh] max-w-full rounded-2xl border border-[var(--mono-line)]"
							/>
							{item.media.length > 1 && (
								<>
									<button
										type="button"
										onClick={() => setPage((page - 1 + item.media.length) % item.media.length)}
										aria-label="Previous"
										className="absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
									>
										<ChevronLeft className="size-5" />
									</button>
									<button
										type="button"
										onClick={() => setPage((page + 1) % item.media.length)}
										aria-label="Next"
										className="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
									>
										<ChevronRight className="size-5" />
									</button>
									<div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-0.5 text-xs text-white backdrop-blur">
										{Math.min(page, item.media.length - 1) + 1} / {item.media.length}
									</div>
								</>
							)}
						</div>
					)}

					{images.length > 1 && (
						<div className={cn("mt-3 flex max-w-full gap-2 overflow-x-auto pb-1", NO_SCROLLBAR)}>
							{item.media.map((m, i) => (
								<button
									key={m.key}
									type="button"
									onClick={() => setPage(i)}
									className={cn(
										"size-14 shrink-0 overflow-hidden rounded-lg border transition-all",
										i === Math.min(page, item.media.length - 1)
											? "border-[var(--mono-strong)] ring-2 ring-[var(--mono-strong)]"
											: "border-[var(--mono-line)] opacity-70 hover:opacity-100",
									)}
								>
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img src={fileUrl(m.key)} alt="" className="size-full object-cover" />
								</button>
							))}
						</div>
					)}
				</div>

				{/* Details */}
				<div className="flex flex-col gap-5">
					<div>
						<label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-[var(--mono-ink-3)] uppercase">
							Title
						</label>
						<input
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Add a title"
							className="w-full rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-3.5 py-2.5 text-sm text-[var(--mono-ink)] outline-none transition-colors placeholder:text-[var(--mono-ink-3)] focus:border-[var(--mono-strong)]"
						/>
					</div>
					<div>
						<label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-[var(--mono-ink-3)] uppercase">
							Caption
						</label>
						<textarea
							value={caption}
							onChange={(e) => setCaption(e.target.value)}
							placeholder="Write the caption this post will use"
							className="min-h-40 w-full resize-none rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--mono-ink)] outline-none transition-colors placeholder:text-[var(--mono-ink-3)] focus:border-[var(--mono-strong)]"
						/>
					</div>

					<Button onClick={save} disabled={!dirty || saving}>
						{saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
					</Button>

					<div className="space-y-2 border-t border-[var(--mono-line)] pt-5">
						{!isPdf && (
							<ActionRow
								icon={busy === "editor" ? <Loader2 className="size-4 animate-spin" /> : <Clapperboard className="size-4" />}
								title="Open in editor"
								sub={`New project with this ${item.kind} ready to edit`}
								onClick={() => void run("editor")}
								disabled={!!busy}
							/>
						)}
						{canCanvas && (
							<ActionRow
								icon={busy === "canvas" ? <Loader2 className="size-4 animate-spin" /> : <Frame className="size-4" />}
								title="Open in canvas"
								sub="Edit the pages as a static design"
								onClick={() => void run("canvas")}
								disabled={!!busy}
							/>
						)}
						<ActionRow
							icon={<Rocket className="size-4" />}
							title="Use in a post"
							sub="Schedule or publish to your channels"
							onClick={() => onCompose(item)}
						/>
						<a
							href={fileUrl(item.media[0]?.key || "")}
							download={item.name}
							className="flex w-full items-center gap-3 rounded-xl border border-[var(--mono-line)] bg-[var(--mono-panel)] px-4 py-3 text-left transition-colors hover:bg-[var(--mono-hover)]"
						>
							{isPdf ? <FileText className="size-4 shrink-0 text-[var(--mono-ink-2)]" /> : <Download className="size-4 shrink-0 text-[var(--mono-ink-2)]" />}
							<span className="text-[13px] font-semibold text-[var(--mono-ink)]">Download</span>
						</a>
					</div>

					<div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--mono-ink-3)]">
						{item.source && <span className="capitalize">{item.source}</span>}
						{fmtDur(item.durationSec) && <span>{fmtDur(item.durationSec)}</span>}
						{item.kind === "carousel" && <span>{item.media.length} pages</span>}
						<span>{new Date(item.createdAt).toLocaleDateString()}</span>
					</div>
				</div>
			</div>
		</div>
	);
}

function ActionRow({
	icon,
	title,
	sub,
	onClick,
	disabled,
}: {
	icon: React.ReactNode;
	title: string;
	sub: string;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="flex w-full items-center gap-3 rounded-xl border border-[var(--mono-line)] bg-[var(--mono-panel)] px-4 py-3 text-left transition-colors hover:bg-[var(--mono-hover)] disabled:opacity-60"
		>
			<span className="shrink-0 text-[var(--mono-ink-2)]">{icon}</span>
			<span className="min-w-0">
				<span className="block text-[13px] font-semibold text-[var(--mono-ink)]">{title}</span>
				<span className="block text-[12px] text-[var(--mono-ink-3)]">{sub}</span>
			</span>
		</button>
	);
}
