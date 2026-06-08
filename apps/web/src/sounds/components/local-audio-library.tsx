"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEditor } from "@/editor/use-editor";
import { useMediaImport } from "@/media/use-media-import";
import { processMediaAssets } from "@/media/processing";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { DEFAULT_NEW_ELEMENT_DURATION } from "@/timeline/creation";
import { mediaTimeFromSeconds } from "@/wasm/media-time";
import {
	getSavedAudio,
	subscribeSavedAudio,
	toggleSavedAudio,
	type SavedAudioItem,
} from "@/sounds/saved-audio";
import { cn } from "@/utils/ui";
import { UrlImport } from "@/media/url-import";
import { Upload } from "lucide-react";
import {
	FavouriteIcon,
	PauseIcon,
	PlayIcon,
	PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type LibraryItem = SavedAudioItem;

export function LocalAudioLibrary({
	manifestUrl,
	searchPlaceholder,
	source = "manifest",
	urlImportMode,
}: {
	manifestUrl?: string;
	searchPlaceholder: string;
	source?: "manifest" | "saved";
	urlImportMode?: "audio" | "video";
}) {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActiveOrNull());

	const [items, setItems] = useState<LibraryItem[]>([]);
	const [loading, setLoading] = useState(source === "manifest");
	const [query, setQuery] = useState("");
	const [category, setCategory] = useState("all");
	const [playingId, setPlayingId] = useState<string | null>(null);
	const [addingId, setAddingId] = useState<string | null>(null);
	const [savedTick, setSavedTick] = useState(0);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const { openFilePicker, fileInputProps } = useMediaImport({
		accept: "audio/*",
	});

	// Load from the bundled manifest (browse) or from saved favourites.
	useEffect(() => {
		if (source === "saved") {
			setItems(getSavedAudio());
			return subscribeSavedAudio(() => setItems(getSavedAudio()));
		}
		if (!manifestUrl) return;
		let cancelled = false;
		setLoading(true);
		fetch(manifestUrl)
			.then((r) => (r.ok ? r.json() : { items: [] }))
			.then((data) => {
				if (!cancelled) {
					setItems(Array.isArray(data?.items) ? data.items : []);
					setLoading(false);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setItems([]);
					setLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [manifestUrl, source]);

	useEffect(() => subscribeSavedAudio(() => setSavedTick((t) => t + 1)), []);
	useEffect(
		() => () => {
			audioRef.current?.pause();
		},
		[],
	);

	const categories = useMemo(
		() => ["all", ...Array.from(new Set(items.map((i) => i.category)))],
		[items],
	);
	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return items.filter(
			(i) =>
				(category === "all" || i.category === category) &&
				(!q || i.name.toLowerCase().includes(q)),
		);
	}, [items, category, query]);

	const togglePlay = (item: LibraryItem) => {
		if (!audioRef.current) audioRef.current = new Audio();
		const audio = audioRef.current;
		if (playingId === item.id) {
			audio.pause();
			setPlayingId(null);
			return;
		}
		audio.src = item.file;
		audio.onended = () => setPlayingId(null);
		void audio.play().catch(() => setPlayingId(null));
		setPlayingId(item.id);
	};

	const addToTimeline = async (item: LibraryItem) => {
		if (!activeProject) {
			toast.error("No active project");
			return;
		}
		setAddingId(item.id);
		try {
			const blob = await (await fetch(item.file)).blob();
			const ext = item.file.split(".").pop() || "mp3";
			const file = new File([blob], `${item.name}.${ext}`, {
				type: blob.type || "audio/mpeg",
			});
			const [processed] = await processMediaAssets({ files: [file] });
			if (!processed) throw new Error("Could not process audio");
			const asset = await editor.media.addMediaAsset({
				projectId: activeProject.metadata.id,
				asset: processed,
			});
			if (!asset) throw new Error("Could not save audio");
			const duration =
				asset.duration != null
					? mediaTimeFromSeconds({ seconds: asset.duration })
					: DEFAULT_NEW_ELEMENT_DURATION;
			const element = buildElementFromMedia({
				mediaId: asset.id,
				mediaType: asset.type,
				name: asset.name,
				duration,
				startTime: editor.playback.getCurrentTime(),
			});
			editor.timeline.insertElement({ element, placement: { mode: "auto" } });
			toast.success(`Added "${item.name}"`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Couldn't add audio");
		} finally {
			setAddingId(null);
		}
	};

	const showCategoryPicker = source === "manifest" && categories.length > 2;
	// Recomputed when favourites change (savedTick) so heart fills update live.
	const savedIds = useMemo(
		() => new Set(getSavedAudio().map((i) => i.id)),
		[savedTick],
	);

	return (
		<div className="flex h-full flex-col gap-3 p-5 pt-0">
			<input {...fileInputProps} />
			<div className="flex flex-col gap-2">
				<Input
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder={searchPlaceholder}
					showClearIcon
					onClear={() => setQuery("")}
					className="w-full"
					containerClassName="w-full"
				/>
				{(showCategoryPicker || source !== "saved") && (
					<div className="flex items-center gap-2">
						{showCategoryPicker && (
							<Select value={category} onValueChange={setCategory}>
								<SelectTrigger className="h-9 flex-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{categories.map((cat) => (
										<SelectItem key={cat} value={cat}>
											{cat === "all" ? "All categories" : cat}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
						{source !== "saved" && (
							<button
								type="button"
								onClick={openFilePicker}
								title="Import your own audio"
								className="border-input bg-accent text-muted-foreground hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-md border"
							>
								<Upload className="size-4" />
							</button>
						)}
					</div>
				)}
			</div>

			{urlImportMode && (
				<UrlImport mode={urlImportMode} insertToTimeline />
			)}

			<div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
				{loading ? (
					<div className="flex items-center justify-center py-8">
						<Spinner className="text-muted-foreground size-6" />
					</div>
				) : filtered.length === 0 ? (
					<p className="text-muted-foreground py-8 text-center text-sm text-balance px-6">
						{source === "saved"
							? "No saved audio yet — tap the heart on any sound or track to save it here."
							: "No results"}
					</p>
				) : (
					filtered.map((item) => {
						const saved = savedIds.has(item.id);
						return (
							<div
								key={item.id}
								className="hover:bg-accent/60 group flex items-center gap-2 rounded-md px-2 py-1.5"
							>
								<button
									type="button"
									onClick={() => togglePlay(item)}
									className="bg-accent text-foreground flex size-7 shrink-0 items-center justify-center rounded-full"
									aria-label={playingId === item.id ? "Pause" : "Play"}
								>
									<HugeiconsIcon
										icon={playingId === item.id ? PauseIcon : PlayIcon}
										size={13}
									/>
								</button>
								<div className="min-w-0 flex-1">
									<div className="truncate text-sm">{item.name}</div>
									<div className="text-muted-foreground text-[0.7rem]">
										{item.category}
									</div>
								</div>
								<button
									type="button"
									onClick={() => toggleSavedAudio(item)}
									className={cn(
										"flex size-7 shrink-0 items-center justify-center rounded-full",
										saved
											? "text-primary"
											: "text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100",
									)}
									aria-label={saved ? "Remove from saved" : "Save"}
								>
									<HugeiconsIcon icon={FavouriteIcon} size={15} />
								</button>
								<button
									type="button"
									onClick={() => addToTimeline(item)}
									disabled={addingId === item.id}
									className="text-muted-foreground hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 disabled:opacity-100"
									aria-label="Add to timeline"
								>
									{addingId === item.id ? (
										<Spinner className="size-3.5" />
									) : (
										<HugeiconsIcon icon={PlusSignIcon} size={15} />
									)}
								</button>
							</div>
						);
					})
				)}
			</div>
		</div>
	);
}
