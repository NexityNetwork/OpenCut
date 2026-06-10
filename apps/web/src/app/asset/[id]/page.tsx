"use client";

import dynamic from "next/dynamic";
import { use } from "react";

// The per-asset page is client-only (browser storage + WASM media pipeline),
// same as /projects and /editor. Disable SSR.
const AssetApp = dynamic(() => import("./asset-app"), {
	ssr: false,
	loading: () => null,
});

export default function AssetRoute({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = use(params);
	return <AssetApp id={id} />;
}
