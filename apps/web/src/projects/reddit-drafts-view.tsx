"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import { SiReddit } from "react-icons/si";
import { cn } from "@/utils/ui";

type DraftStatus = "draft" | "approved" | "rejected";
type Draft = {
	id: string;
	subreddit: string;
	title: string;
	body: string;
	keyword: string | null;
	status: DraftStatus;
};

const FILTERS = ["all", "draft", "approved", "rejected"] as const;
type Filter = (typeof FILTERS)[number];

// Owner-only review surface for the drafted Reddit text posts. Read + approve;
// approved ones get loaded into the publish queue on a slow schedule.
export function RedditDraftsView() {
	const [drafts, setDrafts] = useState<Draft[] | null>(null);
	const [filter, setFilter] = useState<Filter>("all");
	const [busyId, setBusyId] = useState<string | null>(null);

	useEffect(() => {
		fetch("/api/reddit-drafts")
			.then((r) => (r.ok ? r.json() : { drafts: [] }))
			.then((d) => setDrafts(d.drafts ?? []))
			.catch(() => setDrafts([]));
	}, []);

	const setStatus = async (id: string, status: DraftStatus) => {
		setBusyId(id);
		try {
			const r = await fetch("/api/reddit-drafts", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ id, status }),
			});
			if (!r.ok) throw new Error("failed");
			setDrafts((prev) =>
				(prev ?? []).map((d) => (d.id === id ? { ...d, status } : d)),
			);
		} catch {
			toast.error("Could not update");
		} finally {
			setBusyId(null);
		}
	};

	const all = drafts ?? [];
	const shown = all.filter((d) => filter === "all" || d.status === filter);
	const counts: Record<Filter, number> = {
		all: all.length,
		draft: all.filter((d) => d.status === "draft").length,
		approved: all.filter((d) => d.status === "approved").length,
		rejected: all.filter((d) => d.status === "rejected").length,
	};

	return (
		<div className="mx-auto w-full max-w-3xl px-5 py-8">
			<div className="mb-1 flex items-center gap-2.5">
				<SiReddit style={{ color: "#FF4500" }} className="size-6" />
				<h1 className="text-xl font-semibold text-[var(--mono-ink)]">
					Reddit posts
				</h1>
			</div>
			<p className="mb-5 max-w-xl text-sm text-[var(--mono-ink-3)]">
				Private draft review. Text-only posts for the 51ultron account. Approve
				the ones you want and I will schedule them slowly, one at a time.
			</p>

			<div className="mb-5 flex flex-wrap gap-1.5">
				{FILTERS.map((f) => (
					<button
						key={f}
						type="button"
						onClick={() => setFilter(f)}
						className={cn(
							"rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
							filter === f
								? "border-[var(--mono-strong)] bg-[var(--mono-active)] text-[var(--mono-ink)]"
								: "border-[var(--mono-line)] text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)]",
						)}
					>
						{f} {counts[f]}
					</button>
				))}
			</div>

			{drafts === null ? (
				<div className="py-16 text-center text-[var(--mono-ink-3)]">
					<Loader2 className="mx-auto size-5 animate-spin" />
				</div>
			) : shown.length === 0 ? (
				<div className="rounded-xl border border-dashed border-[var(--mono-line)] py-12 text-center text-sm text-[var(--mono-ink-3)]">
					No posts here yet.
				</div>
			) : (
				<div className="space-y-4">
					{shown.map((d) => (
						<article
							key={d.id}
							className={cn(
								"rounded-2xl border bg-[var(--mono-panel)] p-5 transition-colors",
								d.status === "approved"
									? "border-green-500/40"
									: d.status === "rejected"
										? "border-[var(--mono-line)] opacity-50"
										: "border-[var(--mono-line)]",
							)}
						>
							<div className="mb-2.5 flex flex-wrap items-center gap-2">
								<span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF4500]/10 px-2.5 py-1 text-xs font-semibold text-[#FF4500]">
									<SiReddit className="size-3.5" /> r/{d.subreddit}
								</span>
								{d.keyword && (
									<span className="rounded-full border border-[var(--mono-line)] px-2.5 py-1 text-[11px] text-[var(--mono-ink-3)]">
										{d.keyword}
									</span>
								)}
								{d.status !== "draft" && (
									<span
										className={cn(
											"rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
											d.status === "approved"
												? "bg-green-500/15 text-green-600"
												: "bg-[var(--mono-hover)] text-[var(--mono-ink-3)]",
										)}
									>
										{d.status}
									</span>
								)}
							</div>
							<h2 className="mb-2.5 text-[17px] font-semibold leading-snug text-[var(--mono-ink)]">
								{d.title}
							</h2>
							<p className="whitespace-pre-wrap text-[14px] leading-relaxed text-[var(--mono-ink-2)]">
								{d.body}
							</p>
							<div className="mt-4 flex items-center gap-2 border-t border-[var(--mono-line)] pt-3">
								<button
									type="button"
									disabled={busyId === d.id}
									onClick={() =>
										setStatus(d.id, d.status === "approved" ? "draft" : "approved")
									}
									className={cn(
										"inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
										d.status === "approved"
											? "bg-green-500/15 text-green-600"
											: "bg-[var(--mono-hover)] text-[var(--mono-ink-2)] hover:text-[var(--mono-ink)]",
									)}
								>
									<Check className="size-3.5" />
									{d.status === "approved" ? "Approved" : "Approve"}
								</button>
								<button
									type="button"
									disabled={busyId === d.id}
									onClick={() =>
										setStatus(d.id, d.status === "rejected" ? "draft" : "rejected")
									}
									className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--mono-ink-3)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
								>
									<X className="size-3.5" />
									{d.status === "rejected" ? "Rejected" : "Reject"}
								</button>
								<span className="ml-auto text-[11px] text-[var(--mono-ink-3)]">
									{d.body.length} chars
								</span>
							</div>
						</article>
					))}
				</div>
			)}
		</div>
	);
}
