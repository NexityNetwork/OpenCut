"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	ArrowUp,
	Check,
	ChevronDown,
	Clapperboard,
	Film,
	ImageIcon,
	Loader2,
	MoreHorizontal,
	Paperclip,
	Upload,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ParticleTextEffect } from "@/components/home/particle-text";
import { fetchVault, fileUrl, type VaultItem } from "@/projects/vault-client";
import { VideoThumb } from "@/projects/video-thumb";
import { useTheme } from "next-themes";
import {
	FORMATS,
	STUDIO_MODELS,
	THEMES,
	THEME_LABELS,
	type Scene,
	type Spec,
} from "@/hyperframes/builder";
import { FPS_PRESETS } from "@/fps/presets";
import { cn } from "@/utils/ui";

// Aspect ratios ported 1:1 from the editor canvas presets (DEFAULT_CANVAS_PRESETS).
const FORMAT_LABELS: Record<string, string> = {
	"9:16": "Portrait",
	"16:9": "Landscape",
	"1:1": "Square",
	"4:3": "Classic",
};
const FORMAT_KEYS = Object.keys(FORMATS);

// same chip style the Home composer uses, for design consistency
const CHIP =
	"flex items-center gap-1.5 rounded-lg border border-[var(--mono-line)] bg-[var(--mono-hover)] px-2.5 py-1.5 text-xs text-[var(--mono-ink-2)] transition-colors hover:bg-[var(--mono-active)] hover:text-[var(--mono-ink)]";
// settings select-style trigger (DropdownMenu so the popover matches the rest)
const SELECT_TRIGGER =
	"flex h-9 w-40 items-center justify-between rounded-lg border border-[var(--mono-line)] bg-[var(--mono-hover)] px-3 text-sm text-[var(--mono-ink)] transition-colors hover:bg-[var(--mono-active)]";

// fake-but-plausible progress so a render does not just sit on one label
const STAGES = [
	"Reading your brief",
	"Writing the script",
	"Laying out the scenes",
	"Rendering the frames",
	"Encoding the video",
	"Almost done",
];
function stageFor(createdAt?: number): string {
	if (!createdAt) return STAGES[0];
	const elapsed = (Date.now() - createdAt) / 1000;
	return STAGES[Math.min(Math.floor(elapsed / 16), STAGES.length - 1)];
}

type StudioRef = {
	id: string;
	kind: "image" | "video";
	ext: string;
	name: string;
	key: string;
	url: string;
	status: "uploading" | "ready";
	// videos: rebuild the look, drop the clip in, or recolor for reposting
	mode: "clip" | "recreate" | "recolor";
	file?: File; // kept in memory for client-side frame extraction
	frames?: string[]; // cached sampled frames (data URLs)
};
type RenderJob = {
	id: string;
	name: string;
	format: string;
	status: "rendering" | "done" | "failed";
	createdAt?: number;
	url?: string | null;
	vaultId?: string | null;
	spec?: Spec | null;
	theme?: string | null;
	fps?: number | null;
};
type Settings = {
	theme: string;
	format: string;
	fps: number;
	model: string;
	instructions: string;
	designNotes: string;
	confirmBeforeGenerate: boolean;
};
const DEFAULTS: Settings = {
	theme: "ultron",
	format: "9:16",
	fps: 30,
	model: "gpt-5.4",
	instructions: "",
	designNotes: "",
	confirmBeforeGenerate: true,
};

function deriveName(prompt: string): string {
	const words = prompt.trim().split(/\s+/).slice(0, 7).join(" ");
	const n = words.replace(/[^\w\s-]/g, "").trim();
	return n ? n.charAt(0).toUpperCase() + n.slice(1) : "Studio render";
}

function sceneSummary(s: Scene): { tag: string; text: string } {
	switch (s.type) {
		case "hook":
			return { tag: "Hook", text: s.title };
		case "cards":
			return { tag: "List", text: (s.items ?? []).map((i) => i.title).join(", ") };
		case "stat":
			return { tag: "Stat", text: `${s.value} ${s.label}` };
		case "quote":
			return { tag: "Quote", text: s.quote };
		case "image":
			return { tag: "Screenshot", text: s.title ?? s.caption ?? "Reference image" };
		case "videoBg":
			return { tag: "Video", text: s.title ?? "Reference video" };
		case "cta":
			return { tag: "CTA", text: s.title };
		default:
			return { tag: "Scene", text: "" };
	}
}

// sample evenly spaced frames from a video File for vision recreation
async function extractFrames(file: File, count = 6): Promise<string[]> {
	return new Promise((resolve) => {
		try {
			const url = URL.createObjectURL(file);
			const video = document.createElement("video");
			video.muted = true;
			video.src = url;
			const frames: string[] = [];
			let done = false;
			const finish = () => {
				if (done) return;
				done = true;
				URL.revokeObjectURL(url);
				resolve(frames);
			};
			video.addEventListener("error", finish);
			video.addEventListener("loadeddata", async () => {
				const dur = video.duration && isFinite(video.duration) ? video.duration : 1;
				const canvas = document.createElement("canvas");
				const W = 512;
				const ratio = video.videoHeight / (video.videoWidth || 1) || 1.777;
				canvas.width = W;
				canvas.height = Math.round(W * ratio);
				const ctx = canvas.getContext("2d");
				for (let i = 0; i < count; i++) {
					const t = (dur * (i + 0.5)) / count;
					await new Promise<void>((res) => {
						const onSeek = () => {
							video.removeEventListener("seeked", onSeek);
							try {
								ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
								frames.push(canvas.toDataURL("image/jpeg", 0.7));
							} catch {
								/* ignore a bad frame */
							}
							res();
						};
						video.addEventListener("seeked", onSeek);
						video.currentTime = Math.min(t, Math.max(0, dur - 0.05));
					});
				}
				finish();
			});
		} catch {
			resolve([]);
		}
	});
}

// a tiny mockup of a theme: its background, an accent bar and an ink bar, so the
// picker shows what the visual style actually looks like.
function ThemeSwatch({ id }: { id: string }) {
	const t = THEMES[id];
	if (!t) return null;
	return (
		<div
			className="flex h-7 w-10 shrink-0 flex-col justify-center gap-1 rounded-md border border-[var(--mono-line)] px-1.5"
			style={{ background: t.bg }}
		>
			<div className="h-1 w-4 rounded-full" style={{ background: t.accent }} />
			<div
				className="h-1 w-6 rounded-full"
				style={{ background: t.ink, opacity: 0.55 }}
			/>
		</div>
	);
}

export function StudioPane({
	owner,
	onRenderAction,
}: {
	owner: string;
	isOwner: boolean;
	onRenderAction?: (action: string, vaultId: string) => void;
}) {
	const { resolvedTheme } = useTheme();
	const [prompt, setPrompt] = useState("");
	const [refs, setRefs] = useState<StudioRef[]>([]);
	const [theme, setTheme] = useState(DEFAULTS.theme);
	const [format, setFormat] = useState(DEFAULTS.format);
	const [fps, setFps] = useState(DEFAULTS.fps);
	const [model, setModel] = useState(DEFAULTS.model);
	const [instructions, setInstructions] = useState("");
	const [designNotes, setDesignNotes] = useState("");
	const [confirmBeforeGenerate, setConfirm] = useState(true);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [savingSettings, setSavingSettings] = useState(false);
	const [busy, setBusy] = useState(false);
	const [enhancing, setEnhancing] = useState(false);
	const [plan, setPlan] = useState<Spec | null>(null);
	const [renders, setRenders] = useState<RenderJob[]>([]);
	const [preview, setPreview] = useState<string | null>(null);
	const [refineId, setRefineId] = useState<string | null>(null);
	const [refineText, setRefineText] = useState("");
	const [refineBusy, setRefineBusy] = useState(false);
	const [, setTick] = useState(0); // drives the staged-status label
	const [refModal, setRefModal] = useState<"closed" | "choose" | "library">(
		"closed",
	);
	const [libVideos, setLibVideos] = useState<VaultItem[]>([]);
	const [libLoading, setLibLoading] = useState(false);
	const [libSearch, setLibSearch] = useState("");
	const fileRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch("/api/hyperframes/settings");
				const data = await res.json();
				if (cancelled || !data?.settings) return;
				const s = { ...DEFAULTS, ...data.settings } as Settings;
				setTheme(s.theme);
				setFormat(s.format);
				setFps(s.fps);
				setModel(s.model);
				setInstructions(s.instructions);
				setDesignNotes(s.designNotes);
				setConfirm(s.confirmBeforeGenerate);
			} catch {
				/* keep defaults */
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const refreshRenders = useCallback(async () => {
		try {
			const res = await fetch("/api/hyperframes/renders");
			const data = await res.json();
			if (Array.isArray(data.renders)) setRenders(data.renders as RenderJob[]);
		} catch {
			/* transient */
		}
	}, []);

	useEffect(() => {
		void refreshRenders();
	}, [refreshRenders]);

	const hasPending = renders.some((r) => r.status === "rendering");
	useEffect(() => {
		if (!hasPending) return;
		const id = setInterval(() => {
			setTick((t) => t + 1); // advance the staged label between polls
			void refreshRenders();
		}, 5000);
		return () => clearInterval(id);
	}, [hasPending, refreshRenders]);

	const onAddFiles = useCallback(async (files: FileList | null) => {
		if (!files?.length) return;
		for (const file of Array.from(files)) {
			const id = `r${crypto.randomUUID().slice(0, 8)}`;
			const ext = (file.name.split(".").pop() || "bin").toLowerCase();
			const kind: "image" | "video" = file.type.startsWith("video")
				? "video"
				: "image";
			setRefs((prev) => [
				...prev,
				{
					id,
					kind,
					ext,
					name: file.name,
					key: "",
					url: "",
					status: "uploading",
					mode: kind === "video" ? "recreate" : "clip",
					file,
				},
			]);
			try {
				const res = await fetch(
					`/api/import-from-url/upload?ext=${encodeURIComponent(ext)}`,
					{
						method: "POST",
						headers: { "content-type": file.type || "application/octet-stream" },
						body: file,
					},
				);
				const data = await res.json();
				if (!res.ok) throw new Error(data.error || "upload failed");
				setRefs((prev) =>
					prev.map((r) =>
						r.id === id
							? {
									...r,
									status: "ready",
									key: data.key,
									url: `/api/import-from-url/file?key=${encodeURIComponent(data.key)}`,
								}
							: r,
					),
				);
			} catch {
				setRefs((prev) => prev.filter((r) => r.id !== id));
				toast.error(`Upload failed: ${file.name}`);
			}
		}
	}, []);

	// open the "add from library" view and load the owner's videos
	const openLibrary = useCallback(async () => {
		setRefModal("library");
		setLibLoading(true);
		try {
			const items = await fetchVault(owner);
			setLibVideos(
				items.filter(
					(i) => i.kind === "video" && i.media.some((m) => m.type === "video"),
				),
			);
		} catch {
			toast.error("Could not load your library");
		} finally {
			setLibLoading(false);
		}
	}, [owner]);

	// add a library video as a reference (defaults to remix, the repost lane)
	const addLibraryVideo = useCallback((it: VaultItem) => {
		const m = it.media.find((x) => x.type === "video");
		if (!m) return;
		const id = `r${crypto.randomUUID().slice(0, 8)}`;
		setRefs((prev) => [
			...prev,
			{
				id,
				kind: "video",
				ext: m.ext || "mp4",
				name: it.name,
				key: m.key,
				url: fileUrl(m.key),
				status: "ready",
				mode: "recolor", // the "Remix" path
			},
		]);
		setRefModal("closed");
	}, []);

	// builder refs = clip videos + images (recreate/recolor videos are not dropped in)
	const builderRefs = useCallback(
		() =>
			refs
				.filter(
					(r) => r.status === "ready" && !(r.kind === "video" && r.mode !== "clip"),
				)
				.map((r) => ({ id: r.id, kind: r.kind, key: r.key, ext: r.ext })),
		[refs],
	);

	// gather frames for any video set to "recreate"
	const recreateFrames = useCallback(async (): Promise<string[]> => {
		const out: string[] = [];
		for (const r of refs) {
			if (r.kind !== "video" || r.mode !== "recreate") continue;
			let frames = r.frames;
			if (!frames) {
				// library videos have no File in memory; fetch the bytes first
				let file = r.file;
				if (!file && r.url) {
					try {
						const blob = await (await fetch(r.url)).blob();
						file = new File([blob], `${r.id}.${r.ext}`, { type: blob.type });
					} catch {
						/* ignore */
					}
				}
				if (file) {
					frames = await extractFrames(file, 14);
					setRefs((prev) =>
						prev.map((x) => (x.id === r.id ? { ...x, frames } : x)),
					);
				}
			}
			if (frames) out.push(...frames);
		}
		return out.slice(0, 8);
	}, [refs]);

	const startRender = useCallback(
		async (spec?: Spec) => {
			setBusy(true);
			try {
				const name = deriveName(prompt);
				const res = await fetch("/api/hyperframes/compose", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						prompt,
						instructions,
						designNotes,
						theme,
						format,
						fps,
						model,
						refs: builderRefs(),
						...(spec ? { spec } : {}),
						render: true,
						name,
					}),
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error || "render failed");
				setPlan(null);
				toast.success("Rendering started, it will land in your Library");
				await refreshRenders();
			} catch (e) {
				toast.error((e as Error).message);
			} finally {
				setBusy(false);
			}
		},
		[prompt, instructions, designNotes, theme, format, fps, model, builderRefs, refreshRenders],
	);

	const onGenerate = useCallback(async () => {
		if (refs.some((r) => r.status === "uploading")) {
			toast.error("Hold on, references are still uploading");
			return;
		}
		// recolor path: make repost variants of the user's own clip(s), no prompt
		const recolorRefs = refs.filter(
			(r) => r.status === "ready" && r.kind === "video" && r.mode === "recolor",
		);
		if (recolorRefs.length) {
			setBusy(true);
			try {
				let n = 0;
				for (const r of recolorRefs) {
					const res = await fetch("/api/hyperframes/recolor", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ key: r.key, name: r.name.replace(/\.[^.]+$/, "") }),
					});
					const data = await res.json();
					if (res.ok) n += data.count ?? 0;
					else throw new Error(data.error || "recolor failed");
				}
				toast.success(`Started ${n} repost variants, they will land in your Library`);
				await refreshRenders();
			} catch (e) {
				toast.error((e as Error).message);
			} finally {
				setBusy(false);
			}
			return;
		}
		const hasRecreate = refs.some(
			(r) => r.status === "ready" && r.kind === "video" && r.mode === "recreate",
		);
		if (!prompt.trim() && !hasRecreate) {
			toast.error("Describe the video, or drop a clip to recreate");
			return;
		}
		setBusy(true);
		try {
			const frames = await recreateFrames();
			const res = await fetch("/api/hyperframes/compose", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					prompt,
					instructions,
					designNotes,
					theme,
					format,
					fps,
					model,
					refs: builderRefs(),
					recreateFrames: frames,
					...(confirmBeforeGenerate ? {} : { render: true, name: deriveName(prompt) }),
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "compose failed");
			if (confirmBeforeGenerate) {
				setPlan(data.spec as Spec);
			} else {
				toast.success("Rendering started, it will land in your Library");
				await refreshRenders();
			}
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setBusy(false);
		}
	}, [
		prompt,
		instructions,
		designNotes,
		theme,
		format,
		fps,
		model,
		refs,
		confirmBeforeGenerate,
		builderRefs,
		recreateFrames,
		refreshRenders,
	]);

	const enhancePrompt = useCallback(async () => {
		if (!prompt.trim()) {
			toast.error("Write a rough idea first");
			return;
		}
		setEnhancing(true);
		try {
			const res = await fetch("/api/hyperframes/enhance", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ prompt, instructions, designNotes, model }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "enhance failed");
			setPrompt(data.enhanced);
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setEnhancing(false);
		}
	}, [prompt, instructions, designNotes, model]);

	const saveSettings = useCallback(async () => {
		setSavingSettings(true);
		try {
			const res = await fetch("/api/hyperframes/settings", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					theme,
					format,
					fps,
					model,
					instructions,
					designNotes,
					confirmBeforeGenerate,
				}),
			});
			if (!res.ok) throw new Error("save failed");
			toast.success("Saved as your defaults");
		} catch (e) {
			toast.error((e as Error).message);
		} finally {
			setSavingSettings(false);
		}
	}, [theme, format, fps, model, instructions, designNotes, confirmBeforeGenerate]);

	// iteration loop: apply one described change to a render's spec, keep the rest
	const submitRefine = useCallback(
		async (r: RenderJob) => {
			if (!refineText.trim() || !r.spec) return;
			setRefineBusy(true);
			try {
				const res = await fetch("/api/hyperframes/compose", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						spec: r.spec,
						change: refineText.trim(),
						theme: r.theme ?? theme,
						format: r.format,
						fps: r.fps ?? fps,
						model,
						render: true,
						name: r.name,
					}),
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error || "refine failed");
				toast.success("Applying your change, the new version will land in your Library");
				setRefineId(null);
				setRefineText("");
				await refreshRenders();
			} catch (e) {
				toast.error((e as Error).message);
			} finally {
				setRefineBusy(false);
			}
		},
		[refineText, theme, fps, model, refreshRenders],
	);

	return (
		<div className="flex flex-col items-center px-4 pb-28 pt-16 sm:px-6 sm:pt-24">
			<ParticleTextEffect
				key={resolvedTheme}
				text="Turn a reference into a reel"
				colors={
					resolvedTheme === "light"
						? ["3c3326", "6b5234", "a8632e", "c98a4e", "55503f"]
						: undefined
				}
				className="mb-3 h-20 w-full max-w-3xl sm:h-24"
			/>
			<p className="mb-6 max-w-xl text-center text-sm text-[var(--mono-ink-2)]">
				Describe a video, attach screenshots, or drop a clip to recreate. It renders
				on brand straight into your Library.
			</p>
			<div className="w-full max-w-2xl">
				{/* composer (Home composer styling) */}
				<div className="bg-card focus-within:border-foreground/30 rounded-[1.75rem] border border-border px-4 py-3 shadow-sm transition-colors">
					{refs.length > 0 && (
						<div className="mb-2 flex flex-wrap gap-2">
							{refs.map((r) => (
								<div key={r.id} className="flex flex-col gap-1">
									<div
										className="group relative size-14 overflow-hidden rounded-xl border border-[var(--mono-line)] bg-[var(--mono-hover)]"
										title={r.name}
									>
										{r.status === "uploading" ? (
											<div className="flex size-full items-center justify-center">
												<Loader2 className="size-4 animate-spin text-[var(--mono-ink-2)]" />
											</div>
										) : r.kind === "video" ? (
											<video src={r.url} muted className="size-full object-cover" />
										) : (
											// eslint-disable-next-line @next/next/no-img-element
											<img src={r.url} alt={r.name} className="size-full object-cover" />
										)}
										<span className="absolute bottom-0 left-0 flex items-center rounded-tr bg-black/60 px-1 py-0.5 text-white">
											{r.kind === "video" ? (
												<Film className="size-2.5" />
											) : (
												<ImageIcon className="size-2.5" />
											)}
										</span>
										<button
											type="button"
											onClick={() => setRefs((p) => p.filter((x) => x.id !== r.id))}
											className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
											aria-label="Remove"
										>
											<X className="size-3" />
										</button>
									</div>
									{r.kind === "video" && (
										<button
											type="button"
											onClick={() =>
												setRefs((p) =>
													p.map((x) =>
														x.id === r.id
															? {
																	...x,
																	mode:
																		x.mode === "recreate"
																			? "clip"
																			: x.mode === "clip"
																				? "recolor"
																				: "recreate",
																}
															: x,
													),
												)
											}
											className="rounded-md px-1 py-0.5 text-[10px] font-medium text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
											title="Remix makes repost-safe variants (new color + new voice) of this exact video; Use clip drops the footage in; Recreate rebuilds the look"
										>
											{r.mode === "recreate"
												? "Recreate"
												: r.mode === "clip"
													? "Use clip"
													: "Remix"}
										</button>
									)}
								</div>
							))}
						</div>
					)}

					<div className="flex items-end gap-2">
						<Textarea
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
									e.preventDefault();
									void onGenerate();
								}
							}}
							placeholder="Describe the video you want, or drop a rough idea and hit Enhance."
							className="max-h-[260px] min-h-[64px] flex-1 resize-none border-0 bg-transparent px-1 py-1 text-base text-[var(--mono-ink)] shadow-none focus-visible:ring-0 dark:bg-transparent"
						/>
						<button
							type="button"
							onClick={onGenerate}
							disabled={busy}
							className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full transition hover:opacity-90 disabled:opacity-40"
							aria-label="Generate"
							title="Generate (Cmd/Ctrl + Enter)"
						>
							{busy ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<ArrowUp className="size-4" />
							)}
						</button>
					</div>
				</div>

				{/* action chips (below the box, like Home) */}
				<div className="mt-3 flex flex-wrap items-center gap-1.5">
					<input
						ref={fileRef}
						type="file"
						accept="image/*,video/*"
						multiple
						className="hidden"
						onChange={(e) => {
							void onAddFiles(e.target.files);
							e.target.value = "";
						}}
					/>
					<button
						type="button"
						onClick={() => setRefModal("choose")}
						className={CHIP}
					>
						<Paperclip className="size-3.5" />
						Reference
						<ChevronDown className="size-3.5" />
					</button>
					<button
						type="button"
						onClick={enhancePrompt}
						disabled={enhancing}
						className={cn(CHIP, "disabled:opacity-50")}
					>
						{enhancing && <Loader2 className="size-3.5 animate-spin" />}
						Enhance
					</button>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button type="button" className={CHIP} title="Visual style of the video">
								<span
									className="size-2.5 rounded-full"
									style={{ background: THEMES[theme]?.accent ?? "#888" }}
								/>
								{THEME_LABELS[theme] ?? theme}
								<ChevronDown className="size-3.5" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-52">
							<DropdownMenuLabel>Visual style</DropdownMenuLabel>
							{Object.keys(THEMES).map((k) => (
								<DropdownMenuItem key={k} onClick={() => setTheme(k)} className="gap-2.5">
									<ThemeSwatch id={k} />
									<span className="flex-1">{THEME_LABELS[k] ?? k}</span>
									{theme === k && <Check className="size-3.5" />}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button type="button" className={CHIP}>
								{FORMAT_LABELS[format] ?? format} {format}
								<ChevronDown className="size-3.5" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-44">
							<DropdownMenuLabel>Aspect ratio</DropdownMenuLabel>
							{FORMAT_KEYS.map((k) => (
								<DropdownMenuItem key={k} onClick={() => setFormat(k)}>
									<span className="flex-1">
										{FORMAT_LABELS[k] ?? k} {k}
									</span>
									{format === k && <Check className="size-3.5" />}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					<button
						type="button"
						onClick={() => setSettingsOpen((v) => !v)}
						className={cn(CHIP, settingsOpen && "bg-[var(--mono-active)] text-[var(--mono-ink)]")}
					>
						Settings
					</button>
				</div>

				{/* settings */}
				{settingsOpen && (
					<div className="mt-3 space-y-4 rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-4 shadow-sm">
						<div className="flex items-center justify-between gap-3">
							<label className="text-sm font-medium text-[var(--mono-ink)]">Model</label>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button type="button" className={SELECT_TRIGGER}>
										{STUDIO_MODELS.find((m) => m.value === model)?.label ?? "Best"}
										<ChevronDown className="size-3.5 opacity-70" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-40">
									{STUDIO_MODELS.map((m) => (
										<DropdownMenuItem key={m.value} onClick={() => setModel(m.value)}>
											<span className="flex-1">{m.label}</span>
											{model === m.value && <Check className="size-3.5" />}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
						<div className="flex items-center justify-between gap-3">
							<label className="text-sm font-medium text-[var(--mono-ink)]">
								Frame rate
							</label>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button type="button" className={SELECT_TRIGGER}>
										{fps} fps
										<ChevronDown className="size-3.5 opacity-70" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-40">
									{FPS_PRESETS.map((f) => (
										<DropdownMenuItem
											key={f.value}
											onClick={() => setFps(Number(f.value))}
										>
											<span className="flex-1">{f.label}</span>
											{String(fps) === f.value && <Check className="size-3.5" />}
										</DropdownMenuItem>
									))}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
						<div>
							<label className="text-sm font-medium text-[var(--mono-ink)]">
								Agent instructions
							</label>
							<p className="mb-1.5 text-xs text-[var(--mono-ink-2)]">
								Persistent guidance for every generation (voice, do's and don'ts,
								recurring CTAs).
							</p>
							<Textarea
								value={instructions}
								onChange={(e) => setInstructions(e.target.value)}
								placeholder="e.g. Always speak in first person. No hashtags. End with Comment BUILD."
								className="min-h-[80px] resize-none text-sm"
							/>
						</div>
						<div>
							<label className="text-sm font-medium text-[var(--mono-ink)]">
								Design notes (design.md)
							</label>
							<p className="mb-1.5 text-xs text-[var(--mono-ink-2)]">
								Brand voice and copy direction. The theme above owns colors and layout.
							</p>
							<Textarea
								value={designNotes}
								onChange={(e) => setDesignNotes(e.target.value)}
								placeholder="e.g. Tone: bold, technical, no fluff. Audience: founders."
								className="min-h-[80px] resize-none text-sm"
							/>
						</div>
						<div className="flex items-center justify-between">
							<div>
								<label className="text-sm font-medium text-[var(--mono-ink)]">
									Confirm before generating
								</label>
								<p className="text-xs text-[var(--mono-ink-2)]">
									Review the scene plan before spending a render.
								</p>
							</div>
							<Switch checked={confirmBeforeGenerate} onCheckedChange={setConfirm} />
						</div>
						<div className="flex justify-end">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={saveSettings}
								disabled={savingSettings}
							>
								{savingSettings && <Loader2 className="size-4 animate-spin" />}
								Save as defaults
							</Button>
						</div>
					</div>
				)}

				{/* inline plan review (no popup) */}
				{plan && (
					<div className="mt-4 rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-4 shadow-sm">
						<div className="mb-3 flex items-center justify-between">
							<div>
								<div className="text-sm font-semibold text-[var(--mono-ink)]">
									Review the plan
								</div>
								<div className="text-xs text-[var(--mono-ink-2)]">
									{plan.scenes.length} scenes · {FORMAT_LABELS[format] ?? format} ·{" "}
									{THEME_LABELS[theme] ?? theme}
								</div>
							</div>
							<button
								type="button"
								onClick={() => setPlan(null)}
								className="text-[var(--mono-ink-3)] hover:text-[var(--mono-ink)]"
								aria-label="Discard plan"
							>
								<X className="size-4" />
							</button>
						</div>
						<div className="space-y-2">
							{plan.scenes.map((s, i) => {
								const sum = sceneSummary(s);
								return (
									<div
										key={i}
										className="flex items-start gap-3 rounded-lg border border-[var(--mono-line)] px-3 py-2"
									>
										<span className="mt-0.5 shrink-0 rounded bg-[var(--mono-hover)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--mono-ink-2)]">
											{sum.tag}
										</span>
										<span className="text-sm text-[var(--mono-ink)]">{sum.text}</span>
									</div>
								);
							})}
						</div>
						<div className="mt-3 flex justify-end gap-2">
							<Button variant="outline" size="sm" onClick={() => setPlan(null)} disabled={busy}>
								Cancel
							</Button>
							<Button size="sm" onClick={() => plan && startRender(plan)} disabled={busy}>
								{busy && <Loader2 className="size-4 animate-spin" />}
								Generate video
							</Button>
						</div>
					</div>
				)}

				{/* renders */}
				{renders.length > 0 && (
					<div className="mt-8">
						<h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--mono-ink-2)]">
							Renders
						</h2>
						<div className="space-y-2">
							{renders.map((r) => (
								<div
									key={r.id}
									className="rounded-xl border border-[var(--mono-line)] bg-[var(--mono-panel)]"
								>
									<div className="flex items-center gap-3 px-3 py-2.5">
										<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--mono-hover)]">
											{r.status === "rendering" ? (
												<Loader2 className="size-4 animate-spin text-[var(--mono-ink-2)]" />
											) : r.status === "done" ? (
												<Check className="size-4 text-emerald-500" />
											) : (
												<X className="size-4 text-red-500" />
											)}
										</div>
										<div className="min-w-0 flex-1">
											<div className="truncate text-sm font-medium text-[var(--mono-ink)]">
												{r.name}
											</div>
											<div className="text-xs text-[var(--mono-ink-2)]">
												{r.status === "rendering"
													? `${stageFor(r.createdAt)}…`
													: r.status === "done"
														? "Added to your Library"
														: "Render failed"}{" "}
												· {FORMAT_LABELS[r.format] ?? r.format}
											</div>
										</div>
										{r.status === "done" && r.url && (
											<>
												<button
													type="button"
													onClick={() =>
														setPreview((p) => (p === r.id ? null : r.id))
													}
													className="rounded-md px-2 py-1 text-xs font-medium text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
												>
													{preview === r.id ? "Hide" : "Preview"}
												</button>
												{r.spec && (
													<button
														type="button"
														onClick={() => {
															setRefineId((p) => (p === r.id ? null : r.id));
															setRefineText("");
														}}
														className="rounded-md px-2 py-1 text-xs font-medium text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
													>
														{refineId === r.id ? "Close" : "Refine"}
													</button>
												)}
												{onRenderAction && r.vaultId && (
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<button
																type="button"
																className="flex size-7 items-center justify-center rounded-md text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
																aria-label="Actions"
															>
																<MoreHorizontal className="size-4" />
															</button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem
																onClick={() => onRenderAction("editor", r.vaultId!)}
															>
																Open in editor
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() => onRenderAction("category", r.vaultId!)}
															>
																Add to a category
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() => onRenderAction("schedule", r.vaultId!)}
															>
																Schedule
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={() => onRenderAction("library", r.vaultId!)}
															>
																View in Library
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												)}
											</>
										)}
									</div>
									{preview === r.id && r.url && (
										<div className="px-3 pb-3">
											{/* eslint-disable-next-line jsx-a11y/media-has-caption */}
											<video
												src={r.url}
												controls
												autoPlay
												className="w-full rounded-lg border border-[var(--mono-line)] bg-black"
											/>
										</div>
									)}
									{refineId === r.id && (
										<div className="border-t border-[var(--mono-line)] px-3 py-3">
											<p className="mb-1.5 text-xs text-[var(--mono-ink-2)]">
												Describe one change. Everything else stays the same.
											</p>
											<div className="flex items-end gap-2">
												<Textarea
													value={refineText}
													onChange={(e) => setRefineText(e.target.value)}
													onKeyDown={(e) => {
														if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
															e.preventDefault();
															void submitRefine(r);
														}
													}}
													placeholder="e.g. shorter hook, make scene 2 a stat, switch to gold, punch up the CTA"
													className="max-h-[120px] min-h-[44px] flex-1 resize-none border border-[var(--mono-line)] bg-[var(--mono-hover)] text-sm dark:bg-[var(--mono-hover)]"
												/>
												<Button
													size="sm"
													onClick={() => void submitRefine(r)}
													disabled={refineBusy || !refineText.trim()}
												>
													{refineBusy && <Loader2 className="size-4 animate-spin" />}
													Apply
												</Button>
											</div>
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				)}
			</div>

			{/* reference source modal: import a video or pick one from the library */}
			<Dialog
				open={refModal !== "closed"}
				onOpenChange={(o) => !o && setRefModal("closed")}
			>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>
							{refModal === "library" ? "Add from library" : "Add a reference"}
						</DialogTitle>
					</DialogHeader>
					{refModal === "choose" ? (
						<div className="grid grid-cols-2 gap-3">
							<button
								type="button"
								onClick={() => {
									setRefModal("closed");
									fileRef.current?.click();
								}}
								className="flex flex-col items-start gap-2 rounded-xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-4 text-left transition-colors hover:bg-[var(--mono-hover)]"
							>
								<Upload className="size-5 text-[var(--mono-ink)]" />
								<span className="text-sm font-medium text-[var(--mono-ink)]">
									Import video
								</span>
								<span className="text-xs text-[var(--mono-ink-2)]">
									Upload a screenshot or clip from your device
								</span>
							</button>
							<button
								type="button"
								onClick={() => void openLibrary()}
								className="flex flex-col items-start gap-2 rounded-xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-4 text-left transition-colors hover:bg-[var(--mono-hover)]"
							>
								<Film className="size-5 text-[var(--mono-ink)]" />
								<span className="text-sm font-medium text-[var(--mono-ink)]">
									Add from library
								</span>
								<span className="text-xs text-[var(--mono-ink-2)]">
									Pick a video you already have
								</span>
							</button>
						</div>
					) : (
						<div>
							<button
								type="button"
								onClick={() => setRefModal("choose")}
								className="mb-3 text-xs font-medium text-[var(--mono-ink-2)] hover:text-[var(--mono-ink)]"
							>
								&larr; Back
							</button>
							{libLoading ? (
								<div className="flex h-40 items-center justify-center">
									<Loader2 className="size-5 animate-spin text-[var(--mono-ink-2)]" />
								</div>
							) : libVideos.length ? (
								<>
									<input
										value={libSearch}
										onChange={(e) => setLibSearch(e.target.value)}
										placeholder="Search your videos…"
										className="mb-2 w-full rounded-lg border border-[var(--mono-line)] bg-[var(--mono-hover)] px-3 py-2 text-sm text-[var(--mono-ink)] outline-none placeholder:text-[var(--mono-ink-3)]"
									/>
								<div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto">
									{libVideos
										.filter((v) =>
											v.name.toLowerCase().includes(libSearch.toLowerCase()),
										)
										.map((v) => (
										<button
											key={v.id}
											type="button"
											onClick={() => addLibraryVideo(v)}
											className="group overflow-hidden rounded-lg border border-[var(--mono-line)] bg-[var(--mono-hover)] text-left transition-colors hover:border-[var(--mono-ink-3)]"
										>
											<div className="relative aspect-[9/16] w-full overflow-hidden bg-black">
												{v.thumbUrl ? (
													// eslint-disable-next-line @next/next/no-img-element
													<img
														src={v.thumbUrl}
														alt={v.name}
														className="size-full object-cover"
													/>
												) : (
													<VideoThumb
														src={fileUrl(
															v.media.find((m) => m.type === "video")?.key || "",
														)}
														className="size-full object-cover"
													/>
												)}
											</div>
											<div className="truncate px-1.5 py-1 text-[10px] text-[var(--mono-ink-2)]">
												{v.name}
											</div>
										</button>
									))}
								</div>
								</>
							) : (
								<div className="flex h-40 items-center justify-center text-sm text-[var(--mono-ink-2)]">
									No videos in your library yet
								</div>
							)}
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
