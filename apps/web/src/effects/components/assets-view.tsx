"use client";

import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useEditor } from "@/editor/use-editor";
import { isVisualElement } from "@/timeline/element-utils";
import { TransitionsSection } from "@/transitions/components/assets-view";
import {
	mediaTimeFromSeconds,
	mediaTimeToSeconds,
	minMediaTime,
} from "@/wasm/media-time";
import type { MediaTime } from "@/wasm";

const buttonClass = "h-auto flex-col items-start gap-0.5 py-2.5";

// Merged "Effects" tab: transitions (clip in/out) + motion effects (full-clip).
export function EffectsView() {
	return (
		<PanelView title="Effects">
			<div className="text-foreground/90 mb-2 text-xs font-medium">
				Transitions
			</div>
			<TransitionsSection />
			<Separator className="my-4" />
			<div className="text-foreground/90 mb-2 text-xs font-medium">Motion</div>
			<MotionEffectsSection />
		</PanelView>
	);
}

type MotionId =
	| "ken-burns"
	| "zoom-out"
	| "pan"
	| "pulse"
	| "shake"
	| "sway"
	| "breathe"
	| "flicker";

const MOTION: { id: MotionId; label: string; description: string }[] = [
	{ id: "ken-burns", label: "Ken Burns", description: "Slow zoom in with a gentle drift" },
	{ id: "zoom-out", label: "Slow zoom out", description: "Ease back from a tight framing" },
	{ id: "pan", label: "Pan", description: "Glide sideways across the clip" },
	{ id: "pulse", label: "Pulse", description: "Rhythmic scale beat" },
	{ id: "shake", label: "Shake", description: "Quick camera shake at the start" },
	{ id: "sway", label: "Sway", description: "Gentle rocking rotation" },
	{ id: "breathe", label: "Breathe", description: "Subtle scale in and out" },
	{ id: "flicker", label: "Flicker", description: "Old-film opacity flicker" },
];

type KeyframeInput = {
	trackId: string;
	elementId: string;
	propertyPath: string;
	time: MediaTime;
	value: number;
};

// Deterministic jitter pattern for the shake burst (so applies are reproducible).
const SHAKE_X = [0, 1, -0.8, 0.6, -1, 0.7, -0.5, 0.9, -0.7, 0.4, -0.3, 0];
const SHAKE_Y = [0, -0.7, 0.9, -0.5, 0.6, -1, 0.5, -0.8, 0.4, -0.6, 0.3, 0];

// Motion effects are keyframes on the selected clip's own transform/opacity, so
// they animate in preview and bake into the export with no engine changes — the
// same mechanism the Transitions tab uses, just full-clip and continuous.
function MotionEffectsSection() {
	const editor = useEditor();

	const apply = ({ id }: { id: MotionId }) => {
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
		const height = canvasSize?.height ?? 1080;

		const keyframes: KeyframeInput[] = [];
		let applied = 0;

		for (const ref of refs) {
			const track = tracks.find((candidate) => candidate?.id === ref.trackId);
			const element = track?.elements.find(
				(candidate) => candidate.id === ref.elementId,
			);
			// Motion needs a transform; skip audio/effect clips.
			if (!element || !isVisualElement(element)) continue;
			applied++;

			const durationSec = mediaTimeToSeconds({ time: element.duration });
			const params = (element.params ?? {}) as Record<string, unknown>;
			const baseX = Number(params["transform.positionX"] ?? 0);
			const baseY = Number(params["transform.positionY"] ?? 0);
			const baseSX = Number(params["transform.scaleX"] ?? 1);
			const baseSY = Number(params["transform.scaleY"] ?? 1);
			const baseRot = Number(params["transform.rotate"] ?? 0);
			const baseOpacity = Number(params.opacity ?? 1);

			const add = (propertyPath: string, timeSec: number, value: number) => {
				const time = minMediaTime({
					a: mediaTimeFromSeconds({ seconds: Math.max(0, timeSec) }),
					b: element.duration,
				});
				keyframes.push({
					trackId: ref.trackId,
					elementId: ref.elementId,
					propertyPath,
					time,
					value,
				});
			};

			const cyclesFor = (period: number, max: number) =>
				Math.min(max, Math.max(2, Math.round(durationSec / period)));

			// Triangle wave between base and peak (one-directional pulse).
			const pulseProp = (
				propertyPath: string,
				base: number,
				peak: number,
				cycles: number,
			) => {
				const steps = cycles * 2;
				for (let i = 0; i <= steps; i++) {
					add(propertyPath, (durationSec * i) / steps, i % 2 === 1 ? peak : base);
				}
			};

			// Symmetric oscillation around base (rocking) — base, +amp, base, -amp…
			const swayProp = (
				propertyPath: string,
				base: number,
				amp: number,
				cycles: number,
			) => {
				const steps = cycles * 4;
				for (let i = 0; i <= steps; i++) {
					const m = i % 4;
					const value = m === 1 ? base + amp : m === 3 ? base - amp : base;
					add(propertyPath, (durationSec * i) / steps, value);
				}
			};

			switch (id) {
				case "ken-burns":
					add("transform.scaleX", 0, baseSX);
					add("transform.scaleX", durationSec, baseSX * 1.18);
					add("transform.scaleY", 0, baseSY);
					add("transform.scaleY", durationSec, baseSY * 1.18);
					add("transform.positionX", 0, baseX);
					add("transform.positionX", durationSec, baseX - width * 0.04);
					add("transform.positionY", 0, baseY);
					add("transform.positionY", durationSec, baseY - height * 0.03);
					break;
				case "zoom-out":
					add("transform.scaleX", 0, baseSX * 1.15);
					add("transform.scaleX", durationSec, baseSX);
					add("transform.scaleY", 0, baseSY * 1.15);
					add("transform.scaleY", durationSec, baseSY);
					break;
				case "pan":
					// A little zoom headroom so the edges never reveal during the pan.
					add("transform.scaleX", 0, baseSX * 1.12);
					add("transform.scaleX", durationSec, baseSX * 1.12);
					add("transform.scaleY", 0, baseSY * 1.12);
					add("transform.scaleY", durationSec, baseSY * 1.12);
					add("transform.positionX", 0, baseX + width * 0.06);
					add("transform.positionX", durationSec, baseX - width * 0.06);
					break;
				case "pulse": {
					const cycles = cyclesFor(0.6, 10);
					pulseProp("transform.scaleX", baseSX, baseSX * 1.06, cycles);
					pulseProp("transform.scaleY", baseSY, baseSY * 1.06, cycles);
					break;
				}
				case "shake": {
					const shakeSec = Math.min(0.6, durationSec);
					const amp = width * 0.018;
					const n = SHAKE_X.length - 1;
					for (let i = 0; i <= n; i++) {
						const timeSec = (shakeSec * i) / n;
						const decay = 1 - i / n;
						add("transform.positionX", timeSec, baseX + amp * decay * SHAKE_X[i]);
						add("transform.positionY", timeSec, baseY + amp * decay * SHAKE_Y[i]);
					}
					break;
				}
				case "sway": {
					const cycles = cyclesFor(1.2, 8);
					swayProp("transform.rotate", baseRot, 3, cycles);
					break;
				}
				case "breathe": {
					const cycles = cyclesFor(2, 6);
					pulseProp("transform.scaleX", baseSX, baseSX * 1.035, cycles);
					pulseProp("transform.scaleY", baseSY, baseSY * 1.035, cycles);
					break;
				}
				case "flicker": {
					const cycles = cyclesFor(0.18, 14);
					pulseProp("opacity", baseOpacity, baseOpacity * 0.82, cycles);
					break;
				}
			}
		}

		if (applied === 0 || keyframes.length === 0) {
			toast.error("Select a video, image, or text clip to animate");
			return;
		}

		editor.timeline.upsertKeyframes({ keyframes });
		toast.success(refs.length > 1 ? "Effect applied to clips" : "Effect applied");
	};

	return (
		<div className="flex flex-col gap-2">
			{MOTION.map((motion) => (
					<Button
						key={motion.id}
						variant="secondary"
						className={buttonClass}
						onClick={() => apply({ id: motion.id })}
					>
						<span className="text-sm font-medium">{motion.label}</span>
						<span className="text-muted-foreground text-xs font-normal">
							{motion.description}
						</span>
					</Button>
			))}
		</div>
	);
}
