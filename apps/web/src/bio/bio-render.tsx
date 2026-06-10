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
import { BIO_THEMES, type BioData, type BioLink, type BioSocial } from "./types";
import { BioLinkIcon } from "./bio-icons";

// Shuffle-in heading. Animates ONCE on mount; later text edits update the
// text directly (no re-shuffle while typing in the builder).
function ShuffleText({ text }: { text: string }) {
	const ref = useRef<HTMLSpanElement>(null);
	const played = useRef(false);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (played.current) {
			el.textContent = text;
			return;
		}
		played.current = true;
		const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%&@";
		const spans = text.split("");
		let frame = 0;
		const total = 16;
		const id = setInterval(() => {
			frame++;
			el.textContent = spans
				.map((c, i) => {
					if (c === " ") return " ";
					const reveal = (i / Math.max(1, spans.length)) * total + 4;
					return frame > reveal
						? c
						: chars[Math.floor(Math.random() * chars.length)];
				})
				.join("");
			if (frame > total + spans.length) {
				el.textContent = text;
				clearInterval(id);
			}
		}, 45);
		return () => clearInterval(id);
	}, [text]);
	return <span ref={ref}>{text}</span>;
}

export function socialIcon(platform: string, className: string) {
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

function youtubeId(url: string): string | null {
	const m = url.match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/);
	return m ? m[1] : null;
}

function EmailCapture({
	handle,
	theme,
	accent,
	label,
	preview,
}: {
	handle?: string;
	theme: (typeof BIO_THEMES)["warm"];
	accent: string;
	label: string;
	preview: boolean;
}) {
	const [email, setEmail] = useState("");
	const [state, setState] = useState<"idle" | "busy" | "done">("idle");
	const submit = async () => {
		if (preview || !handle || !email.trim() || state !== "idle") return;
		setState("busy");
		try {
			await fetch("/api/bio/lead", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ handle, email: email.trim() }),
			});
			setState("done");
		} catch {
			setState("idle");
		}
	};
	return (
		<div
			className="rounded-2xl p-4"
			style={{ background: theme.card, border: `1px solid ${theme.border}` }}
		>
			<div className="text-center text-sm font-medium">
				{label || "Join the list"}
			</div>
			{state === "done" ? (
				<div className="mt-3 text-center text-sm" style={{ color: theme.sub }}>
					You're in. ✓
				</div>
			) : (
				<div className="mt-3 flex gap-2">
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && submit()}
						placeholder="you@email.com"
						className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
						style={{
							background: theme.bg,
							color: theme.fg,
							border: `1px solid ${theme.border}`,
						}}
					/>
					<button
						type="button"
						onClick={submit}
						disabled={state !== "idle"}
						className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold"
						style={{ background: accent, color: "#1b1813" }}
					>
						{state === "busy" ? "…" : "Join"}
					</button>
				</div>
			)}
		</div>
	);
}

export function BioRender({
	data,
	preview = false,
	handle,
	embed = false,
}: {
	data: BioData;
	preview?: boolean;
	/** public handle — enables click-through analytics + email capture */
	handle?: string;
	/** chrome-less mode for website embeds */
	embed?: boolean;
}) {
	const t = BIO_THEMES[data.theme] ?? BIO_THEMES.warm;
	const [hover, setHover] = useState<string | null>(null);

	const bg =
		data.background === "grid"
			? `linear-gradient(${t.bg},${t.bg}), repeating-linear-gradient(0deg, ${t.border} 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, ${t.border} 0 1px, transparent 1px 40px)`
			: data.background === "glow"
				? `radial-gradient(120% 80% at 50% -10%, ${data.accent}33 0%, transparent 55%), ${t.bg}`
				: t.bg;

	const linkHref = (l: BioLink) =>
		!preview && handle
			? `/api/bio/click?h=${encodeURIComponent(handle)}&l=${encodeURIComponent(l.id)}`
			: normalizeUrl(l.url);

	const blocks = data.links.filter((l) => !l.hidden);

	return (
		<div
			className={
				embed
					? "flex w-full flex-col items-center px-4 py-6"
					: "flex min-h-full w-full flex-col items-center px-5 py-12"
			}
			style={{ background: bg, color: t.fg }}
		>
			<div className="flex w-full max-w-md flex-1 flex-col items-center">
				{!embed && (
					<>
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
							<p className="mt-1.5 text-center text-sm" style={{ color: t.sub }}>
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
					</>
				)}

				<div className={embed ? "flex w-full flex-col gap-3" : "mt-7 flex w-full flex-col gap-3"}>
					{blocks.map((l) => {
						const kind = l.kind ?? "link";
						if (kind === "header") {
							return (
								<div
									key={l.id}
									className="mt-3 text-center text-[13px] font-semibold tracking-wide uppercase"
									style={{ color: t.sub }}
								>
									{l.label}
								</div>
							);
						}
						if (kind === "youtube") {
							const vid = youtubeId(l.url);
							return (
								<div
									key={l.id}
									className="overflow-hidden rounded-2xl"
									style={{ border: `1px solid ${t.border}` }}
								>
									{vid ? (
										<iframe
											src={`https://www.youtube-nocookie.com/embed/${vid}`}
											title={l.label || "Video"}
											className="aspect-video w-full"
											allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
											allowFullScreen
										/>
									) : (
										<div
											className="flex aspect-video w-full items-center justify-center text-sm"
											style={{ background: t.card, color: t.sub }}
										>
											Add a YouTube link
										</div>
									)}
								</div>
							);
						}
						if (kind === "image") {
							return (
								<div
									key={l.id}
									className="overflow-hidden rounded-2xl"
									style={{ border: `1px solid ${t.border}` }}
								>
									{l.url ? (
										// eslint-disable-next-line @next/next/no-img-element
										<img src={l.url} alt={l.label} className="w-full" />
									) : (
										<div
											className="flex h-32 w-full items-center justify-center text-sm"
											style={{ background: t.card, color: t.sub }}
										>
											Add an image
										</div>
									)}
									{l.label && (
										<div
											className="px-3 py-2 text-center text-sm"
											style={{ background: t.card }}
										>
											{l.label}
										</div>
									)}
								</div>
							);
						}
						if (kind === "email") {
							return (
								<EmailCapture
									key={l.id}
									handle={handle}
									theme={t}
									accent={data.accent}
									label={l.label}
									preview={preview}
								/>
							);
						}
						if (!l.label.trim()) return null;
						return (
							<a
								key={l.id}
								href={linkHref(l)}
								target="_blank"
								rel="noopener noreferrer"
								onMouseEnter={() => setHover(l.id)}
								onMouseLeave={() => setHover(null)}
								onClick={(e) => preview && !l.url && e.preventDefault()}
								className="group flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[15px] font-medium transition-all"
								style={{
									background: hover === l.id ? data.accent : t.card,
									color: hover === l.id ? "#1b1813" : t.fg,
									border: `1px solid ${hover === l.id ? data.accent : t.border}`,
									transform: hover === l.id ? "translateY(-1px)" : "none",
								}}
							>
								<span className="flex w-5 items-center justify-center">
									<BioLinkIcon icon={l.icon} />
								</span>
								<span className="flex-1 text-center">{l.label}</span>
								<ArrowUpRight className="size-4 opacity-50" />
							</a>
						);
					})}
				</div>

				<div className="flex-1" />
				{!embed && (
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
				)}
			</div>
		</div>
	);
}
