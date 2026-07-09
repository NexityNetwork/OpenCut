"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Clapperboard, Loader2, X } from "lucide-react";
import { cn } from "@/utils/ui";

type Status = "draft" | "approved" | "rejected";
type TEl = { label: string; startSec: number; endSec: number };
type TTrack = { kind: "text" | "audio" | "video"; name: string; elements: TEl[] };
type TDoc = {
	name: string;
	durationSec: number;
	source?: string;
	aspect?: string;
	tracks: TTrack[];
};
type Template = {
	id: string;
	slug: string;
	name: string;
	durationSec: number;
	source: string;
	status: Status;
	doc: TDoc;
};

const pct = (v: number, dur: number) =>
	`${Math.max(0, Math.min(100, (v / (dur || 1)) * 100))}%`;

// Lane colors mirror the reference editor: purple text, magenta audio, slate clips.
const KIND: Record<TTrack["kind"], string> = {
	text: "bg-[#7c5cff] text-white",
	audio: "bg-[#ec2b9b] text-white",
	video: "bg-[var(--mono-active)] text-[var(--mono-ink-2)] border border-[var(--mono-line)]",
};

function fmt(s: number) {
	return Number.isInteger(s) ? `${s}s` : `${s.toFixed(1)}s`;
}

function Timeline({ doc, compact }: { doc: TDoc; compact?: boolean }) {
	const dur = doc.durationSec || 1;
	const step = dur <= 10 ? 1 : dur <= 24 ? 2 : 5;
	const ticks = useMemo(() => {
		const out: number[] = [];
		for (let t = 0; t <= dur + 0.001; t += step) out.push(Math.round(t));
		return out;
	}, [dur, step]);
	const laneH = compact ? 16 : 34;
	const labelW = compact ? 0 : 60;

	return (
		<div className="w-full">
			{!compact && (
				<div
					className="relative mb-1 h-4 text-[10px] text-[var(--mono-ink-3)]"
					style={{ marginLeft: labelW }}
				>
					{ticks.map((t) => (
						<span
							key={t}
							className="absolute -translate-x-1/2 tabular-nums"
							style={{ left: pct(t, dur) }}
						>
							{t}s
						</span>
					))}
				</div>
			)}
			<div className={compact ? "space-y-[3px]" : "space-y-1.5"}>
				{doc.tracks.map((tr, i) => (
					<div key={i} className="flex items-stretch gap-2">
						{!compact && (
							<div className="flex w-[60px] shrink-0 items-center text-[11px] text-[var(--mono-ink-3)]">
								<span className="truncate">{tr.name}</span>
							</div>
						)}
						<div
							className="relative flex-1 overflow-hidden rounded-md bg-[var(--mono-panel)]"
							style={{ height: laneH }}
						>
							{!compact &&
								ticks.map((t) => (
									<div
										key={t}
										className="absolute top-0 bottom-0 w-px bg-[var(--mono-line)]/50"
										style={{ left: pct(t, dur) }}
									/>
								))}
							{tr.elements.map((el, j) => (
								<div
									key={j}
									title={`${el.label}  (${fmt(el.startSec)}–${fmt(el.endSec)})`}
									className={cn(
										"absolute top-[2px] bottom-[2px] flex items-center overflow-hidden rounded",
										compact ? "px-1" : "px-1.5",
										KIND[tr.kind],
									)}
									style={{
										left: pct(el.startSec, dur),
										width: `calc(${pct(el.endSec - el.startSec, dur)} - 2px)`,
									}}
								>
									{!compact && (
										<span className="truncate text-[10px] font-medium leading-none">
											{el.label}
										</span>
									)}
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

export function TemplatesView() {
	const [items, setItems] = useState<Template[] | null>(null);
	const [openId, setOpenId] = useState<string | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);

	useEffect(() => {
		fetch("/api/templates")
			.then((r) => (r.ok ? r.json() : { templates: [] }))
			.then((d) => setItems(d.templates ?? []))
			.catch(() => setItems([]));
	}, []);

	const setStatus = async (id: string, status: Status) => {
		setBusyId(id);
		try {
			const r = await fetch("/api/templates", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ id, status }),
			});
			if (!r.ok) throw new Error("failed");
			setItems((prev) =>
				(prev ?? []).map((t) => (t.id === id ? { ...t, status } : t)),
			);
		} catch {
			toast.error("Could not update");
		} finally {
			setBusyId(null);
		}
	};

	const all = items ?? [];
	const open = openId ? all.find((t) => t.id === openId) : null;

	// ---- Detail: full timeline + exact segment times ----
	if (open) {
		return (
			<div className="mx-auto w-full max-w-4xl px-5 py-8">
				<button
					type="button"
					onClick={() => setOpenId(null)}
					className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-[var(--mono-ink-2)] transition-colors hover:text-[var(--mono-ink)]"
				>
					<ArrowLeft className="size-4" /> All templates
				</button>
				<div className="mb-1 flex flex-wrap items-center gap-2">
					<span className="rounded-full bg-[#7c5cff]/[0.15] px-2.5 py-1 text-xs font-semibold text-[#a48bff]">
						{open.durationSec}s
					</span>
					{open.doc.aspect && (
						<span className="rounded-full bg-[var(--mono-hover)] px-2.5 py-1 text-xs font-medium text-[var(--mono-ink-3)]">
							{open.doc.aspect}
						</span>
					)}
					<span className="text-[11px] text-[var(--mono-ink-3)]">
						{open.source}
					</span>
				</div>
				<h1 className="mb-5 text-[22px] font-semibold leading-tight text-[var(--mono-ink)]">
					{open.name}
				</h1>

				<div className="rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-bg)] p-4">
					<Timeline doc={open.doc} />
				</div>

				<div className="mt-6 space-y-4">
					{open.doc.tracks.map((tr, i) => (
						<div key={i}>
							<div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]">
								{tr.name} · {tr.kind}
							</div>
							<div className="space-y-1">
								{tr.elements.map((el, j) => (
									<div
										key={j}
										className="flex items-center gap-3 rounded-lg border border-[var(--mono-line)] bg-[var(--mono-panel)] px-3 py-1.5 text-[13px]"
									>
										<span className="w-24 shrink-0 tabular-nums text-[var(--mono-ink-3)]">
											{fmt(el.startSec)} – {fmt(el.endSec)}
										</span>
										<span className="w-14 shrink-0 tabular-nums text-[11px] text-[var(--mono-ink-3)]">
											{(el.endSec - el.startSec).toFixed(1)}s
										</span>
										<span className="truncate text-[var(--mono-ink-2)]">
											{el.label}
										</span>
									</div>
								))}
							</div>
						</div>
					))}
				</div>

				<div className="mt-8 flex items-center gap-2 border-t border-[var(--mono-line)] pt-4">
					<button
						type="button"
						disabled={busyId === open.id}
						onClick={() =>
							setStatus(open.id, open.status === "approved" ? "draft" : "approved")
						}
						className={cn(
							"inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
							open.status === "approved"
								? "bg-green-500/15 text-green-600"
								: "bg-[var(--mono-hover)] text-[var(--mono-ink-2)] hover:text-[var(--mono-ink)]",
						)}
					>
						<Check className="size-3.5" />
						{open.status === "approved" ? "Aligned" : "Mark aligned"}
					</button>
					<button
						type="button"
						disabled={busyId === open.id}
						onClick={() =>
							setStatus(open.id, open.status === "rejected" ? "draft" : "rejected")
						}
						className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--mono-ink-3)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
					>
						<X className="size-3.5" />
						{open.status === "rejected" ? "Off" : "Needs work"}
					</button>
				</div>
			</div>
		);
	}

	// ---- List ----
	return (
		<div className="mx-auto w-full max-w-4xl px-5 py-8">
			<div className="mb-1 flex items-center gap-2.5">
				<Clapperboard className="size-6 text-[var(--mono-ink)]" />
				<h1 className="text-xl font-semibold text-[var(--mono-ink)]">Templates</h1>
			</div>
			<p className="mb-5 max-w-xl text-sm text-[var(--mono-ink-3)]">
				Reference reel timelines, transcribed track-for-track. Open one to check
				the layers and exact cut times, then mark it aligned. Pure structure — no
				assets or editing yet.
			</p>

			{items === null ? (
				<div className="py-16 text-center text-[var(--mono-ink-3)]">
					<Loader2 className="mx-auto size-5 animate-spin" />
				</div>
			) : all.length === 0 ? (
				<div className="rounded-xl border border-dashed border-[var(--mono-line)] py-12 text-center text-sm text-[var(--mono-ink-3)]">
					No templates yet.
				</div>
			) : (
				<div className="space-y-3">
					{all.map((t) => (
						<button
							key={t.id}
							type="button"
							onClick={() => setOpenId(t.id)}
							className={cn(
								"block w-full rounded-2xl border bg-[var(--mono-panel)] p-4 text-left transition-colors hover:border-[var(--mono-strong)]",
								t.status === "approved"
									? "border-green-500/40"
									: t.status === "rejected"
										? "border-[var(--mono-line)] opacity-50"
										: "border-[var(--mono-line)]",
							)}
						>
							<div className="mb-2.5 flex flex-wrap items-center gap-2">
								<span className="rounded-full bg-[#7c5cff]/[0.15] px-2.5 py-1 text-xs font-semibold text-[#a48bff]">
									{t.durationSec}s
								</span>
								<h2 className="text-[15px] font-semibold text-[var(--mono-ink)]">
									{t.name}
								</h2>
								{t.status !== "draft" && (
									<span
										className={cn(
											"rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
											t.status === "approved"
												? "bg-green-500/15 text-green-600"
												: "bg-[var(--mono-hover)] text-[var(--mono-ink-3)]",
										)}
									>
										{t.status === "approved" ? "aligned" : t.status}
									</span>
								)}
								<span className="ml-auto text-[11px] text-[var(--mono-ink-3)]">
									{t.doc.tracks.length} lanes ·{" "}
									{t.doc.tracks.reduce((n, tr) => n + tr.elements.length, 0)} clips
								</span>
							</div>
							<Timeline doc={t.doc} compact />
						</button>
					))}
				</div>
			)}
		</div>
	);
}
