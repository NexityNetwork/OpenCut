"use client";

// Interactive Text Particle — text rendered as a field of gradient particles
// that scatter away from the cursor and spring back. Pure <canvas>.
// Adapted from NexityNetwork/assets-claude animations/interactive-text-particle:
// sized to its container (ResizeObserver) instead of the window, default
// cursor kept, and SSR-safe.

import React, { useEffect, useRef, useState } from "react";

interface Pointer {
	x?: number;
	y?: number;
}

interface TextBox {
	str: string;
	x?: number;
	y?: number;
	w?: number;
	h?: number;
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
	or: number;
	cr: number;
	f: number;
	rgb: number[];

	constructor(x: number, y: number, rgb: number[], force: number) {
		const rand = (max = 1, min = 0) => min + Math.random() * (max - min);
		this.ox = x;
		this.oy = y;
		this.cx = x;
		this.cy = y;
		this.or = rand(2.4, 0.8);
		this.cr = this.or;
		this.f = rand(force + 15, force - 15);
		this.rgb = rgb.map((c) => Math.max(0, c + rand(13, -13)));
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
			const restore = Math.min(od * 0.1, 3);
			this.cx += (odx / od) * restore;
			this.cy += (ody / od) * restore;
		}

		ctx.fillStyle = `rgb(${this.rgb.join(",")})`;
		ctx.beginPath();
		ctx.arc(this.cx, this.cy, this.cr, 0, 2 * Math.PI);
		ctx.fill();
	}
}

export function ParticleTextEffect({
	text = "HOVER!",
	colors = [
		"f1ebdc",
		"e3d6b8",
		"d9b98a",
		"d49a6a",
		"c7c0ae",
		"a89f87",
		"8b8676",
	],
	className = "",
	animationForce = 60,
	particleDensity = 3,
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
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		canvas.width = size.width;
		canvas.height = size.height;

		// Draw the gradient text once, sample it into particles.
		const box: TextBox = { str: text };
		const fitToWidth = Math.floor((size.width / text.length) * 1.7);
		box.h = Math.min(Math.floor(size.height * 0.72), fitToWidth);
		radiusRef.current = Math.max(50, box.h * 1.4);
		ctx.font = `900 ${box.h}px Inter, Verdana, sans-serif`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		box.w = Math.round(ctx.measureText(box.str).width);
		box.x = Math.max(0, 0.5 * (size.width - box.w));
		box.y = Math.max(0, 0.5 * (size.height - box.h));

		const gradient = ctx.createLinearGradient(
			box.x,
			box.y,
			box.x + box.w,
			box.y + box.h,
		);
		const N = Math.max(1, colors.length - 1);
		colors.forEach((c, i) => gradient.addColorStop(i / N, `#${c}`));
		ctx.fillStyle = gradient;
		ctx.fillText(box.str, 0.5 * size.width, 0.5 * size.height);

		const w = Math.min(box.w, size.width);
		const data = ctx.getImageData(box.x, box.y, w, box.h).data;
		const parts: Particle[] = [];
		for (let i = 0; i < data.length; i += 4) {
			const px = (i / 4) % w;
			const py = Math.floor(i / 4 / w);
			if (!data[i + 3] || px % particleDensity || py % particleDensity) continue;
			parts.push(
				new Particle(
					box.x + px,
					box.y + py,
					[data[i], data[i + 1], data[i + 2]],
					animationForce,
				),
			);
		}
		particlesRef.current = parts;

		const animate = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			for (const p of particlesRef.current) {
				p.move(ctx, pointerRef.current, hasPointerRef.current, radiusRef.current);
			}
			rafRef.current = requestAnimationFrame(animate);
		};
		ctx.clearRect(0, 0, canvas.width, canvas.height);
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
