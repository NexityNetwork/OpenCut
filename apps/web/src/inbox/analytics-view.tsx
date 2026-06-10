"use client";

// Analytics — a read-only dashboard over funnels, leads, contacts, broadcasts
// and the publish queue.

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/utils/ui";

type Cards = {
	published30: number;
	queued: number;
	totalLeads: number;
	dmsSent: number;
	qualified: number;
	repliedPublic: number;
	funnelMatches: number;
	contacts: number;
	reachable: number;
	broadcastsSent: number;
	replyRate: number;
	qualifyRate: number;
};
type FunnelRow = {
	id: string;
	name: string;
	match_count: number;
	lead_count: number;
	dms: number;
	qualified: number;
};
type Data = { cards: Cards; funnels: FunnelRow[]; series: { day: string; n: number }[] };

const DEMO: Data = {
	cards: {
		published30: 66, queued: 88, totalLeads: 214, dmsSent: 198, qualified: 41,
		repliedPublic: 205, funnelMatches: 214, contacts: 260, reachable: 38,
		broadcastsSent: 142, replyRate: 92, qualifyRate: 21,
	},
	funnels: [
		{ id: "1", name: "Lead magnet", match_count: 180, lead_count: 180, dms: 172, qualified: 33 },
		{ id: "2", name: "Book a call", match_count: 34, lead_count: 34, dms: 26, qualified: 8 },
	],
	series: Array.from({ length: 14 }, (_, i) => ({ day: `d${i}`, n: Math.floor(Math.random() * 6) })),
};

export function AnalyticsView({ owner, preview }: { owner: string; preview: boolean }) {
	const [data, setData] = useState<Data | null>(null);

	const load = useCallback(async () => {
		if (preview) {
			setData(DEMO);
			return;
		}
		try {
			const r = await fetch(`/api/publish/analytics?owner=${encodeURIComponent(owner)}`);
			const d = (await r.json().catch(() => null)) as Data | null;
			setData(d ?? { cards: {} as Cards, funnels: [], series: [] });
		} catch {
			setData({ cards: {} as Cards, funnels: [], series: [] });
		}
	}, [owner, preview]);

	useEffect(() => {
		void load();
	}, [load]);

	if (!data) {
		return (
			<div className="mx-auto max-w-4xl px-4 pt-6 sm:px-8">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					{Array.from({ length: 8 }).map((_, i) => (
						<div key={i} className="h-24 animate-pulse rounded-2xl bg-[var(--mono-hover)]" />
					))}
				</div>
			</div>
		);
	}

	const c = data.cards;
	const cards = [
		{ label: "Leads captured", value: c.totalLeads, sub: `${c.funnelMatches} keyword matches` },
		{ label: "DMs sent", value: c.dmsSent, sub: `${c.replyRate}% of leads` },
		{ label: "Qualified", value: c.qualified, sub: `${c.qualifyRate}% of DMs` },
		{ label: "Public replies", value: c.repliedPublic, sub: "auto-comments" },
		{ label: "Contacts", value: c.contacts, sub: `${c.reachable} reachable now` },
		{ label: "Broadcast sends", value: c.broadcastsSent, sub: "all time" },
		{ label: "Published (30d)", value: c.published30, sub: `${c.queued} queued` },
		{ label: "Reachable now", value: c.reachable, sub: "24h window" },
	];
	const maxN = Math.max(1, ...data.series.map((s) => s.n));

	return (
		<div className="mx-auto max-w-4xl px-4 pt-6 pb-16 sm:px-8">
			<h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
			<p className="mt-1 text-sm text-[var(--mono-ink-3)]">
				How your funnels, audience and publishing are performing.
			</p>

			<div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
				{cards.map((card) => (
					<div
						key={card.label}
						className="rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-4"
					>
						<div className="text-2xl font-semibold tracking-tight text-[var(--mono-ink)]">
							{card.value ?? 0}
						</div>
						<div className="mt-1 text-[12px] font-medium text-[var(--mono-ink-2)]">
							{card.label}
						</div>
						<div className="text-[11px] text-[var(--mono-ink-3)]">{card.sub}</div>
					</div>
				))}
			</div>

			{/* Publishing series */}
			<div className="mt-6 rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-5">
				<div className="mb-4 text-[13px] font-semibold text-[var(--mono-ink)]">
					Posts published · last 14 days
				</div>
				<div className="flex h-28 items-end gap-1.5">
					{data.series.length === 0 ? (
						<div className="flex h-full w-full items-center justify-center text-[13px] text-[var(--mono-ink-3)]">
							No publishing activity yet.
						</div>
					) : (
						data.series.map((s, i) => (
							<div
								key={i}
								className="flex-1 rounded-t bg-[var(--mono-strong)]"
								style={{ height: `${Math.max(6, (s.n / maxN) * 100)}%` }}
								title={`${s.day}: ${s.n}`}
							/>
						))
					)}
				</div>
			</div>

			{/* Funnel breakdown */}
			{data.funnels.length > 0 && (
				<div className="mt-6 overflow-hidden rounded-2xl border border-[var(--mono-line)]">
					<div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-[var(--mono-line)] bg-[var(--mono-panel)] px-4 py-2.5 text-[11px] font-semibold tracking-wide text-[var(--mono-ink-3)] uppercase">
						<span>Funnel</span>
						<span className="text-right">Matches</span>
						<span className="text-right">DMs</span>
						<span className="text-right">Qualified</span>
					</div>
					{data.funnels.map((f, i) => (
						<div
							key={f.id}
							className={cn(
								"grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3 text-sm",
								i > 0 && "border-t border-[var(--mono-line)]",
							)}
						>
							<span className="truncate font-medium text-[var(--mono-ink)]">{f.name}</span>
							<span className="text-right tabular-nums text-[var(--mono-ink-2)]">{f.match_count}</span>
							<span className="text-right tabular-nums text-[var(--mono-ink-2)]">{f.dms}</span>
							<span className="text-right tabular-nums text-emerald-500">{f.qualified}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
