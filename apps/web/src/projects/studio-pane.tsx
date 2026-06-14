"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	ArrowUp,
	Check,
	Clapperboard,
	Film,
	ImageIcon,
	Loader2,
	Play,
	Plus,
	Settings2,
	Zap,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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

// shared style so the in-composer selects read as quiet pills, not boxes
const ghostTrigger =
	"h-8 w-auto gap-1 rounded-lg border-0 bg-transparent px-2 text-sm font-medium text-[var(--mono-ink-2)] shadow-none hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)] focus:ring-0 data-[state=open]:bg-[var(--mono-hover)]";

type StudioRef = {
	id: string;
	kind: "image" | "video";
	ext: string;
	name: string;
	key: string;
	url: string;
	status: "uploading" | "ready";
};
type RenderJob = {
	id: string;
	name: string;
	format: string;
	status: "rendering" | "done" | "failed";
	url?: string | null;
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
			return {
				tag: "List",
				text: (s.items ?? []).map((i) => i.title).join(" · "),
			};
		case "stat":
			return { tag: "Stat", text: `${s.value} — ${s.label}` };
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

export function StudioPane({ owner }: { owner: string; isOwner: boolean }) {
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
	const fileRef = useRef<HTMLInputElement>(null);

	// load persisted defaults
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

	// persistent render list (survives leaving the tab; reconciled server-side)
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
		const id = setInterval(() => void refreshRenders(), 6000);
		return () => clearInterval(id);
	}, [hasPending, refreshRenders]);

	const refsPayload = useCallback(
		() =>
			refs
				.filter((r) => r.status === "ready")
				.map((r) => ({ id: r.id, kind: r.kind, key: r.key, ext: r.ext })),
		[refs],
	);

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
				{ id, kind, ext, name: file.name, key: "", url: "", status: "uploading" },
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
						refs: refsPayload(),
						...(spec ? { spec } : {}),
						render: true,
						name,
					}),
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.error || "render failed");
				setPlan(null);
				toast.success("Rendering started — it will land in your Library");
				await refreshRenders();
			} catch (e) {
				toast.error((e as Error).message);
			} finally {
				setBusy(false);
			}
		},
		[
			prompt,
			instructions,
			designNotes,
			theme,
			format,
			fps,
			model,
			refsPayload,
			refreshRenders,
		],
	);

	const onGenerate = useCallback(async () => {
		if (!prompt.trim()) {
			toast.error("Describe the video you want first");
			return;
		}
		if (refs.some((r) => r.status === "uploading")) {
			toast.error("Hold on — references are still uploading");
			return;
		}
		if (!confirmBeforeGenerate) {
			await startRender();
			return;
		}
		setBusy(true);
		try {
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
					refs: refsPayload(),
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "compose failed");
			setPlan(data.spec as Spec);
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
		refsPayload,
		startRender,
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

	return (
		<div className="mx-auto max-w-3xl px-4 pb-28 pt-14 sm:px-6 lg:pt-8">
			<header className="mb-6">
				<div className="flex items-center gap-2">
					<Clapperboard className="size-6 text-[var(--mono-ink)]" />
					<h1 className="text-2xl font-semibold tracking-tight text-[var(--mono-ink)]">
						Studio
					</h1>
					<span className="rounded-full bg-[var(--mono-ink)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--mono-panel)]">
						New
					</span>
				</div>
				<p className="mt-1.5 text-sm text-[var(--mono-ink-2)]">
					Describe a video, attach the screenshots and clips you want inside it, and
					generate an on-brand reel straight into your Library.
				</p>
			</header>

			{/* composer */}
			<div className="rounded-[26px] border border-[var(--mono-line)] bg-[var(--mono-panel)] p-2.5 shadow-sm transition focus-within:border-[var(--mono-ink-3)]">
				{refs.length > 0 && (
					<div className="mb-1 flex flex-wrap gap-2 px-1.5 pt-1">
						{refs.map((r) => (
							<div
								key={r.id}
								className="group relative size-14 overflow-hidden rounded-xl border border-[var(--mono-line)] bg-[var(--mono-hover)]"
								title={`${r.name} (${r.kind === "video" ? "in-video clip" : "screenshot"})`}
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
								<span className="absolute bottom-0 left-0 flex items-center gap-0.5 rounded-tr bg-black/60 px-1 py-0.5 text-white">
									{r.kind === "video" ? (
										<Film className="size-2.5" />
									) : (
										<ImageIcon className="size-2.5" />
									)}
								</span>
								<button
									type="button"
									onClick={() => setRefs((prev) => prev.filter((x) => x.id !== r.id))}
									className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
									aria-label="Remove reference"
								>
									<X className="size-3" />
								</button>
							</div>
						))}
					</div>
				)}

				<Textarea
					value={prompt}
					onChange={(e) => setPrompt(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
							e.preventDefault();
							void onGenerate();
						}
					}}
					placeholder="Describe the video you want, or drop a rough idea and hit Enhance. Attach screenshots or clips to drop them in."
					className="max-h-[280px] min-h-[88px] resize-none border-0 bg-transparent px-2 py-1.5 text-base text-[var(--mono-ink)] shadow-none focus-visible:ring-0"
				/>

				{/* actions */}
				<div className="flex items-center gap-1 px-0.5 pt-1">
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
						onClick={() => fileRef.current?.click()}
						className="flex size-9 items-center justify-center rounded-lg text-[var(--mono-ink-2)] transition hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
						aria-label="Add reference"
						title="Add a screenshot or clip"
					>
						<Plus className="size-5" />
					</button>
					<button
						type="button"
						onClick={enhancePrompt}
						disabled={enhancing}
						className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-[var(--mono-ink-2)] transition hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)] disabled:opacity-50"
						title="Rewrite your idea into a richer brief"
					>
						{enhancing ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Zap className="size-4" />
						)}
						<span className="hidden sm:inline">Enhance</span>
					</button>

					<div className="mx-0.5 h-5 w-px bg-[var(--mono-line)]" />

					<Select value={theme} onValueChange={setTheme}>
						<SelectTrigger className={ghostTrigger} aria-label="Design theme">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{Object.keys(THEMES).map((k) => (
								<SelectItem key={k} value={k}>
									{THEME_LABELS[k] ?? k}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<Select value={format} onValueChange={setFormat}>
						<SelectTrigger className={ghostTrigger} aria-label="Aspect ratio">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{FORMAT_KEYS.map((k) => (
								<SelectItem key={k} value={k}>
									{FORMAT_LABELS[k] ?? k} {k}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<button
						type="button"
						onClick={() => setSettingsOpen((v) => !v)}
						className={cn(
							"flex size-9 items-center justify-center rounded-lg text-[var(--mono-ink-2)] transition hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]",
							settingsOpen && "bg-[var(--mono-hover)] text-[var(--mono-ink)]",
						)}
						aria-label="Studio settings"
						title="Settings"
					>
						<Settings2 className="size-[18px]" />
					</button>

					<button
						type="button"
						onClick={onGenerate}
						disabled={busy}
						className="ml-auto flex size-9 items-center justify-center rounded-full bg-[var(--mono-ink)] text-[var(--mono-panel)] transition hover:opacity-90 disabled:opacity-40"
						aria-label="Generate"
						title="Generate (Cmd/Ctrl + Enter)"
					>
						{busy ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<ArrowUp className="size-5" />
						)}
					</button>
				</div>
			</div>

			{/* advanced settings */}
			{settingsOpen && (
				<div className="mt-3 space-y-4 rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-4 shadow-sm">
					<div className="flex items-center justify-between gap-3">
						<label className="text-sm font-medium text-[var(--mono-ink)]">
							Model
						</label>
						<Select value={model} onValueChange={setModel}>
							<SelectTrigger className="h-9 w-48 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{STUDIO_MODELS.map((m) => (
									<SelectItem key={m.value} value={m.value}>
										{m.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex items-center justify-between gap-3">
						<label className="text-sm font-medium text-[var(--mono-ink)]">
							Frame rate
						</label>
						<Select value={String(fps)} onValueChange={(v) => setFps(Number(v))}>
							<SelectTrigger className="h-9 w-32 text-sm">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{FPS_PRESETS.map((f) => (
									<SelectItem key={f.value} value={f.value}>
										{f.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div>
						<label className="text-sm font-medium text-[var(--mono-ink)]">
							Agent instructions
						</label>
						<p className="mb-1.5 text-xs text-[var(--mono-ink-2)]">
							Persistent guidance applied to every generation (voice, do's and
							don'ts, recurring CTAs).
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
							Brand voice and copy direction. The visual theme above owns colors and
							layout.
						</p>
						<Textarea
							value={designNotes}
							onChange={(e) => setDesignNotes(e.target.value)}
							placeholder="e.g. Tone: bold, technical, no fluff. Audience: founders. Avoid buzzwords."
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
							className="gap-1.5"
						>
							{savingSettings ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Check className="size-4" />
							)}
							Save as defaults
						</Button>
					</div>
				</div>
			)}

			{/* renders */}
			{renders.length > 0 && (
				<div className="mt-8">
					<h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--mono-ink-2)]">
						Renders
					</h2>
					<div className="space-y-2">
						{renders.map((r) => (
							<div
								key={r.id}
								className="flex items-center gap-3 rounded-xl border border-[var(--mono-line)] bg-[var(--mono-panel)] px-3 py-2.5"
							>
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
											? "Rendering…"
											: r.status === "done"
												? "Added to your Library"
												: "Render failed"}{" "}
										· {FORMAT_LABELS[r.format] ?? r.format}
									</div>
								</div>
								{r.status === "done" && r.url && (
									<a
										href={r.url}
										target="_blank"
										rel="noreferrer"
										className="text-xs font-medium text-[var(--mono-ink)] underline-offset-2 hover:underline"
									>
										Preview
									</a>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* confirm-before-generate plan dialog */}
			<Dialog open={!!plan} onOpenChange={(o) => !o && setPlan(null)}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Review the plan</DialogTitle>
						<DialogDescription>
							{plan?.scenes.length ?? 0} scenes · {FORMAT_LABELS[format] ?? format} ·{" "}
							{THEME_LABELS[theme] ?? theme}
						</DialogDescription>
					</DialogHeader>
					<div className="max-h-[50vh] space-y-2 overflow-y-auto">
						{(plan?.scenes ?? []).map((s, i) => {
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
					<DialogFooter>
						<Button variant="outline" onClick={() => setPlan(null)} disabled={busy}>
							Cancel
						</Button>
						<Button
							onClick={() => plan && startRender(plan)}
							disabled={busy}
							className="gap-1.5"
						>
							{busy ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								<Play className="size-4" />
							)}
							Generate video
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
