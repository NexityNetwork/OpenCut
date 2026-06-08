"use client";

import { useEffect, useRef } from "react";
import { renderShaderFrame } from "./render";

// Live thumbnail for the picker. Drives the shared WebGL renderer on a rAF loop
// and blits each frame onto its own 2D canvas, so no extra GL contexts are
// created per tile.
export function ShaderPreview({
	shaderId,
	className,
}: {
	shaderId: string;
	className?: string;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Stable per-instance owner key for the renderer's frame cache.
		const owner = {};
		const start = performance.now();
		let raf = 0;
		let lastDraw = 0;

		const loop = (now: number) => {
			raf = requestAnimationFrame(loop);
			if (now - lastDraw < 1000 / 30) return; // cap at ~30fps
			lastDraw = now;

			const rect = canvas.getBoundingClientRect();
			const w = Math.max(1, Math.round(rect.width));
			const h = Math.max(1, Math.round(rect.height));
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}
			const frame = renderShaderFrame({
				owner,
				shaderId,
				timeSeconds: (now - start) / 1000,
				width: w,
				height: h,
			});
			if (frame) {
				ctx.clearRect(0, 0, w, h);
				ctx.drawImage(frame, 0, 0, w, h);
			}
		};
		raf = requestAnimationFrame(loop);

		return () => cancelAnimationFrame(raf);
	}, [shaderId]);

	return <canvas ref={canvasRef} className={className} aria-hidden />;
}
