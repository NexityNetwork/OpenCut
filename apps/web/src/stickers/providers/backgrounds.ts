import { buildStickerId, parseStickerId } from "../sticker-id";
import type {
	StickerBrowseResult,
	StickerItem,
	StickerProvider,
	StickerSearchResult,
} from "../types";

// Static mesh-gradient backgrounds (image stickers), from Pixel-Perfect's
// "backgrounds" set. Plain images, so they flow through the normal sticker
// image path — no renderer changes needed.

const BACKGROUNDS_PROVIDER_ID = "backgrounds";

type BackgroundDefinition = { key: string; name: string };

const BACKGROUNDS: BackgroundDefinition[] = [
	{ key: "gradient-1", name: "Subpixel" },
	{ key: "gradient-2", name: "Hot Pixel" },
	{ key: "gradient-3", name: "Full Spectrum" },
	{ key: "gradient-4", name: "Vector Tide" },
	{ key: "gradient-5", name: "Dark Mode" },
	{ key: "gradient-6", name: "Anti-Alias" },
	{ key: "gradient-7", name: "Frame Buffer" },
	{ key: "gradient-8", name: "Hue Shift" },
	{ key: "gradient-9", name: "Wireframe" },
];

function urlFromKey(key: string): string {
	return `/bg-gradient/${key}.jpg`;
}

function toStickerItem(background: BackgroundDefinition): StickerItem {
	return {
		id: buildStickerId({
			providerId: BACKGROUNDS_PROVIDER_ID,
			providerValue: background.key,
		}),
		provider: BACKGROUNDS_PROVIDER_ID,
		name: background.name,
		previewUrl: urlFromKey(background.key),
		metadata: { width: 1920, height: 1080 },
	};
}

export const backgroundsProvider: StickerProvider = {
	id: BACKGROUNDS_PROVIDER_ID,
	async search({ query, options }): Promise<StickerSearchResult> {
		const normalized = query.trim().toLowerCase();
		const filtered = normalized
			? BACKGROUNDS.filter((b) => b.name.toLowerCase().includes(normalized))
			: BACKGROUNDS;
		const limit = options?.limit ?? filtered.length;
		const paged = filtered.slice(0, limit);
		return {
			items: paged.map(toStickerItem),
			total: filtered.length,
			hasMore: paged.length < filtered.length,
		};
	},
	async browse({ options }): Promise<StickerBrowseResult> {
		const limit = options?.limit ?? BACKGROUNDS.length;
		const paged = BACKGROUNDS.slice(0, limit);
		return {
			sections: [
				{
					id: "all",
					items: paged.map(toStickerItem),
					hasMore: paged.length < BACKGROUNDS.length,
					layout: "grid",
				},
			],
		};
	},
	resolveUrl({ stickerId }): string {
		const { providerValue } = parseStickerId({ stickerId });
		return urlFromKey(providerValue);
	},
};
