"use client";

import { useEffect, useRef } from "react";
import lottie, { type AnimationItem } from "lottie-web";

// Animated thumbnail for the sticker picker (autoplay loop, SVG renderer for
// crisp small previews). One per visible grid cell.
export function LottiePreview({
	url,
	className,
}: {
	url: string;
	className?: string;
}) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = ref.current;
		if (!container) return;
		let anim: AnimationItem | null = null;
		let cancelled = false;

		fetch(url)
			.then((response) => response.json())
			.then((animationData) => {
				if (cancelled || !ref.current) return;
				anim = lottie.loadAnimation({
					container: ref.current,
					renderer: "svg",
					loop: true,
					autoplay: true,
					animationData,
				});
			})
			.catch(() => {});

		return () => {
			cancelled = true;
			anim?.destroy();
		};
	}, [url]);

	return <div ref={ref} className={className} aria-hidden />;
}
