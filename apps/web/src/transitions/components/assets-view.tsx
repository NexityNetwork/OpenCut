"use client";

import { Button } from "@/components/ui/button";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { useEditor } from "@/editor/use-editor";
import { toast } from "sonner";
import {
	ZERO_MEDIA_TIME,
	mediaTimeFromSeconds,
	minMediaTime,
	subMediaTime,
} from "@/wasm/media-time";
import type { MediaTime } from "@/wasm";

type TransitionId =
	| "fade-in"
	| "fade-out"
	| "fade-both"
	| "slide-in"
	| "slide-out"
	| "zoom-in"
	| "zoom-out"
	| "pop-in";

const SECONDS = 0.5;

const TRANSITIONS: { id: TransitionId; label: string; description: string }[] = [
	{ id: "fade-in", label: "Fade in", description: "Ease in from transparent" },
	{ id: "fade-out", label: "Fade out", description: "Ease out at the end" },
	{ id: "fade-both", label: "Fade in & out", description: "Soften both ends" },
	{ id: "slide-in", label: "Slide in", description: "Enter sliding from the left" },
	{ id: "slide-out", label: "Slide out", description: "Exit sliding to the right" },
	{ id: "zoom-in", label: "Zoom in", description: "Grow into place" },
	{ id: "zoom-out", label: "Zoom out", description: "Shrink away at the end" },
	{ id: "pop-in", label: "Pop", description: "Scale up with a little overshoot" },
];

type KeyframeInput = {
	trackId: string;
	elementId: string;
	propertyPath: string;
	time: MediaTime;
	value: number;
};

// Transitions are keyframes on the selected clip(s) — opacity for fades,
// position/scale for slides/zooms — so they animate in preview and bake into
// the export with no engine changes. Each apply is a single undoable command.
export function TransitionsSection() {
	const editor = useEditor();

	const apply = ({ id }: { id: TransitionId }) => {
		const refs = editor.selection.getSelectedElements();
		if (refs.length === 0) {
			toast.error("Select a clip on the timeline first");
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
		const width = canvasSize?.width ?? 1920;
		const span0 = mediaTimeFromSeconds({ seconds: SECONDS });
		const keyframes: KeyframeInput[] = [];
		let applied = 0;

		for (const ref of refs) {
			const track = tracks.find((candidate) => candidate?.id === ref.trackId);
			const element = track?.elements.find(
				(candidate) => candidate.id === ref.elementId,
			);
			if (!element) continue;
			applied++;

			const duration = element.duration;
			const span = minMediaTime({ a: span0, b: duration });
			const mid = minMediaTime({
				a: mediaTimeFromSeconds({ seconds: SECONDS * 0.65 }),
				b: duration,
			});
			const outStart = subMediaTime({ a: duration, b: span });
			const params = (element.params ?? {}) as Record<string, unknown>;
			const baseOpacity = Number(params.opacity ?? 1);
			const baseX = Number(params["transform.positionX"] ?? 0);
			const baseSX = Number(params["transform.scaleX"] ?? 1);
			const baseSY = Number(params["transform.scaleY"] ?? 1);

			const add = (propertyPath: string, time: MediaTime, value: number) =>
				keyframes.push({
					trackId: ref.trackId,
					elementId: ref.elementId,
					propertyPath,
					time,
					value,
				});

			switch (id) {
				case "fade-in":
					add("opacity", ZERO_MEDIA_TIME, 0);
					add("opacity", span, baseOpacity);
					break;
				case "fade-out":
					add("opacity", outStart, baseOpacity);
					add("opacity", duration, 0);
					break;
				case "fade-both":
					add("opacity", ZERO_MEDIA_TIME, 0);
					add("opacity", span, baseOpacity);
					add("opacity", outStart, baseOpacity);
					add("opacity", duration, 0);
					break;
				case "slide-in":
					add("opacity", ZERO_MEDIA_TIME, 0);
					add("opacity", span, baseOpacity);
					add("transform.positionX", ZERO_MEDIA_TIME, baseX - width * 0.25);
					add("transform.positionX", span, baseX);
					break;
				case "slide-out":
					add("opacity", outStart, baseOpacity);
					add("opacity", duration, 0);
					add("transform.positionX", outStart, baseX);
					add("transform.positionX", duration, baseX + width * 0.25);
					break;
				case "zoom-in":
					add("opacity", ZERO_MEDIA_TIME, 0);
					add("opacity", span, baseOpacity);
					add("transform.scaleX", ZERO_MEDIA_TIME, baseSX * 0.7);
					add("transform.scaleX", span, baseSX);
					add("transform.scaleY", ZERO_MEDIA_TIME, baseSY * 0.7);
					add("transform.scaleY", span, baseSY);
					break;
				case "zoom-out":
					add("opacity", outStart, baseOpacity);
					add("opacity", duration, 0);
					add("transform.scaleX", outStart, baseSX);
					add("transform.scaleX", duration, baseSX * 1.3);
					add("transform.scaleY", outStart, baseSY);
					add("transform.scaleY", duration, baseSY * 1.3);
					break;
				case "pop-in":
					add("opacity", ZERO_MEDIA_TIME, 0);
					add("opacity", span, baseOpacity);
					add("transform.scaleX", ZERO_MEDIA_TIME, 0);
					add("transform.scaleX", mid, baseSX * 1.12);
					add("transform.scaleX", span, baseSX);
					add("transform.scaleY", ZERO_MEDIA_TIME, 0);
					add("transform.scaleY", mid, baseSY * 1.12);
					add("transform.scaleY", span, baseSY);
					break;
			}
		}

		if (applied === 0 || keyframes.length === 0) {
			toast.error("Could not resolve the selected clip");
			return;
		}

		editor.timeline.upsertKeyframes({ keyframes });
		toast.success(
			refs.length > 1 ? "Transition applied to clips" : "Transition applied",
		);
	};

	return (
		<div className="flex flex-col gap-2">
			{TRANSITIONS.map((transition) => (
				<Button
					key={transition.id}
					variant="secondary"
					className="h-auto flex-col items-start gap-0.5 py-2.5"
					onClick={() => apply({ id: transition.id })}
				>
					<span className="text-sm font-medium">{transition.label}</span>
					<span className="text-muted-foreground text-xs font-normal">
						{transition.description}
					</span>
				</Button>
			))}
		</div>
	);
}

export function TransitionsView() {
	return (
		<PanelView title="Transitions">
			<TransitionsSection />
		</PanelView>
	);
}
