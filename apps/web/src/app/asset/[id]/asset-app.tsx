"use client";

// Per-asset page — a real route, not a modal. Big player, editable title +
// caption, and the ability to push the asset into the editor or a post.
// Opening on its own route unmounts the library grid, so the player is the
// only <video> on the page and never stutters.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	Clapperboard,
	Download,
	FileText,
	Loader2,
	Rocket,
} from "lucide-react";
import { cn } from "@/utils/ui";
import { Button } from "@/components/ui/button";
import { useEditor } from "@/editor/use-editor";
import { processMediaAssets } from "@/media/processing";
import { useSession } from "@/auth/client";
import { getVaultOwner } from "@/projects/vault-owner";
import { fetchVaultItem, fileUrl, type VaultItem } from "@/projects/vault-client";

function fmtDur(sec?: number): string {
	if (!sec || !Number.isFinite(sec)) return "";
	const m = Math.floor(sec / 60);
	const s = Math.floor(sec % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AssetApp({ id }: { id: string }) {
	const router = useRouter();
	const editor = useEditor();
	const { data: session } = useSession();
	const [item, setItem] = useState<VaultItem | null>(null);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);

	const [title, setTitle] = useState("");
	const [caption, setCaption] = useState("");
	const [saving, setSaving] = useState(false);
	const [pushing, setPushing] = useState(false);
	const [page, setPage] = useState(0);

	const owner = session?.user?.id || getVaultOwner();

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		fetchVaultItem(id)
			.then((it) => {
				if (cancelled) return;
				if (!it) {
					setNotFound(true);
				} else {
					setItem(it);
					setTitle(it.name || "");
					setCaption(it.caption || "");
				}
			})
			.catch(() => !cancelled && setNotFound(true))
			.finally(() => !cancelled && setLoading(false));
		return () => {
			cancelled = true;
		};
	}, [id]);

	const dirty =
		!!item && (title.trim() !== item.name || caption !== (item.caption ?? ""));

	const save = async () => {
		if (!item || saving || !dirty) return;
		setSaving(true);
		try {
			const r = await fetch("/api/vault", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					owner,
					id: item.id,
					name: title.trim() || item.name,
					caption,
				}),
			});
			if (!r.ok) throw new Error("Save failed");
			setItem({
				...item,
				name: title.trim() || item.name,
				caption: caption.trim() ? caption : undefined,
			});
			toast.success("Saved");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Save failed");
		} finally {
			setSaving(false);
		}
	};

	const openInEditor = async () => {
		if (!item || pushing) return;
		setPushing(true);
		const tid = toast.loading("Adding to a new project…");
		try {
			const name = (title.trim() || item.name || "Asset").slice(0, 60);
			const projectId = await editor.project.createNewProject({ name });
			for (const m of item.media) {
				if (m.type === "pdf") continue;
				const blob = await (await fetch(fileUrl(m.key))).blob();
				const ext =
					m.ext ||
					(m.type === "video" ? "mp4" : m.type === "audio" ? "mp3" : "jpg");
				const file = new File([blob], `${name}.${ext}`, {
					type: m.contentType || blob.type,
				});
				const [processed] = await processMediaAssets({ files: [file] });
				if (processed) {
					await editor.media.addMediaAsset({ projectId, asset: processed });
				}
			}
			toast.success("Opening editor…", { id: tid });
			router.push(`/editor/${projectId}`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't open in editor", {
				id: tid,
			});
			setPushing(false);
		}
	};

	if (loading) {
		return (
			<div className="flex h-screen items-center justify-center bg-[var(--mono-app)]">
				<Loader2 className="size-6 animate-spin text-[var(--mono-ink-3)]" />
			</div>
		);
	}
	if (notFound || !item) {
		return (
			<div className="flex h-screen flex-col items-center justify-center gap-3 bg-[var(--mono-app)] text-[var(--mono-ink)]">
				<div className="text-sm text-[var(--mono-ink-3)]">
					This asset couldn't be found.
				</div>
				<Button onClick={() => router.push("/projects")}>Back to library</Button>
			</div>
		);
	}

	const isPdf = item.kind === "pdf";
	const images = item.media.filter((m) => m.type === "image");
	const cur = item.media[Math.min(page, item.media.length - 1)];

	return (
		<div className="min-h-screen bg-[var(--mono-app)] text-[var(--mono-ink)]">
			<div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--mono-line)] bg-[var(--mono-app)]/90 px-4 py-3 backdrop-blur sm:px-6">
				<button
					type="button"
					onClick={() => router.push("/projects")}
					className="flex items-center gap-1.5 text-[13px] text-[var(--mono-ink-2)] transition-colors hover:text-[var(--mono-ink)]"
				>
					<ArrowLeft className="size-4" /> Library
				</button>
				<span className="rounded-md bg-[var(--mono-active)] px-2 py-0.5 text-[11px] font-medium text-[var(--mono-ink-2)] capitalize">
					{item.kind}
				</span>
			</div>

			<div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_22rem] lg:py-10">
				{/* Media */}
				<div className="flex min-w-0 flex-col">
					<div className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-[var(--mono-line)] bg-black">
						{item.kind === "video" ? (
							// biome-ignore lint/a11y/useMediaCaption: user media
							<video
								key={item.id}
								src={fileUrl(item.media[0]?.key || "")}
								controls
								autoPlay
								playsInline
								className="max-h-[72vh] w-full object-contain"
							/>
						) : isPdf ? (
							<iframe
								title={item.name}
								src={fileUrl(item.media[0]?.key || "")}
								className="h-[72vh] w-full bg-white"
							/>
						) : (
							<>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={fileUrl(cur?.key || "")}
									alt={item.name}
									className="max-h-[72vh] w-full object-contain"
								/>
								{item.media.length > 1 && (
									<>
										<button
											type="button"
											onClick={() =>
												setPage(
													(page - 1 + item.media.length) % item.media.length,
												)
											}
											aria-label="Previous"
											className="absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
										>
											<ChevronLeft className="size-5" />
										</button>
										<button
											type="button"
											onClick={() => setPage((page + 1) % item.media.length)}
											aria-label="Next"
											className="absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
										>
											<ChevronRight className="size-5" />
										</button>
										<div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-2.5 py-0.5 text-xs text-white">
											{Math.min(page, item.media.length - 1) + 1} /{" "}
											{item.media.length}
										</div>
									</>
								)}
							</>
						)}
					</div>

					{/* Carousel thumbnails */}
					{images.length > 1 && (
						<div className="mt-3 flex gap-2 overflow-x-auto pb-1">
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
									<img
										src={fileUrl(m.key)}
										alt=""
										className="size-full object-cover"
									/>
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
							<button
								type="button"
								onClick={openInEditor}
								disabled={pushing}
								className="flex w-full items-center gap-3 rounded-xl border border-[var(--mono-line)] bg-[var(--mono-panel)] px-4 py-3 text-left transition-colors hover:bg-[var(--mono-hover)] disabled:opacity-60"
							>
								{pushing ? (
									<Loader2 className="size-4 shrink-0 animate-spin" />
								) : (
									<Clapperboard className="size-4 shrink-0 text-[var(--mono-ink-2)]" />
								)}
								<span className="min-w-0">
									<span className="block text-[13px] font-semibold text-[var(--mono-ink)]">
										Open in editor
									</span>
									<span className="block text-[12px] text-[var(--mono-ink-3)]">
										New project with this {item.kind} ready to edit
									</span>
								</span>
							</button>
						)}
						<button
							type="button"
							onClick={() => router.push(`/projects?compose=${item.id}`)}
							className="flex w-full items-center gap-3 rounded-xl border border-[var(--mono-line)] bg-[var(--mono-panel)] px-4 py-3 text-left transition-colors hover:bg-[var(--mono-hover)]"
						>
							<Rocket className="size-4 shrink-0 text-[var(--mono-ink-2)]" />
							<span className="min-w-0">
								<span className="block text-[13px] font-semibold text-[var(--mono-ink)]">
									Use in a post
								</span>
								<span className="block text-[12px] text-[var(--mono-ink-3)]">
									Schedule or publish to your channels
								</span>
							</span>
						</button>
						<a
							href={fileUrl(item.media[0]?.key || "")}
							download={item.name}
							className="flex w-full items-center gap-3 rounded-xl border border-[var(--mono-line)] bg-[var(--mono-panel)] px-4 py-3 text-left transition-colors hover:bg-[var(--mono-hover)]"
						>
							{isPdf ? (
								<FileText className="size-4 shrink-0 text-[var(--mono-ink-2)]" />
							) : (
								<Download className="size-4 shrink-0 text-[var(--mono-ink-2)]" />
							)}
							<span className="text-[13px] font-semibold text-[var(--mono-ink)]">
								Download
							</span>
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
