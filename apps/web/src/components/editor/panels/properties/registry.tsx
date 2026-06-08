import type { ReactNode } from "react";
import type {
	EffectElement,
	GraphicElement,
	ImageElement,
	MaskableElement,
	StickerElement,
	TextElement,
	VisualElement,
	VideoElement,
	AudioElement,
	TimelineElement,
} from "@/timeline";
import type { MediaAsset } from "@/media/types";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowExpandIcon, MagicWand05Icon } from "@hugeicons/core-free-icons";
import { ElementParamsTab } from "./components/element-params-tab";
import { StandaloneEffectTab } from "@/effects/components/effects-tab";
import { MasksTab } from "@/masks/components/masks-tab";
import { GraphicTab } from "@/graphics/components/graphic-tab";

const TRANSFORM_PARAM_KEYS = [
	"transform.positionX",
	"transform.positionY",
	"transform.scaleX",
	"transform.scaleY",
	"transform.rotate",
] as const;

const BLENDING_PARAM_KEYS = ["opacity", "blendMode"] as const;
const AUDIO_PARAM_KEYS = ["volume", "muted"] as const;
const TEXT_PARAM_KEYS = [
	"content",
	"fontFamily",
	"fontSize",
	"color",
	"textAlign",
	"fontWeight",
	"fontStyle",
	"textDecoration",
	"letterSpacing",
	"lineHeight",
	"background.enabled",
	"background.color",
	"background.cornerRadius",
	"background.paddingX",
	"background.paddingY",
	"background.offsetX",
	"background.offsetY",
] as const;

export type TabContentProps = {
	trackId: string;
};

export type PropertiesTabDef = {
	id: string;
	label: string;
	icon: ReactNode;
	content: (props: TabContentProps) => ReactNode;
};

export type ElementPropertiesConfig = {
	defaultTab: string;
	tabs: PropertiesTabDef[];
};

// Everything now lives in a single "Properties" panel — no sub-tab rail, no
// effects/masks/speed clutter. Each type stacks its relevant param sections.
function singleTab(
	render: (props: TabContentProps) => ReactNode,
): ElementPropertiesConfig {
	return {
		defaultTab: "properties",
		tabs: [
			{
				id: "properties",
				label: "Properties",
				icon: <HugeiconsIcon icon={ArrowExpandIcon} size={16} />,
				content: render,
			},
		],
	};
}

function transformSection(element: VisualElement, trackId: string) {
	return (
		<ElementParamsTab
			element={element}
			trackId={trackId}
			paramKeys={TRANSFORM_PARAM_KEYS}
			sectionKey="transform"
		/>
	);
}

function blendingSection(element: VisualElement, trackId: string) {
	return (
		<ElementParamsTab
			element={element}
			trackId={trackId}
			paramKeys={BLENDING_PARAM_KEYS}
			sectionKey="blending"
		/>
	);
}

function audioSection(element: AudioElement | VideoElement, trackId: string) {
	return (
		<ElementParamsTab
			element={element}
			trackId={trackId}
			paramKeys={AUDIO_PARAM_KEYS}
			sectionKey="audio"
		/>
	);
}

function masksSection(element: MaskableElement, trackId: string) {
	return <MasksTab element={element} trackId={trackId} />;
}

export function getPropertiesConfig({
	element,
	mediaAssets,
}: {
	element: TimelineElement;
	mediaAssets: MediaAsset[];
}): ElementPropertiesConfig {
	switch (element.type) {
		case "text": {
			const el = element as TextElement;
			return singleTab(({ trackId }) => (
				<>
					<ElementParamsTab
						element={el}
						trackId={trackId}
						paramKeys={TEXT_PARAM_KEYS}
						sectionKey="text"
					/>
					{transformSection(el, trackId)}
					{blendingSection(el, trackId)}
				</>
			));
		}
		case "video": {
			const el = element as VideoElement;
			const mediaAsset = mediaAssets.find((a) => a.id === el.mediaId);
			const showAudio = mediaAsset?.hasAudio !== false;
			return singleTab(({ trackId }) => (
				<>
					{transformSection(el, trackId)}
					{showAudio ? audioSection(el, trackId) : null}
					{blendingSection(el, trackId)}
					{masksSection(el, trackId)}
				</>
			));
		}
		case "image": {
			const el = element as ImageElement;
			return singleTab(({ trackId }) => (
				<>
					{transformSection(el, trackId)}
					{blendingSection(el, trackId)}
					{masksSection(el, trackId)}
				</>
			));
		}
		case "sticker": {
			const el = element as StickerElement;
			return singleTab(({ trackId }) => (
				<>
					{transformSection(el, trackId)}
					{blendingSection(el, trackId)}
				</>
			));
		}
		case "graphic": {
			const el = element as GraphicElement;
			return singleTab(({ trackId }) => (
				<>
					<GraphicTab element={el} trackId={trackId} />
					{transformSection(el, trackId)}
					{blendingSection(el, trackId)}
					{masksSection(el, trackId)}
				</>
			));
		}
		case "audio": {
			const el = element as AudioElement;
			return singleTab(({ trackId }) => audioSection(el, trackId));
		}
		case "effect": {
			const el = element as EffectElement;
			return {
				defaultTab: "effect",
				tabs: [
					{
						id: "effect",
						label: "Effect",
						icon: <HugeiconsIcon icon={MagicWand05Icon} size={16} />,
						content: ({ trackId }) => (
							<StandaloneEffectTab element={el} trackId={trackId} />
						),
					},
				],
			};
		}
	}
}
