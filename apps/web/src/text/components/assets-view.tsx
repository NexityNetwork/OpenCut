"use client";

import { useEffect } from "react";
import { DraggableItem } from "@/components/editor/panels/assets/draggable-item";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useEditor } from "@/editor/use-editor";
import { DEFAULTS } from "@/timeline/defaults";
import { buildTextElement } from "@/timeline/element-utils";
import { loadFullFont } from "@/fonts/google-fonts";
import {
	ZERO_MEDIA_TIME,
	mediaTimeFromSeconds,
	minMediaTime,
} from "@/wasm/media-time";
import type { MediaTime } from "@/wasm";

type TextPreset = {
	id: string;
	label: string;
	content: string;
	fontFamily: string;
	fontSize: number;
	fontWeight?: "normal" | "bold";
	fontStyle?: "normal" | "italic";
	color?: string;
	background?: boolean;
};

// Styled starting points. All fonts are present in the rendering atlas, so they
// render correctly in preview and on export. Click (or the + button) applies the
// full style; the params are merged over the text-element defaults by the builder.
const TEXT_PRESETS: TextPreset[] = [
	{ id: "default", label: "Default text", content: "Default text", fontFamily: "Arial", fontSize: 15 },
	{ id: "headline", label: "Headline", content: "HEADLINE", fontFamily: "Anton", fontSize: 56 },
	{ id: "title", label: "Title", content: "Title", fontFamily: "Montserrat", fontSize: 40, fontWeight: "bold" },
	{ id: "subtitle", label: "Subtitle", content: "Subtitle", fontFamily: "Montserrat", fontSize: 24, color: "#d4d4d4" },
	{ id: "body", label: "Body", content: "Body text", fontFamily: "Poppins", fontSize: 16 },
	{ id: "caption", label: "Caption", content: "CAPTION", fontFamily: "Archivo Black", fontSize: 30, background: true },
	{ id: "elegant", label: "Elegant", content: "Elegant", fontFamily: "Playfair Display", fontSize: 44, fontStyle: "italic" },
	{ id: "script", label: "Script", content: "Script", fontFamily: "Pacifico", fontSize: 40 },
];

type AnimationId = "fade" | "rise" | "slide" | "pop" | "zoom";

type KeyframeInput = {
	trackId: string;
	elementId: string;
	propertyPath: string;
	time: MediaTime;
	value: number;
};

const ENTRANCE_SECONDS = 0.6;

const TEXT_ANIMATIONS: {
	id: AnimationId;
	label: string;
	description: string;
}[] = [
	{ id: "fade", label: "Fade in", description: "Ease in from transparent" },
	{ id: "rise", label: "Rise up", description: "Slide up while fading in" },
	{ id: "slide", label: "Slide in", description: "Enter from the left" },
	{ id: "pop", label: "Pop", description: "Scale up with a little overshoot" },
	{ id: "zoom", label: "Zoom in", description: "Settle in from larger" },
];

export function TextView() {
	const editor = useEditor();

	useEffect(() => {
		for (const preset of TEXT_PRESETS) {
			void loadFullFont({ family: preset.fontFamily });
		}
	}, []);

	const addPreset = ({
		preset,
		currentTime,
	}: {
		preset: TextPreset;
		currentTime: MediaTime;
	}) => {
		const activeScene = editor.scenes.getActiveScene();
		if (!activeScene) return;

		const element = buildTextElement({
			raw: {
				name: preset.label,
				params: {
					content: preset.content,
					fontFamily: preset.fontFamily,
					fontSize: preset.fontSize,
					fontWeight: preset.fontWeight ?? "normal",
					fontStyle: preset.fontStyle ?? "normal",
					color: preset.color ?? "#ffffff",
					...(preset.background
						? {
								"background.enabled": true,
								"background.color": "#000000",
							}
						: {}),
				},
			},
			startTime: currentTime,
		});

		editor.timeline.insertElement({ element, placement: { mode: "auto" } });
	};

	// Entrance animations are keyframes on the selected text clip's own
	// transform/opacity, so they animate in preview and bake into the export.
	// Base values are read off the element so manual positioning/scale is kept.
	const applyAnimation = ({ id }: { id: AnimationId }) => {
		const refs = editor.selection.getSelectedElements();
		if (refs.length === 0) {
			toast.error("Select a text clip on the timeline first");
			return;
		}

		const scene = editor.scenes.getActiveSceneOrNull();
		if (!scene) return;

		const tracks = [
			scene.tracks.main,
			...scene.tracks.overlay,
			...scene.tracks.audio,
		];
		const canvasSize = editor.project.getActive()?.settings.canvasSize;
		const height = canvasSize?.height ?? 1080;
		const width = canvasSize?.width ?? 1920;

		const fullSpan = mediaTimeFromSeconds({ seconds: ENTRANCE_SECONDS });
		const overshootSpan = mediaTimeFromSeconds({
			seconds: ENTRANCE_SECONDS * 0.65,
		});

		const keyframes: KeyframeInput[] = [];
		let appliedToText = 0;

		for (const ref of refs) {
			const track = tracks.find((candidate) => candidate?.id === ref.trackId);
			const element = track?.elements.find(
				(candidate) => candidate.id === ref.elementId,
			);
			if (!element || element.type !== "text") continue;
			appliedToText++;

			const span = minMediaTime({ a: fullSpan, b: element.duration });
			const mid = minMediaTime({ a: overshootSpan, b: element.duration });
			const params = element.params as Record<string, unknown>;
			const baseX = Number(params["transform.positionX"] ?? 0);
			const baseY = Number(params["transform.positionY"] ?? 0);
			const baseScaleX = Number(params["transform.scaleX"] ?? 1);
			const baseScaleY = Number(params["transform.scaleY"] ?? 1);
			const baseOpacity = Number(params.opacity ?? 1);

			const add = (propertyPath: string, time: MediaTime, value: number) =>
				keyframes.push({
					trackId: ref.trackId,
					elementId: ref.elementId,
					propertyPath,
					time,
					value,
				});

			// Every entrance also fades in.
			add("opacity", ZERO_MEDIA_TIME, 0);
			add("opacity", span, baseOpacity);

			if (id === "rise") {
				// +Y is down, so start below the resting position.
				add("transform.positionY", ZERO_MEDIA_TIME, baseY + height * 0.12);
				add("transform.positionY", span, baseY);
			} else if (id === "slide") {
				add("transform.positionX", ZERO_MEDIA_TIME, baseX - width * 0.18);
				add("transform.positionX", span, baseX);
			} else if (id === "pop") {
				add("transform.scaleX", ZERO_MEDIA_TIME, 0);
				add("transform.scaleX", mid, baseScaleX * 1.12);
				add("transform.scaleX", span, baseScaleX);
				add("transform.scaleY", ZERO_MEDIA_TIME, 0);
				add("transform.scaleY", mid, baseScaleY * 1.12);
				add("transform.scaleY", span, baseScaleY);
			} else if (id === "zoom") {
				add("transform.scaleX", ZERO_MEDIA_TIME, baseScaleX * 1.5);
				add("transform.scaleX", span, baseScaleX);
				add("transform.scaleY", ZERO_MEDIA_TIME, baseScaleY * 1.5);
				add("transform.scaleY", span, baseScaleY);
			}
		}

		if (appliedToText === 0) {
			toast.error("Select a text clip to animate");
			return;
		}

		editor.timeline.upsertKeyframes({ keyframes });
		toast.success(
			appliedToText > 1 ? "Animation applied to text" : "Animation applied",
		);
	};

	return (
		<PanelView title="Text">
			<div className="grid grid-cols-3 gap-2">
				{TEXT_PRESETS.map((preset) => (
					<DraggableItem
						key={preset.id}
						name={preset.label}
						preview={
							<div className="bg-accent flex size-full items-center justify-center overflow-hidden rounded px-1.5">
								<span
									className="max-w-full truncate select-none"
									style={{
										fontSize: 12,
										fontFamily: `'${preset.fontFamily}', sans-serif`,
										fontWeight: preset.fontWeight === "bold" ? 700 : 400,
										fontStyle: preset.fontStyle ?? "normal",
										color: preset.color ?? "#ffffff",
										...(preset.background
											? {
													backgroundColor: "#000000",
													padding: "2px 6px",
													borderRadius: 4,
												}
											: {}),
									}}
								>
									{preset.label}
								</span>
							</div>
						}
						dragData={{
							id: `text-preset-${preset.id}`,
							type: DEFAULTS.text.element.type,
							name: preset.label,
							content: preset.content,
						}}
						aspectRatio={1}
						onAddToTimeline={({ currentTime }: { currentTime: MediaTime }) =>
							addPreset({ preset, currentTime })
						}
						shouldShowLabel={false}
					/>
				))}
			</div>

			<Separator className="my-4" />

			<div className="mb-2 flex items-baseline justify-between">
				<span className="text-sm font-medium">Animations</span>
			</div>
			<div className="flex flex-col gap-2">
				{TEXT_ANIMATIONS.map((animation) => (
					<Button
						key={animation.id}
						variant="secondary"
						className="h-auto flex-col items-start gap-0.5 py-2.5"
						onClick={() => applyAnimation({ id: animation.id })}
					>
						<span className="text-sm font-medium">{animation.label}</span>
						<span className="text-muted-foreground text-xs font-normal">
							{animation.description}
						</span>
					</Button>
				))}
			</div>
		</PanelView>
	);
}
