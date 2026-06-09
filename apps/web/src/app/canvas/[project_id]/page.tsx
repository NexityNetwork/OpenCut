"use client";

import dynamic from "next/dynamic";

// Canvas (static multi-page design editor) is fully client-side, same as the
// video editor: browser storage + WASM renderer. No SSR on the Worker.
const CanvasApp = dynamic(() => import("./canvas-app"), {
	ssr: false,
	loading: () => null,
});

export default function CanvasPage() {
	return <CanvasApp />;
}
