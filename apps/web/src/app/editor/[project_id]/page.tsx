"use client";

import dynamic from "next/dynamic";

// The editor is a fully client-side app (browser storage, WASM, WebCodecs,
// AI models). Disable SSR so none of that loads on the Cloudflare Worker.
// editor-router picks desktop (./editor-app, untouched) vs mobile.
const EditorRouter = dynamic(() => import("./editor-router"), {
	ssr: false,
	loading: () => null,
});

export default function EditorPage() {
	return <EditorRouter />;
}
