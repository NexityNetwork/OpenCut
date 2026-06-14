"use client";

// Lazy first-frame preview for videos with no poster. Only mounts the <video>
// (which triggers a metadata fetch + decode) once it's near the viewport, so a
// gallery of 100+ clips doesn't decode them all at once. Shared by the Library
// grid and the Studio reference picker so they look identical.

import { useEffect, useRef, useState } from "react";
import { Video as VideoIcon } from "lucide-react";

export function useInView<T extends Element>(rootMargin = "300px") {
	const ref = useRef<T | null>(null);
	const [inView, setInView] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const io = new IntersectionObserver(
			(entries) => {
				const e = entries[0];
				if (e) setInView(e.isIntersecting);
			},
			{ rootMargin },
		);
		io.observe(el);
		return () => io.disconnect();
	}, [rootMargin]);
	return { ref, inView };
}

export function VideoThumb({
	src,
	className,
}: {
	src: string;
	className?: string;
}) {
	const { ref, inView } = useInView<HTMLDivElement>();
	return (
		<div ref={ref} className="absolute inset-0">
			{inView ? (
				// biome-ignore lint/a11y/useMediaCaption: thumbnail preview only
				<video
					src={`${src}#t=0.1`}
					preload="metadata"
					muted
					playsInline
					className={className}
				/>
			) : (
				<div className="bg-muted text-muted-foreground flex size-full items-center justify-center">
					<VideoIcon className="size-9" />
				</div>
			)}
		</div>
	);
}
