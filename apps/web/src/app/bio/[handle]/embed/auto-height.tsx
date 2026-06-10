"use client";

import { useEffect } from "react";

// Reports the document height to the parent page so embed.js can size the
// iframe to fit (no inner scrollbars).

export function EmbedAutoHeight() {
	useEffect(() => {
		const post = () => {
			window.parent?.postMessage(
				{ type: "monolith-bio-height", height: document.body.scrollHeight },
				"*",
			);
		};
		post();
		const ro = new ResizeObserver(post);
		ro.observe(document.body);
		return () => ro.disconnect();
	}, []);
	return null;
}
