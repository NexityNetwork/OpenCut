"use client";

import { useEffect, useState } from "react";
import { useEditor } from "@/editor/use-editor";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

// Mirrors BLEND_MODE_OPTIONS in @/params (not exported there).
const BLEND_MODES: { value: string; label: string }[] = [
	{ value: "normal", label: "Normal" },
	{ value: "darken", label: "Darken" },
	{ value: "multiply", label: "Multiply" },
	{ value: "color-burn", label: "Color Burn" },
	{ value: "lighten", label: "Lighten" },
	{ value: "screen", label: "Screen" },
	{ value: "plus-lighter", label: "Plus Lighter" },
	{ value: "color-dodge", label: "Color Dodge" },
	{ value: "overlay", label: "Overlay" },
	{ value: "soft-light", label: "Soft Light" },
	{ value: "hard-light", label: "Hard Light" },
	{ value: "difference", label: "Difference" },
	{ value: "exclusion", label: "Exclusion" },
	{ value: "hue", label: "Hue" },
	{ value: "saturation", label: "Saturation" },
	{ value: "color", label: "Color" },
	{ value: "luminosity", label: "Luminosity" },
];

// Per-clip visual adjustments built on the params the engine already renders
// (opacity, blend mode) — so they preview and export correctly. Each change is a
// single undoable command. (Color grading needs the WASM render engine.)
export function AdjustmentsView() {
	const editor = useEditor();

	const ref = useEditor((e) => e.selection.getSelectedElements()[0] ?? null);
	const element = useEditor((e) => {
		const selected = e.selection.getSelectedElements()[0];
		if (!selected) return null;
		const scene = e.scenes.getActiveSceneOrNull();
		if (!scene) return null;
		const tracks = [
			scene.tracks.main,
			...scene.tracks.overlay,
			...scene.tracks.audio,
		];
		const track = tracks.find((candidate) => candidate?.id === selected.trackId);
		return (
			track?.elements.find((candidate) => candidate.id === selected.elementId) ??
			null
		);
	});

	const params = (element?.params ?? {}) as Record<string, unknown>;
	const hasOpacity = typeof params.opacity === "number";
	const opacity = hasOpacity ? (params.opacity as number) : 1;
	const blendMode =
		typeof params.blendMode === "string" ? (params.blendMode as string) : "normal";

	const [opacityDraft, setOpacityDraft] = useState<number | null>(null);
	useEffect(() => {
		setOpacityDraft(null);
	}, [element?.id]);

	const patchParam = ({
		key,
		value,
		pushHistory,
	}: {
		key: string;
		value: unknown;
		pushHistory: boolean;
	}) => {
		if (!ref) return;
		editor.timeline.updateElements({
			updates: [
				{
					trackId: ref.trackId,
					elementId: ref.elementId,
					patch: { params: { ...params, [key]: value } },
				},
			],
			pushHistory,
		});
	};

	if (!ref || !element) {
		return (
			<PanelView title="Adjustments">
				<p className="text-muted-foreground text-xs leading-relaxed">
					Select a clip on the timeline to adjust it.
				</p>
			</PanelView>
		);
	}

	if (!hasOpacity) {
		return (
			<PanelView title="Adjustments">
				<p className="text-muted-foreground text-xs leading-relaxed">
					This clip has no visual adjustments. Select a video, image, text or
					sticker clip.
				</p>
			</PanelView>
		);
	}

	const opacityPercent = Math.round(
		(opacityDraft ?? opacity * 100) as number,
	);

	return (
		<PanelView title="Adjustments">
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between">
						<Label className="text-xs">Opacity</Label>
						<span className="text-muted-foreground text-xs tabular-nums">
							{opacityPercent}%
						</span>
					</div>
					<Slider
						value={[opacityDraft ?? opacity * 100]}
						min={0}
						max={100}
						step={1}
						onValueChange={(next) => setOpacityDraft(next[0] ?? 100)}
						onValueCommit={(next) => {
							const pct = next[0] ?? 100;
							patchParam({ key: "opacity", value: pct / 100, pushHistory: true });
							setOpacityDraft(null);
						}}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label className="text-xs">Blend mode</Label>
					<Select
						value={blendMode}
						onValueChange={(value) =>
							patchParam({ key: "blendMode", value, pushHistory: true })
						}
					>
						<SelectTrigger className="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{BLEND_MODES.map((mode) => (
								<SelectItem key={mode.value} value={mode.value}>
									{mode.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<p className="text-muted-foreground text-[11px] leading-relaxed">
					Color grading (brightness, contrast, saturation) is on the way with the
					next render-engine update.
				</p>
			</div>
		</PanelView>
	);
}
