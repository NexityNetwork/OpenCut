import { buildStickerId, parseStickerId } from "../sticker-id";
import { lottieUrlFromKey } from "@/lottie/render";
import type {
	StickerBrowseResult,
	StickerItem,
	StickerProvider,
	StickerSearchResult,
} from "../types";

const LOTTIE_PROVIDER_ID = "lottie";
const MANIFEST_URL = "/lottie/manifest.json";

type LottieManifestItem = {
	key: string;
	name: string;
	w: number;
	h: number;
	set?: string;
};

let manifestCache: Promise<LottieManifestItem[]> | null = null;

function loadManifest(): Promise<LottieManifestItem[]> {
	if (!manifestCache) {
		manifestCache = fetch(MANIFEST_URL)
			.then((response) => (response.ok ? response.json() : { items: [] }))
			.then((data) => (Array.isArray(data?.items) ? data.items : []))
			.catch(() => []);
	}
	return manifestCache;
}

function toStickerItem(item: LottieManifestItem): StickerItem {
	return {
		id: buildStickerId({
			providerId: LOTTIE_PROVIDER_ID,
			providerValue: item.key,
		}),
		provider: LOTTIE_PROVIDER_ID,
		name: item.name,
		previewUrl: lottieUrlFromKey(item.key),
		metadata: { width: item.w, height: item.h },
	};
}

export const lottieProvider: StickerProvider = {
	id: LOTTIE_PROVIDER_ID,
	async search({
		query,
		options,
	}): Promise<StickerSearchResult> {
		const normalized = query.trim().toLowerCase();
		const items = await loadManifest();
		const filtered = normalized
			? items.filter((item) => item.name.toLowerCase().includes(normalized))
			: items;
		const limit = options?.limit ?? filtered.length;
		const paged = filtered.slice(0, limit);
		return {
			items: paged.map(toStickerItem),
			total: filtered.length,
			hasMore: paged.length < filtered.length,
		};
	},
	async browse({ options }): Promise<StickerBrowseResult> {
		const items = await loadManifest();
		const limit = options?.limit ?? items.length;
		const paged = items.slice(0, limit);
		return {
			sections: [
				{
					id: "all",
					items: paged.map(toStickerItem),
					hasMore: paged.length < items.length,
					layout: "grid",
				},
			],
		};
	},
	resolveUrl({ stickerId }): string {
		const { providerValue } = parseStickerId({ stickerId });
		return lottieUrlFromKey(providerValue);
	},
};
