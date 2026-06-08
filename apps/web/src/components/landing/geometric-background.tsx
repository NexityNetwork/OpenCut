"use client";

// Adapted from NexityNetwork/assets-claude → animations/geometric-background.tsx.
// Base recolored to the footer grayish (#141413); drifting shapes neutralized to
// soft white so the hero reads grayish to match the footer.

import React from "react";
import { motion } from "motion/react";

function cn(...classes: Array<string | false | null | undefined>) {
	return classes.filter(Boolean).join(" ");
}

const BG = "#141413";

function ElegantShape({
	className,
	delay = 0,
	width = 400,
	height = 100,
	rotate = 0,
	gradient = "from-white/[0.12]",
}: {
	className?: string;
	delay?: number;
	width?: number;
	height?: number;
	rotate?: number;
	gradient?: string;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: -150, rotate: rotate - 15 }}
			animate={{ opacity: 1, y: 0, rotate }}
			transition={{
				duration: 2.4,
				delay,
				ease: [0.23, 0.86, 0.39, 0.96],
				opacity: { duration: 1.2 },
			}}
			className={cn("absolute", className)}
		>
			<motion.div
				animate={{ y: [0, 15, 0] }}
				transition={{
					duration: 12,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
				}}
				style={{
					width: `min(${width}px, 60vw)`,
					height: `min(${height}px, 14vw)`,
				}}
				className="relative"
			>
				<div
					className={cn(
						"absolute inset-0 rounded-full",
						"bg-gradient-to-r to-transparent",
						gradient,
						"backdrop-blur-[2px] border-2 border-white/[0.12]",
						"shadow-[0_8px_32px_0_rgba(255,255,255,0.08)]",
						"after:absolute after:inset-0 after:rounded-full",
						"after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.15),transparent_70%)]",
					)}
				/>
			</motion.div>
		</motion.div>
	);
}

export default function GeometricBackground({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn("relative w-full overflow-hidden", className)}
			style={{ backgroundColor: BG }}
		>
			<div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-white/[0.03] blur-3xl" />

			<div className="absolute inset-0 overflow-hidden">
				<ElegantShape
					delay={0.3}
					width={600}
					height={140}
					rotate={12}
					gradient="from-white/[0.14]"
					className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
				/>
				<ElegantShape
					delay={0.5}
					width={500}
					height={120}
					rotate={-15}
					gradient="from-white/[0.12]"
					className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
				/>
				<ElegantShape
					delay={0.4}
					width={300}
					height={80}
					rotate={-8}
					gradient="from-white/[0.10]"
					className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
				/>
				<ElegantShape
					delay={0.6}
					width={200}
					height={60}
					rotate={20}
					gradient="from-white/[0.12]"
					className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
				/>
				<ElegantShape
					delay={0.7}
					width={150}
					height={40}
					rotate={-25}
					gradient="from-white/[0.10]"
					className="left-[20%] md:left-[25%] top-[5%] md:top-[10%]"
				/>
			</div>

			{children}

			<div
				className="pointer-events-none absolute inset-0"
				style={{
					background: `linear-gradient(to top, ${BG} 0%, transparent 50%, ${BG}cc 100%)`,
				}}
			/>
		</div>
	);
}
