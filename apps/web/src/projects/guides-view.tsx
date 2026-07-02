"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Check, Loader2, ScrollText, X } from "lucide-react";
import { cn } from "@/utils/ui";

type Status = "draft" | "approved" | "rejected";
type Guide = {
	id: string;
	slug: string;
	title: string;
	topic: string;
	tool: string;
	source: string;
	body: string;
	status: Status;
};

// Render a cleaned guide body (a light markdown subset: "## "/"### " headings,
// "- " bullets, ``` fenced code) into readable elements — no markdown dep.
function GuideBody({ body }: { body: string }) {
	const blocks: ReactNode[] = [];
	const lines = body.split("\n");
	let i = 0;
	let key = 0;
	while (i < lines.length) {
		const ln = lines[i];
		if (ln.trim().startsWith("```")) {
			const code: string[] = [];
			i++;
			while (i < lines.length && !lines[i].trim().startsWith("```")) {
				code.push(lines[i]);
				i++;
			}
			i++;
			blocks.push(
				<pre
					key={key++}
					className="my-3 overflow-auto rounded-lg border border-[var(--mono-line)] bg-black/30 p-3 text-[12.5px] whitespace-pre-wrap text-[var(--mono-ink-2)]"
				>
					{code.join("\n")}
				</pre>,
			);
			continue;
		}
		if (ln.startsWith("## ")) {
			blocks.push(
				<h3 key={key++} className="mt-5 mb-1.5 text-[15px] font-semibold text-[var(--mono-ink)]">
					{ln.slice(3).trim()}
				</h3>,
			);
			i++;
			continue;
		}
		if (ln.startsWith("### ")) {
			blocks.push(
				<h4 key={key++} className="mt-4 mb-1 text-[13.5px] font-semibold text-[var(--mono-ink)]">
					{ln.slice(4).trim()}
				</h4>,
			);
			i++;
			continue;
		}
		if (ln.startsWith("- ")) {
			const items: string[] = [];
			while (i < lines.length && lines[i].startsWith("- ")) {
				items.push(lines[i].slice(2).trim());
				i++;
			}
			blocks.push(
				<ul key={key++} className="my-2 list-disc space-y-1 pl-5">
					{items.map((it, n) => (
						<li key={n}>{it}</li>
					))}
				</ul>,
			);
			continue;
		}
		if (ln.trim() === "") {
			i++;
			continue;
		}
		const para: string[] = [];
		while (
			i < lines.length &&
			lines[i].trim() &&
			!lines[i].startsWith("## ") &&
			!lines[i].startsWith("### ") &&
			!lines[i].startsWith("- ") &&
			!lines[i].trim().startsWith("```")
		) {
			para.push(lines[i]);
			i++;
		}
		blocks.push(
			<p key={key++} className="my-2 leading-relaxed">
				{para.join(" ")}
			</p>,
		);
	}
	return <div className="text-[14px] text-[var(--mono-ink-2)]">{blocks}</div>;
}

// Owner-only reader for the imported Cindy Zhu guides. Read + approve which ones
// to keep before they move into the main resources page.
export function GuidesView() {
	const [guides, setGuides] = useState<Guide[] | null>(null);
	const [topic, setTopic] = useState<string>("all");
	const [busyId, setBusyId] = useState<string | null>(null);

	useEffect(() => {
		fetch("/api/guides")
			.then((r) => (r.ok ? r.json() : { guides: [] }))
			.then((d) => setGuides(d.guides ?? []))
			.catch(() => setGuides([]));
	}, []);

	const setStatus = async (id: string, status: Status) => {
		setBusyId(id);
		try {
			const r = await fetch("/api/guides", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ id, status }),
			});
			if (!r.ok) throw new Error("failed");
			setGuides((prev) =>
				(prev ?? []).map((g) => (g.id === id ? { ...g, status } : g)),
			);
		} catch {
			toast.error("Could not update");
		} finally {
			setBusyId(null);
		}
	};

	const all = guides ?? [];
	const topics = useMemo(() => {
		const c: Record<string, number> = {};
		for (const g of all) c[g.topic] = (c[g.topic] || 0) + 1;
		return ["all", ...Object.keys(c).sort((a, b) => c[b] - c[a])];
	}, [all]);
	const shown = all.filter((g) => topic === "all" || g.topic === topic);
	const count = (t: string) =>
		t === "all" ? all.length : all.filter((g) => g.topic === t).length;

	return (
		<div className="mx-auto w-full max-w-3xl px-5 py-8">
			<div className="mb-1 flex items-center gap-2.5">
				<ScrollText className="size-6 text-[var(--mono-ink)]" />
				<h1 className="text-xl font-semibold text-[var(--mono-ink)]">
					Cindy Guides
				</h1>
			</div>
			<p className="mb-5 max-w-xl text-sm text-[var(--mono-ink-3)]">
				{all.length} guides pulled from cindyzhu.com.au, cleaned and
				emoji-stripped. Read them here and approve the ones worth keeping before
				they move into the main resources page.
			</p>

			<div className="mb-5 flex flex-wrap gap-1.5">
				{topics.map((t) => (
					<button
						key={t}
						type="button"
						onClick={() => setTopic(t)}
						className={cn(
							"rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
							topic === t
								? "border-[var(--mono-strong)] bg-[var(--mono-active)] text-[var(--mono-ink)]"
								: "border-[var(--mono-line)] text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)]",
						)}
					>
						{t} {count(t)}
					</button>
				))}
			</div>

			{guides === null ? (
				<div className="py-16 text-center text-[var(--mono-ink-3)]">
					<Loader2 className="mx-auto size-5 animate-spin" />
				</div>
			) : shown.length === 0 ? (
				<div className="rounded-xl border border-dashed border-[var(--mono-line)] py-12 text-center text-sm text-[var(--mono-ink-3)]">
					No guides here yet.
				</div>
			) : (
				<div className="space-y-4">
					{shown.map((g) => (
						<article
							key={g.id}
							className={cn(
								"rounded-2xl border bg-[var(--mono-panel)] p-5 transition-colors",
								g.status === "approved"
									? "border-green-500/40"
									: g.status === "rejected"
										? "border-[var(--mono-line)] opacity-50"
										: "border-[var(--mono-line)]",
							)}
						>
							<div className="mb-2.5 flex flex-wrap items-center gap-2">
								<span className="rounded-full bg-[#E8896B]/[0.12] px-2.5 py-1 text-xs font-semibold text-[#E8896B] capitalize">
									{g.topic}
								</span>
								<span className="rounded-full border border-[var(--mono-line)] px-2.5 py-1 text-[11px] text-[var(--mono-ink-3)] capitalize">
									{g.tool}
								</span>
								{g.status !== "draft" && (
									<span
										className={cn(
											"rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
											g.status === "approved"
												? "bg-green-500/15 text-green-600"
												: "bg-[var(--mono-hover)] text-[var(--mono-ink-3)]",
										)}
									>
										{g.status}
									</span>
								)}
							</div>
							<h2 className="mb-2.5 text-[17px] font-semibold leading-snug text-[var(--mono-ink)]">
								{g.title}
							</h2>
							<GuideBody body={g.body} />
							<div className="mt-4 flex items-center gap-2 border-t border-[var(--mono-line)] pt-3">
								<button
									type="button"
									disabled={busyId === g.id}
									onClick={() =>
										setStatus(g.id, g.status === "approved" ? "draft" : "approved")
									}
									className={cn(
										"inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
										g.status === "approved"
											? "bg-green-500/15 text-green-600"
											: "bg-[var(--mono-hover)] text-[var(--mono-ink-2)] hover:text-[var(--mono-ink)]",
									)}
								>
									<Check className="size-3.5" />
									{g.status === "approved" ? "Approved" : "Approve"}
								</button>
								<button
									type="button"
									disabled={busyId === g.id}
									onClick={() =>
										setStatus(g.id, g.status === "rejected" ? "draft" : "rejected")
									}
									className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--mono-ink-3)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
								>
									<X className="size-3.5" />
									{g.status === "rejected" ? "Rejected" : "Reject"}
								</button>
								<a
									href={g.source.startsWith("http") ? g.source : `https://${g.source}`}
									target="_blank"
									rel="noreferrer"
									className="ml-auto text-[11px] text-[var(--mono-ink-3)] transition-colors hover:text-[var(--mono-ink)]"
								>
									{g.body.length.toLocaleString()} chars · source
								</a>
							</div>
						</article>
					))}
				</div>
			)}
		</div>
	);
}
