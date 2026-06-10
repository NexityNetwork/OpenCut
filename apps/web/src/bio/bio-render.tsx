"use client";

// The actual link-in-bio page UI — shared by the builder's live preview and
// the public /bio/[handle] route. Pure presentational; no app deps.

import { useEffect, useRef, useState } from "react";
import {
	SiYoutube,
	SiInstagram,
	SiTiktok,
	SiX,
	SiGithub,
} from "react-icons/si";
import { Globe, Mail, ArrowUpRight, Linkedin } from "lucide-react";
import { BIO_THEMES, type BioData, type BioSocial } from "./types";

// Dependency-free shuffle-in heading (lifted in spirit from the linktree
// template's ShuffleText, reimplemented without gsap).
function ShuffleText({ text }: { text: string }) {
	const ref = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@";
		const final = text;
		const spans = final.split("");
		let frame = 0;
		const total = 16;
		const id = setInterval(() => {
			frame++;
			el.textContent = spans
				.map((c, i) => {
					if (c === " ") return " ";
					const reveal = (i / spans.length) * total + 4;
					return frame > reveal
						? c
						: chars[Math.floor(Math.random() * chars.length)];
				})
				.join("");
			if (frame > total + spans.length) {
				el.textContent = final;
				clearInterval(id);
			}
		}, 45);
		return () => clearInterval(id);
	}, [text]);
	return <span ref={ref}>{text}</span>;
}

function socialIcon(platform: string, className: string) {
	const k = platform.toLowerCase();
	if (k.includes("you")) return <SiYoutube className={className} />;
	if (k.includes("insta")) return <SiInstagram className={className} />;
	if (k.includes("tik")) return <SiTiktok className={className} />;
	if (k === "x" || k.includes("twitter")) return <SiX className={className} />;
	if (k.includes("linked")) return <Linkedin className={className} />;
	if (k.includes("git")) return <SiGithub className={className} />;
	if (k.includes("mail") || k.includes("email"))
		return <Mail className={className} />;
	return <Globe className={className} />;
}

function normalizeUrl(url: string, platform?: string) {
	const u = url.trim();
	if (!u) return "#";
	if (platform === "email" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(u))
		return u.startsWith("mailto:") ? u : `mailto:${u}`;
	if (/^https?:\/\//i.test(u)) return u;
	return `https://${u}`;
}

export function BioRender({
	data,
	preview = false,
}: {
	data: BioData;
	preview?: boolean;
}) {
	const t = BIO_THEMES[data.theme] ?? BIO_THEMES.warm;
	const [hover, setHover] = useState<string | null>(null);

	const bg =
		data.background === "grid"
			? `linear-gradient(${t.bg},${t.bg}), repeating-linear-gradient(0deg, ${t.border} 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, ${t.border} 0 1px, transparent 1px 40px)`
			: data.background === "glow"
				? `radial-gradient(120% 80% at 50% -10%, ${data.accent}33 0%, transparent 55%), ${t.bg}`
				: t.bg;

	return (
		<div
			className="flex min-h-full w-full flex-col items-center px-5 py-12"
			style={{ background: bg, color: t.fg }}
		>
			<div className="flex w-full max-w-md flex-1 flex-col items-center">
				<div
					className="flex size-20 items-center justify-center overflow-hidden rounded-full text-2xl font-bold"
					style={{
						background: data.avatarUrl ? "transparent" : data.accent,
						color: "#1b1813",
						boxShadow: `0 0 0 4px ${t.bg}, 0 0 0 5px ${t.border}`,
					}}
				>
					{data.avatarUrl ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={data.avatarUrl}
							alt={data.displayName}
							className="size-full object-cover"
						/>
					) : (
						(data.displayName || "?").slice(0, 1).toUpperCase()
					)}
				</div>

				<h1 className="mt-4 text-center text-2xl font-bold tracking-tight">
					<ShuffleText text={data.displayName || "Your name"} />
				</h1>
				{data.tagline && (
					<p
						className="mt-1.5 text-center text-sm"
						style={{ color: t.sub }}
					>
						{data.tagline}
					</p>
				)}

				{data.socials.length > 0 && (
					<div className="mt-5 flex flex-wrap items-center justify-center gap-2">
						{data.socials.map((s: BioSocial) => (
							<a
								key={s.id}
								href={normalizeUrl(s.url, s.platform)}
								target="_blank"
								rel="noopener noreferrer"
								className="flex size-9 items-center justify-center rounded-full transition-transform hover:scale-110"
								style={{ background: t.card, border: `1px solid ${t.border}` }}
								aria-label={s.platform}
							>
								{socialIcon(s.platform, "size-4")}
							</a>
						))}
					</div>
				)}

				<div className="mt-7 flex w-full flex-col gap-3">
					{data.links
						.filter((l) => l.label.trim())
						.map((l) => (
							<a
								key={l.id}
								href={normalizeUrl(l.url)}
								target="_blank"
								rel="noopener noreferrer"
								onMouseEnter={() => setHover(l.id)}
								onMouseLeave={() => setHover(null)}
								className="group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px] font-medium transition-all"
								style={{
									background: hover === l.id ? data.accent : t.card,
									color: hover === l.id ? "#1b1813" : t.fg,
									border: `1px solid ${hover === l.id ? data.accent : t.border}`,
									transform: hover === l.id ? "translateY(-1px)" : "none",
								}}
							>
								{l.icon && <span className="text-base">{l.icon}</span>}
								<span className="flex-1 text-center">{l.label}</span>
								<ArrowUpRight className="size-4 opacity-50" />
							</a>
						))}
				</div>

				<div className="flex-1" />
				<a
					href="https://edits.51ultron.com"
					target="_blank"
					rel="noopener noreferrer"
					className="mt-10 text-[11px] tracking-wide opacity-50 transition-opacity hover:opacity-80"
					style={{ color: t.sub }}
					onClick={(e) => preview && e.preventDefault()}
				>
					Made with Ultron Monolith
				</a>
			</div>
		</div>
	);
}
