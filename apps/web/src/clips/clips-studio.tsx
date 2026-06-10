"use client";

// AI Clips — pick a long(er) library video, let Azure Speech + Azure OpenAI
// find the most clippable moments, then spin each suggestion into an editor
// project pre-trimmed to that range. The editor does the actual cutting.

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Clapperboard, Play, Scissors, Sparkles, Timer } from "lucide-react";
import { cn } from "@/utils/ui";
import { Button } from "@/components/ui/button";
import { fileUrl, type VaultItem } from "@/projects/vault-client";
import type { ClipSuggestion } from "@/app/api/clips/route";
import {
	decodeFileToAudioBuffer,
	toMono,
	audioBufferToWav,
} from "@/services/revoice/audio-utils";

// Mount the <video> only when the tile nears the viewport — 200 eager video
// tags is what made the picker crawl.
function LazyVideoThumb({ src }: { src: string }) {
	const ref = useRef<HTMLDivElement | null>(null);
	const [inView, setInView] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const io = new IntersectionObserver(
			(es) => es[0]?.isIntersecting && setInView(true),
			{ rootMargin: "400px" },
		);
		io.observe(el);
		return () => io.disconnect();
	}, []);
	return (
		<div ref={ref} className="absolute inset-0">
			{inView && (
				// biome-ignore lint/a11y/useMediaCaption: thumbnail
				<video
					src={`${src}#t=0.1`}
					preload="metadata"
					muted
					playsInline
					className="size-full object-cover"
				/>
			)}
		</div>
	);
}

const fmt = (s: number) => {
	const m = Math.floor(s / 60);
	const sec = Math.floor(s % 60);
	return `${m}:${String(sec).padStart(2, "0")}`;
};

export function ClipsStudio({
	items,
	onMakeProject,
}: {
	items: VaultItem[];
	onMakeProject: (
		item: VaultItem,
		clip: ClipSuggestion,
		opts: {
			segments: { text: string; start: number; end: number }[];
			captions: boolean;
			navigate: boolean;
		},
	) => Promise<void> | void;
}) {
	const videos = useMemo(
		() =>
			items.filter(
				(i) => i.kind === "video" && i.media?.some((m) => m.type === "video"),
			),
		[items],
	);
	const [picked, setPicked] = useState<VaultItem | null>(null);
	const [q, setQ] = useState("");
	const [busy, setBusy] = useState(false);
	const [clips, setClips] = useState<ClipSuggestion[] | null>(null);
	const [segments, setSegments] = useState<
		{ text: string; start: number; end: number }[]
	>([]);
	const [withCaptions, setWithCaptions] = useState(true);
	const [creating, setCreating] = useState<number | "all" | null>(null);
	const [shown, setShown] = useState(30);
	const moreRef = useRef<HTMLDivElement | null>(null);
	useEffect(() => {
		const el = moreRef.current;
		if (!el) return;
		const io = new IntersectionObserver(
			(es) => es[0]?.isIntersecting && setShown((c) => c + 30),
			{ rootMargin: "600px" },
		);
		io.observe(el);
		return () => io.disconnect();
	});
	const videoRef = useRef<HTMLVideoElement | null>(null);

	const filtered = useMemo(() => {
		const s = q.trim().toLowerCase();
		return s ? videos.filter((v) => v.name.toLowerCase().includes(s)) : videos;
	}, [videos, q]);

	const videoKey = picked?.media.find((m) => m.type === "video")?.key || "";

	const analyze = async () => {
		if (!picked || !videoKey || busy) return;
		setBusy(true);
		setClips(null);
		const tid = toast.loading("Extracting audio…", {
			description: "Usually 10-40 seconds depending on length.",
		});
		try {
			const videoBlob = await (await fetch(fileUrl(videoKey))).blob();
			const decoded = await decodeFileToAudioBuffer(videoBlob);
			const mono = await toMono(decoded, 16000);
			const wav = audioBufferToWav(mono);

			toast.loading("Transcribing…", { id: tid });
			const fd = new FormData();
			fd.append("audio", new File([wav], "audio.wav", { type: "audio/wav" }));
			const tr = await fetch("/api/transcribe", { method: "POST", body: fd });
			const tdata = (await tr.json().catch(() => ({}))) as {
				segments?: { text: string; start: number; end: number }[];
				error?: string;
			};
			if (!tr.ok) throw new Error(tdata.error || "Transcription failed");
			if (!tdata.segments?.length)
				throw new Error("No speech detected in this video");
			setSegments(tdata.segments);

			toast.loading("Scoring moments…", { id: tid });
			const r = await fetch("/api/clips", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ segments: tdata.segments }),
			});
			const d = (await r.json().catch(() => ({}))) as {
				clips?: ClipSuggestion[];
				error?: string;
			};
			if (!r.ok || !d.clips) throw new Error(d.error || "Analysis failed");
			setClips(d.clips);
			toast.success(`Found ${d.clips.length} clip candidates`, { id: tid });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Analysis failed", {
				id: tid,
			});
		} finally {
			setBusy(false);
		}
	};

	const preview = (c: ClipSuggestion) => {
		const v = videoRef.current;
		if (!v) return;
		v.currentTime = c.start;
		void v.play();
	};

	const scoreColor = (n: number) =>
		n >= 75 ? "text-green-400" : n >= 50 ? "text-amber-400" : "text-[var(--mono-ink-3)]";

	return (
		<div className="mx-auto max-w-5xl px-4 pt-16 pb-16 sm:px-8 lg:pt-10">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">AI Clips</h1>
					<p className="mt-1 text-sm text-[var(--mono-ink-3)]">
						Pick a video. The AI finds the moments worth posting.
					</p>
				</div>
				{picked && (
					<Button variant="ghost" onClick={() => { setPicked(null); setClips(null); }}>
						Change video
					</Button>
				)}
			</div>

			{!picked ? (
				<div className="mt-6">
					<input
						placeholder="Search your videos…"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						className="mb-4 w-full max-w-sm rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-3.5 py-2.5 text-sm text-[var(--mono-ink)] outline-none placeholder:text-[var(--mono-ink-3)] focus:border-[var(--mono-strong)]"
					/>
					{filtered.length === 0 ? (
						<div className="rounded-xl border border-dashed border-[var(--mono-line)] py-14 text-center text-sm text-[var(--mono-ink-3)]">
							No videos in your library yet. Import one from Home first.
						</div>
					) : (
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
							{filtered.slice(0, shown).map((v) => {
								const k = v.media.find((m) => m.type === "video")?.key || "";
								return (
									<button
										key={v.id}
										type="button"
										onClick={() => setPicked(v)}
										className="group text-left"
									>
										<div className="relative aspect-[9/16] overflow-hidden rounded-xl border border-[var(--mono-line)] bg-black/30 transition group-hover:border-[var(--mono-strong)]">
											{v.thumbUrl ? (
												// eslint-disable-next-line @next/next/no-img-element
												<img
													src={v.thumbUrl}
													alt=""
													className="size-full object-cover"
													loading="lazy"
												/>
											) : (
												<LazyVideoThumb src={fileUrl(k)} />
											)}
										</div>
										<div className="mt-1.5 truncate text-xs text-[var(--mono-ink-2)]">
											{v.name || "Untitled"}
										</div>
									</button>
								);
							})}
							{filtered.length > shown && (
								<div ref={moreRef} className="col-span-full h-2" />
							)}
						</div>
					)}
				</div>
			) : (
				<div className="mt-6 flex flex-col gap-6 lg:flex-row">
					{/* Source video */}
					<div className="w-full shrink-0 lg:w-80">
						<div className="overflow-hidden rounded-2xl border border-[var(--mono-line)] bg-black">
							{/* biome-ignore lint/a11y/useMediaCaption: source preview */}
							<video
								ref={videoRef}
								src={fileUrl(videoKey)}
								controls
								playsInline
								className="w-full"
							/>
						</div>
						<div className="mt-2 truncate text-sm text-[var(--mono-ink-2)]">
							{picked.name}
						</div>
						<Button
							className="mt-3 w-full gap-2"
							onClick={analyze}
							disabled={busy}
						>
							<Sparkles className="size-4" />
							{busy ? "Analyzing…" : clips ? "Re-analyze" : "Analyze video"}
						</Button>
					</div>

					{/* Suggestions */}
					<div className="min-w-0 flex-1">
						{!clips && !busy && (
							<div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-[var(--mono-line)] text-sm text-[var(--mono-ink-3)]">
								Hit "Find clips" and the suggestions land here.
							</div>
						)}
						{busy && (
							<div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--mono-line)] text-sm text-[var(--mono-ink-3)]">
								<Timer className="size-5 animate-pulse" />
								Listening to the video…
							</div>
						)}
						{clips && (
							<div className="space-y-3">
								<div className="flex flex-wrap items-center justify-between gap-2">
									<button
										type="button"
										onClick={() => setWithCaptions((v) => !v)}
										className={cn(
											"flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-colors",
											withCaptions
												? "border-[var(--mono-strong)] bg-[var(--mono-active)] text-[var(--mono-ink)]"
												: "border-[var(--mono-line)] text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)]",
										)}
									>
										<span
											className={cn(
												"size-1.5 rounded-full",
												withCaptions ? "bg-green-500" : "bg-[var(--mono-ink-3)]",
											)}
										/>
										Auto-captions {withCaptions ? "on" : "off"}
									</button>
									<Button
										size="sm"
										variant="outline"
										className="rounded-md"
										disabled={creating !== null}
										onClick={async () => {
											setCreating("all");
											try {
												for (const c of clips) {
													await onMakeProject(picked, c, {
														segments,
														captions: withCaptions,
														navigate: false,
													});
												}
												toast.success(
													`${clips.length} clip projects created — find them under Projects`,
												);
											} finally {
												setCreating(null);
											}
										}}
									>
										{creating === "all"
											? "Creating…"
											: `Create all ${clips.length} projects`}
									</Button>
								</div>
								{clips.map((c, i) => (
									<div
										key={`${c.start}-${c.end}`}
										className="rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-hover)] p-4"
									>
										<div className="flex items-center gap-3">
											<span
												className={cn(
													"text-lg font-bold tabular-nums",
													scoreColor(c.score),
												)}
											>
												{c.score}
											</span>
											<div className="min-w-0 flex-1">
												<div className="truncate text-[15px] font-semibold text-[var(--mono-ink)]">
													{c.title}
												</div>
												<div className="text-xs text-[var(--mono-ink-3)] tabular-nums">
													{fmt(c.start)} – {fmt(c.end)} ·{" "}
													{Math.round(c.end - c.start)}s
												</div>
											</div>
											<button
												type="button"
												onClick={() => preview(c)}
												title="Preview from here"
												className="flex size-9 items-center justify-center rounded-full border border-[var(--mono-line)] text-[var(--mono-ink-2)] transition-colors hover:bg-[var(--mono-active)] hover:text-[var(--mono-ink)]"
											>
												<Play className="size-4" />
											</button>
										</div>
										{c.hook && (
											<div className="mt-2 line-clamp-2 text-sm text-[var(--mono-ink-2)]">
												"{c.hook}"
											</div>
										)}
										{c.reason && (
											<div className="mt-1 text-xs text-[var(--mono-ink-3)]">
												{c.reason}
											</div>
										)}
										<div className="mt-3 flex items-center gap-2">
											<Button
												size="sm"
												className="gap-1.5"
												disabled={creating !== null}
												onClick={async () => {
													setCreating(i);
													try {
														await onMakeProject(picked, c, {
															segments,
															captions: withCaptions,
															navigate: true,
														});
													} finally {
														setCreating(null);
													}
												}}
											>
												<Scissors className="size-3.5" />
												{creating === i ? "Cutting…" : "Edit this clip"}
											</Button>
											<span className="flex items-center gap-1 text-[11px] text-[var(--mono-ink-3)]">
												<Clapperboard className="size-3" />
												Opens a project trimmed to this range
											</span>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
