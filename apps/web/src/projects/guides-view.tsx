"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, ScrollText, X } from "lucide-react";
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

// Inline markdown: **bold** and `code`.
function inline(text: string): ReactNode[] {
	const out: ReactNode[] = [];
	const re = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
	let last = 0;
	let k = 0;
	let m: RegExpExecArray | null;
	// biome-ignore lint/suspicious/noAssignInExpressions: regex scan loop
	while ((m = re.exec(text)) !== null) {
		if (m.index > last) out.push(text.slice(last, m.index));
		if (m[2] !== undefined)
			out.push(
				<strong key={k++} className="font-semibold text-[var(--mono-ink)]">
					{m[2]}
				</strong>,
			);
		else if (m[3] !== undefined)
			out.push(
				<code key={k++} className="rounded bg-black/30 px-1 py-0.5 text-[13px] text-[var(--mono-ink)]">
					{m[3]}
				</code>,
			);
		last = m.index + m[0].length;
	}
	if (last < text.length) out.push(text.slice(last));
	return out;
}

// Render a body (light markdown subset: "## "/"### " headings, "- " bullets,
// ``` fenced code) into readable elements — no markdown dependency.
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
					className="my-4 overflow-auto rounded-lg border border-[var(--mono-line)] bg-black/30 p-3.5 text-[12.5px] leading-relaxed whitespace-pre-wrap text-[var(--mono-ink-2)]"
				>
					{code.join("\n")}
				</pre>,
			);
			continue;
		}
		if (ln.startsWith("## ")) {
			blocks.push(
				<h2 key={key++} className="mt-8 mb-2.5 text-[18px] font-semibold text-[var(--mono-ink)]">
					{inline(ln.slice(3).trim())}
				</h2>,
			);
			i++;
			continue;
		}
		if (ln.startsWith("### ")) {
			blocks.push(
				<h3 key={key++} className="mt-5 mb-1.5 text-[15px] font-semibold text-[var(--mono-ink)]">
					{inline(ln.slice(4).trim())}
				</h3>,
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
				<ul key={key++} className="my-3 list-disc space-y-1.5 pl-5">
					{items.map((it, n) => (
						<li key={n}>{inline(it)}</li>
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
			<p key={key++} className="my-3 leading-[1.7]">
				{inline(para.join(" "))}
			</p>,
		);
	}
	return <div className="text-[15px] text-[var(--mono-ink-2)]">{blocks}</div>;
}

function excerpt(body: string, max = 190): string {
	for (const ln of body.split("\n")) {
		const t = ln.trim().replace(/^\*\*|\*\*$/g, "");
		if (t && !t.startsWith("#") && !t.startsWith("-") && !t.startsWith("```")) {
			return t.length > max ? `${t.slice(0, max).trimEnd()}...` : t;
		}
	}
	return "";
}

// Owner-only reader for the imported guides. Read the full guide, then approve
// which ones to keep before they move into the main resources page.
export function GuidesView() {
	const [guides, setGuides] = useState<Guide[] | null>(null);
	const [topic, setTopic] = useState<string>("all");
	const [busyId, setBusyId] = useState<string | null>(null);
	const [openId, setOpenId] = useState<string | null>(null);

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

	const open = openId ? all.find((g) => g.id === openId) : null;

	// ---- Reader (full single-scroll guide) ----
	if (open) {
		return (
			<div className="mx-auto w-full max-w-3xl px-5 py-8">
				<button
					type="button"
					onClick={() => setOpenId(null)}
					className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-[var(--mono-ink-2)] transition-colors hover:text-[var(--mono-ink)]"
				>
					<ArrowLeft className="size-4" /> All guides
				</button>
				<div className="mb-2.5 flex flex-wrap items-center gap-2">
					<span className="rounded-full bg-[#E8896B]/[0.12] px-2.5 py-1 text-xs font-semibold text-[#E8896B] capitalize">
						{open.topic}
					</span>
					{open.status !== "draft" && (
						<span
							className={cn(
								"rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
								open.status === "approved"
									? "bg-green-500/15 text-green-600"
									: "bg-[var(--mono-hover)] text-[var(--mono-ink-3)]",
							)}
						>
							{open.status}
						</span>
					)}
				</div>
				<h1 className="mb-5 text-[26px] font-semibold leading-tight text-[var(--mono-ink)]">
					{open.title}
				</h1>

				<article className="border-t border-[var(--mono-line)] pt-5">
					<GuideBody body={open.body} />
				</article>

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
						{open.status === "approved" ? "Approved" : "Approve"}
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
						{open.status === "rejected" ? "Rejected" : "Reject"}
					</button>
					<span className="ml-auto text-[11px] text-[var(--mono-ink-3)]">
						{open.body.length.toLocaleString()} chars
					</span>
				</div>
			</div>
		);
	}

	// ---- List ----
	return (
		<div className="mx-auto w-full max-w-3xl px-5 py-8">
			<div className="mb-1 flex items-center gap-2.5">
				<ScrollText className="size-6 text-[var(--mono-ink)]" />
				<h1 className="text-xl font-semibold text-[var(--mono-ink)]">Guides</h1>
			</div>
			<p className="mb-5 max-w-xl text-sm text-[var(--mono-ink-3)]">
				{all.length} Ultron playbooks. Open one to read the full guide, and approve
				the ones worth publishing to the main resources page.
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
				<div className="space-y-3">
					{shown.map((g) => (
						<button
							key={g.id}
							type="button"
							onClick={() => setOpenId(g.id)}
							className={cn(
								"block w-full rounded-2xl border bg-[var(--mono-panel)] p-5 text-left transition-colors hover:border-[var(--mono-strong)]",
								g.status === "approved"
									? "border-green-500/40"
									: g.status === "rejected"
										? "border-[var(--mono-line)] opacity-50"
										: "border-[var(--mono-line)]",
							)}
						>
							<div className="mb-2 flex flex-wrap items-center gap-2">
								<span className="rounded-full bg-[#E8896B]/[0.12] px-2.5 py-1 text-xs font-semibold text-[#E8896B] capitalize">
									{g.topic}
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
								<span className="ml-auto text-[11px] text-[var(--mono-ink-3)]">
									{g.body.length.toLocaleString()} chars
								</span>
							</div>
							<h2 className="mb-1.5 text-[17px] font-semibold leading-snug text-[var(--mono-ink)]">
								{g.title}
							</h2>
							<p className="line-clamp-2 text-[13.5px] leading-relaxed text-[var(--mono-ink-3)]">
								{excerpt(g.body)}
							</p>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
