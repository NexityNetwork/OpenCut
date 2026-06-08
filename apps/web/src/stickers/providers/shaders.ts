import { buildStickerId } from "../sticker-id";
import { SHADERS } from "@/shaders/registry";
import type {
	StickerBrowseResult,
	StickerItem,
	StickerProvider,
	StickerSearchResult,
} from "../types";

const SHADER_PROVIDER_ID = "shader";

function toStickerItem(shader: (typeof SHADERS)[number]): StickerItem {
	return {
		id: buildStickerId({
			providerId: SHADER_PROVIDER_ID,
			providerValue: shader.id,
		}),
		provider: SHADER_PROVIDER_ID,
		name: shader.title,
		// Rendered live by <ShaderPreview>; no static image URL.
		previewUrl: "",
		metadata: { width: 1920, height: 1080 },
	};
}

export const shaderProvider: StickerProvider = {
	id: SHADER_PROVIDER_ID,
	async search({ query, options }): Promise<StickerSearchResult> {
		const normalized = query.trim().toLowerCase();
		const filtered = normalized
			? SHADERS.filter((s) => s.title.toLowerCase().includes(normalized))
			: SHADERS;
		const limit = options?.limit ?? filtered.length;
		const paged = filtered.slice(0, limit);
		return {
			items: paged.map(toStickerItem),
			total: filtered.length,
			hasMore: paged.length < filtered.length,
		};
	},
	async browse({ options }): Promise<StickerBrowseResult> {
		const limit = options?.limit ?? SHADERS.length;
		const paged = SHADERS.slice(0, limit);
		return {
			sections: [
				{
					id: "all",
					items: paged.map(toStickerItem),
					hasMore: paged.length < SHADERS.length,
					layout: "grid",
				},
			],
		};
	},
	resolveUrl(): string {
		// Shaders have no image URL; they resolve through the WebGL renderer.
		return "";
	},
};
