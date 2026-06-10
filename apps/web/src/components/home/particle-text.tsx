"use client";

// Interactive Text Particle — text rendered as a field of gradient particles
// that scatter away from the cursor and spring back. Pure <canvas>.
// Adapted from NexityNetwork/assets-claude animations/interactive-text-particle:
// sized to its container (ResizeObserver), rendered at devicePixelRatio for
// crisp text, default cursor kept, SSR-safe.

import React, { useEffect, useRef, useState } from "react";

interface Pointer {
	x?: number;
	y?: number;
}

export interface ParticleTextEffectProps {
	text?: string;
	colors?: string[];
	className?: string;
	animationForce?: number;
	particleDensity?: number;
}

class Particle {
	ox: number;
	oy: number;
	cx: number;
	cy: number;
	cr: number;
	f: number;
	fill: string;

	constructor(x: number, y: number, rgb: number[], force: number, dpr: number) {
		const rand = (max = 1, min = 0) => min + Math.random() * (max - min);
		this.ox = x;
		this.oy = y;
		this.cx = x;
		this.cy = y;
		this.cr = rand(1.7, 1.05) * dpr;
		this.f = rand(force + 15, force - 15);
		const jitter = rgb.map((c) =>
			Math.min(255, Math.max(0, c + rand(10, -10))),
		);
		this.fill = `rgb(${jitter.join(",")})`;
	}

	move(
		ctx: CanvasRenderingContext2D,
		pointer: Pointer,
		hasPointer: boolean,
		interactionRadius: number,
	) {
		if (hasPointer && pointer.x !== undefined && pointer.y !== undefined) {
			const dx = this.cx - pointer.x;
			const dy = this.cy - pointer.y;
			const dist = Math.hypot(dx, dy);
			if (dist < interactionRadius && dist > 0) {
				const force = Math.min(this.f, ((interactionRadius - dist) / dist) * 2);
				this.cx += (dx / dist) * force;
				this.cy += (dy / dist) * force;
			}
		}

		const odx = this.ox - this.cx;
		const ody = this.oy - this.cy;
		const od = Math.hypot(odx, ody);
		if (od > 1) {
			const restore = Math.min(od * 0.1, 4);
			this.cx += (odx / od) * restore;
			this.cy += (ody / od) * restore;
		}

		ctx.fillStyle = this.fill;
		ctx.beginPath();
		ctx.arc(this.cx, this.cy, this.cr, 0, 2 * Math.PI);
		ctx.fill();
	}
}

export function ParticleTextEffect({
	text = "HOVER!",
	colors = ["f5efe0", "ead9b5", "ddb586", "d49a6a", "cdc6b4"],
	className = "",
	animationForce = 60,
	particleDensity = 2,
}: ParticleTextEffectProps) {
	const wrapRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const particlesRef = useRef<Particle[]>([]);
	const pointerRef = useRef<Pointer>({});
	const hasPointerRef = useRef(false);
	const radiusRef = useRef(80);
	const rafRef = useRef<number | null>(null);
	const [size, setSize] = useState({ width: 0, height: 0 });

	useEffect(() => {
		const el = wrapRef.current;
		if (!el) return;
		const update = () => {
			const r = el.getBoundingClientRect();
			setSize({ width: Math.round(r.width), height: Math.round(r.height) });
		};
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || size.width === 0 || size.height === 0) return;
		const ctx = canvas.getContext("2d", { willReadFrequently: true });
		if (!ctx) return;

		const dpr = Math.min(
			typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
			2,
		);
		const W = Math.round(size.width * dpr);
		const H = Math.round(size.height * dpr);
		canvas.width = W;
		canvas.height = H;

		// Draw the gradient text once at device resolution, sample to particles.
		const fitToWidth = Math.floor((W / text.length) * 1.78);
		const fontPx = Math.min(Math.floor(H * 0.74), fitToWidth);
		radiusRef.current = Math.max(50, fontPx * 1.3);
		ctx.font = `900 ${fontPx}px Inter, Verdana, sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		const textW = Math.min(Math.round(ctx.measureText(text).width), W);
		const x0 = Math.max(0, Math.round(0.5 * (W - textW)));
		const y0 = Math.max(0, Math.round(0.5 * (H - fontPx)));

		const gradient = ctx.createLinearGradient(x0, y0, x0 + textW, y0 + fontPx);
		const N = Math.max(1, colors.length - 1);
		colors.forEach((c, i) => gradient.addColorStop(i / N, `#${c}`));
		ctx.fillStyle = gradient;
		ctx.fillText(text, 0.5 * W, 0.5 * H);

		const step = Math.max(1, Math.round(particleDensity * dpr * 0.75));
		const data = ctx.getImageData(x0, y0, textW, fontPx).data;
		const parts: Particle[] = [];
		for (let i = 0; i < data.length; i += 4) {
			const px = (i / 4) % textW;
			const py = Math.floor(i / 4 / textW);
			if (data[i + 3] < 128 || px % step || py % step) continue;
			parts.push(
				new Particle(
					x0 + px,
					y0 + py,
					[data[i], data[i + 1], data[i + 2]],
					animationForce,
					dpr,
				),
			);
		}
		particlesRef.current = parts;

		const animate = () => {
			ctx.clearRect(0, 0, W, H);
			for (const p of particlesRef.current) {
				p.move(ctx, pointerRef.current, hasPointerRef.current, radiusRef.current);
			}
			rafRef.current = requestAnimationFrame(animate);
		};
		ctx.clearRect(0, 0, W, H);
		animate();

		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		};
	}, [text, colors, animationForce, particleDensity, size]);

	const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		pointerRef.current.x = (e.clientX - rect.left) * (canvas.width / rect.width);
		pointerRef.current.y = (e.clientY - rect.top) * (canvas.height / rect.height);
		hasPointerRef.current = true;
	};

	return (
		<div ref={wrapRef} className={className}>
			<canvas
				ref={canvasRef}
				className="size-full"
				onPointerMove={onPointerMove}
				onPointerEnter={() => {
					hasPointerRef.current = true;
				}}
				onPointerLeave={() => {
					hasPointerRef.current = false;
					pointerRef.current.x = undefined;
					pointerRef.current.y = undefined;
				}}
			/>
		</div>
	);
}
