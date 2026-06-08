"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useEditor } from "@/editor/use-editor";
import { processMediaAssets } from "@/media/processing";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { DEFAULT_NEW_ELEMENT_DURATION } from "@/timeline/creation";
import { mediaTimeFromSeconds } from "@/wasm/media-time";
import { revoiceClip } from "@/services/revoice/revoice";
import {
	DEFAULT_TTS_VOICE,
	TTS_VOICES,
	getTtsVoice,
} from "@/services/tts/voices";

const NONE_STYLE = "__none__";

// Azure-powered text-to-speech voiceover: type a script, pick a neural voice +
// style + speed, and drop the rendered narration straight onto the timeline.
export function VoiceoverView() {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActiveOrNull());

	const [text, setText] = useState("");
	const [voice, setVoice] = useState(DEFAULT_TTS_VOICE);
	const [style, setStyle] = useState(NONE_STYLE);
	const [rate, setRate] = useState(1);
	const [isGenerating, setIsGenerating] = useState(false);
	const [isRevoicing, setIsRevoicing] = useState(false);
	const [revoiceStatus, setRevoiceStatus] = useState("");

	const voiceInfo = useMemo(() => getTtsVoice(voice), [voice]);
	const styles = voiceInfo?.styles ?? [];

	// Name of the first selected clip that carries audio (video/audio), or null.
	const selectedClipName = useEditor((e) => {
		const refs = e.selection.getSelectedElements();
		if (refs.length === 0) return null;
		const scene = e.scenes.getActiveSceneOrNull();
		if (!scene) return null;
		const tracks = [scene.tracks.main, ...scene.tracks.overlay, ...scene.tracks.audio];
		for (const ref of refs) {
			const track = tracks.find((t) => t?.id === ref.trackId);
			const element = track?.elements.find((x) => x.id === ref.elementId);
			if (element && (element.type === "video" || element.type === "audio")) {
				return element.name;
			}
		}
		return null;
	});

	const handleRevoice = async () => {
		const refs = editor.selection.getSelectedElements();
		const scene = editor.scenes.getActiveSceneOrNull();
		if (!scene || !activeProject) {
			toast.error("No active project");
			return;
		}
		const tracks = [scene.tracks.main, ...scene.tracks.overlay, ...scene.tracks.audio];
		let trackId: string | null = null;
		let element: {
			id: string;
			mediaId: string;
			startTime: import("@/wasm").MediaTime;
			params: Record<string, unknown>;
		} | null = null;
		for (const ref of refs) {
			const track = tracks.find((t) => t?.id === ref.trackId);
			const found = track?.elements.find((x) => x.id === ref.elementId);
			if (found && (found.type === "video" || found.type === "audio")) {
				trackId = ref.trackId;
				element = found as unknown as typeof element;
				break;
			}
		}
		if (!trackId || !element) {
			toast.error("Select a video or audio clip on the timeline first");
			return;
		}
		const asset = editor.media.getAssets().find((a) => a.id === element.mediaId);
		if (!asset?.file) {
			toast.error("Could not find the clip's media file");
			return;
		}

		setIsRevoicing(true);
		setRevoiceStatus("Starting…");
		try {
			const { blob, durationSeconds } = await revoiceClip({
				file: asset.file,
				voice,
				style: style === NONE_STYLE ? undefined : style,
				language: "auto",
				onProgress: (message) => setRevoiceStatus(message),
			});

			setRevoiceStatus("Adding to timeline…");
			const voiceName = getTtsVoice(voice)?.displayName ?? "New voice";
			const file = new File([blob], `Re-voiced (${voiceName}).wav`, {
				type: "audio/wav",
			});
			const [processed] = await processMediaAssets({ files: [file] });
			if (!processed) throw new Error("Could not process the new audio");
			const newAsset = await editor.media.addMediaAsset({
				projectId: activeProject.metadata.id,
				asset: processed,
			});
			if (!newAsset) throw new Error("Could not save the new audio");

			const duration =
				newAsset.duration != null
					? mediaTimeFromSeconds({ seconds: newAsset.duration })
					: mediaTimeFromSeconds({ seconds: durationSeconds });
			const newElement = buildElementFromMedia({
				mediaId: newAsset.id,
				mediaType: newAsset.type,
				name: `Re-voiced (${voiceName})`,
				duration,
				startTime: element.startTime,
			});
			editor.timeline.insertElement({
				element: newElement,
				placement: { mode: "auto" },
			});

			// Mute the original clip's audio so only the new voice is heard.
			editor.timeline.updateElements({
				updates: [
					{
						trackId,
						elementId: element.id,
						patch: { params: { ...element.params, muted: true, volume: 0 } },
					},
				],
			});

			toast.success("Voice changed and added to the timeline");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Couldn't change the voice",
			);
		} finally {
			setIsRevoicing(false);
			setRevoiceStatus("");
		}
	};

	const handleVoiceChange = (next: string) => {
		setVoice(next);
		setStyle(NONE_STYLE);
	};

	const handleGenerate = async () => {
		const trimmed = text.trim();
		if (!trimmed) {
			toast.error("Type something for the voice to say");
			return;
		}
		if (!activeProject) {
			toast.error("No active project");
			return;
		}

		setIsGenerating(true);
		try {
			const response = await fetch("/api/tts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					text: trimmed,
					voice,
					style: style === NONE_STYLE ? undefined : style,
					rate,
				}),
			});
			if (!response.ok) {
				const detail = await response
					.json()
					.catch(() => ({}) as { error?: string });
				throw new Error(detail.error ?? `Voiceover failed (${response.status})`);
			}

			const blob = await response.blob();
			const label = `Voiceover - ${trimmed.slice(0, 24)}${trimmed.length > 24 ? "…" : ""}`;
			const file = new File([blob], `${label}.mp3`, { type: "audio/mpeg" });

			const [processed] = await processMediaAssets({ files: [file] });
			if (!processed) throw new Error("Could not process the audio");

			const asset = await editor.media.addMediaAsset({
				projectId: activeProject.metadata.id,
				asset: processed,
			});
			if (!asset) throw new Error("Could not save the audio");

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

			toast.success("Voiceover added to the timeline");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Voiceover generation failed",
			);
		} finally {
			setIsGenerating(false);
		}
	};

	const labelClass = "text-foreground/90 text-xs font-medium";

	return (
		<div className="flex h-full flex-col gap-3.5 overflow-y-auto p-5 pt-1">
			<div className="flex flex-col gap-1.5">
				<span className={labelClass}>Script</span>
				<div className="relative">
					<Textarea
						id="voiceover-text"
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Type what you want the voice to say…"
						className="min-h-[92px] pb-6"
						maxLength={5000}
					/>
					<span className="text-muted-foreground pointer-events-none absolute bottom-2 right-3 text-[0.65rem]">
						{text.length}/5000
					</span>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-3.5">
				<div className="flex flex-col gap-1.5">
					<span className={labelClass}>Voice</span>
					<Select value={voice} onValueChange={handleVoiceChange}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select a voice" />
						</SelectTrigger>
						<SelectContent>
							{TTS_VOICES.map((v) => (
								<SelectItem key={v.shortName} value={v.shortName}>
									{v.displayName} · {v.language} · {v.gender}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{styles.length > 0 && (
					<div className="flex flex-col gap-1.5">
						<span className={labelClass}>Style</span>
						<Select value={style} onValueChange={setStyle}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Default" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={NONE_STYLE}>Default</SelectItem>
								{styles.map((s) => (
									<SelectItem key={s} value={s}>
										{s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ")}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				)}

				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<span className={labelClass}>Speed</span>
						<span className="text-muted-foreground text-xs tabular-nums">
							{rate.toFixed(2)}×
						</span>
					</div>
					<Slider
						value={[rate]}
						min={0.5}
						max={2}
						step={0.05}
						onValueChange={(next) => setRate(next[0] ?? 1)}
					/>
				</div>
			</div>

			<Button
				type="button"
				className="w-full"
				onClick={handleGenerate}
				disabled={isGenerating || isRevoicing || text.trim().length === 0}
			>
				{isGenerating && <Spinner className="mr-1" />}
				{isGenerating ? "Generating…" : "Generate voiceover"}
			</Button>

			<div className="border-border/60 mt-1 flex flex-col gap-2 border-t pt-4">
				<span className="text-sm font-medium">Change a clip's voice</span>
				<p className="text-muted-foreground text-xs leading-relaxed">
					{selectedClipName
						? `Re-voices "${selectedClipName}" in the voice above, kept in sync with the original timing. The original audio is muted.`
						: "Select a video or audio clip on the timeline, then re-voice it in the voice chosen above (kept in sync; original audio muted)."}
				</p>
				<Button
					type="button"
					variant="secondary"
					className="w-full"
					onClick={handleRevoice}
					disabled={isRevoicing || isGenerating || !selectedClipName}
				>
					{isRevoicing && <Spinner className="mr-1" />}
					{isRevoicing
						? revoiceStatus || "Working…"
						: "Change voice of selected clip"}
				</Button>
			</div>
		</div>
	);
}
