"use client";

// Picks the editor experience based on the device. Desktop renders the
// original ./editor-app untouched; phones/narrow viewports get ./mobile-editor.

import { useEffect, useState } from "react";
import DesktopEditor from "./editor-app";
import MobileEditor from "./mobile-editor";

export default function EditorRouter() {
	const [isMobile, setIsMobile] = useState<boolean | null>(null);

	useEffect(() => {
		const touch =
			typeof navigator !== "undefined" &&
			/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
		setIsMobile(window.innerWidth < 1024 || touch);
	}, []);

	if (isMobile === null) return null;
	return isMobile ? <MobileEditor /> : <DesktopEditor />;
}
