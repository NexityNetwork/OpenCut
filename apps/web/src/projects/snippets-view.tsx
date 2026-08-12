"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Loader2, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/utils/ui";

// One view for every short-text list we keep - hooks today, captions today,
// whatever gets added later. The bucket is a prop and the rows come out of D1,
// so a new list is a new nav entry and a new list of ROWS is nothing at all.

export type Snippet = {
	id: string;
	bucket: string;
	ref: string;
	text: string;
	kind: string;
	source: string;
	deck: string;
	note: string;
	status: string;
	sortOrder: number;
	createdAt: number;
};

function bold(line: string) {
	return line
		.split(/(\*\*[^*]+\*\*)/g)
		.filter(Boolean)
		.map((part, j) =>
			part.startsWith("**") && part.endsWith("**") ? (
				<strong key={j} className="font-semibold">
					{part.slice(2, -2)}
				</strong>
			) : (
				<span key={j}>{part}</span>
			),
		);
}

// TWO SHAPES OF TEXT, TWO WAYS TO SET THEM.
//
// A hook is short and its `|` is a line break, the same mark the decks use, so
// what is stored goes onto a frame with no translation.
//
// A caption is PARAGRAPHS, and its breaks are real newlines. Running it through
// the hook renderer collapsed every one of them and printed the whole thing as
// one grey wall - the structure was in the data the whole time, the view was
// throwing it away. Blank lines separate paragraphs; single newlines are kept.
function Rendered({ text, mode }: { text: string; mode: "hook" | "prose" }) {
	if (mode === "hook") {
		return (
			<>
				{text.split("|").map((line, i) => (
					<span key={i} className="block">
						{bold(line)}
					</span>
				))}
			</>
		);
	}
	return (
		<>
			{text
				.split(/\n{2,}/)
				.map((para) => para.trim())
				.filter(Boolean)
				.map((para, i) => (
					<p key={i} className="mb-3 whitespace-pre-wrap last:mb-0">
						{bold(para)}
					</p>
				))}
		</>
	);
}

export function SnippetsView({
	bucket,
	title,
	blurb,
	placeholder,
	mode = "hook",
}: {
	bucket: string;
	title: string;
	blurb: string;
	placeholder: string;
	mode?: "hook" | "prose";
}) {
	const [rows, setRows] = useState<Snippet[]>([]);
	const [loading, setLoading] = useState(true);
	const [q, setQ] = useState("");
	const [kind, setKind] = useState("");
	const [adding, setAdding] = useState(false);
	const [draft, setDraft] = useState("");
	const [draftKind, setDraftKind] = useState("");
	const [draftSource, setDraftSource] = useState("");
	const [copied, setCopied] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const r = await fetch(`/api/snippets?bucket=${encodeURIComponent(bucket)}`);
			const j = (await r.json()) as { snippets?: Snippet[] };
			setRows(j.snippets || []);
		} catch {
			toast.error("could not load");
		} finally {
			setLoading(false);
		}
	}, [bucket]);

	useEffect(() => {
		void load();
	}, [load]);

	const kinds = useMemo(() => {
		const m = new Map<string, number>();
		for (const r of rows) if (r.kind) m.set(r.kind, (m.get(r.kind) || 0) + 1);
		return [...m.entries()].sort((a, b) => b[1] - a[1]);
	}, [rows]);

	const shown = useMemo(() => {
		const needle = q.trim().toLowerCase();
		return rows.filter(
			(r) =>
				(!kind || r.kind === kind) &&
				(!needle ||
					r.text.toLowerCase().includes(needle) ||
					r.source.toLowerCase().includes(needle) ||
					r.note.toLowerCase().includes(needle)),
		);
	}, [rows, q, kind]);

	async function add() {
		const text = draft.trim();
		if (!text) return;
		// A blank line separates ENTRIES in the hook book, the same rule the dumps
		// arrive under. A caption is full of blank lines, so there `---` on its
		// own line is the separator and blanks stay inside the caption.
		const blocks = (
			mode === "hook" ? text.split(/\n{2,}/) : text.split(/^\s*---+\s*$/m)
		)
			.map((b) => b.trim())
			.filter(Boolean);
		const batch = blocks.map((b) => ({
			bucket,
			// A hook's lines join with `|`; a caption keeps the newlines it was
			// written with, because those breaks ARE the caption.
			text:
				mode === "hook"
					? b.split("\n").map((l) => l.trim()).filter(Boolean).join(" | ")
					: b,
			kind: draftKind,
			source: draftSource,
		}));
		try {
			const r = await fetch("/api/snippets", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ snippets: batch }),
			});
			if (!r.ok) throw new Error();
			setDraft("");
			setAdding(false);
			toast.success(`${batch.length} added`);
			void load();
		} catch {
			toast.error("could not save");
		}
	}

	async function remove(id: string) {
		setRows((p) => p.filter((r) => r.id !== id));
		await fetch(`/api/snippets?id=${encodeURIComponent(id)}`, {
			method: "DELETE",
		});
	}

	async function copy(r: Snippet) {
		await navigator.clipboard.writeText(r.text);
		setCopied(r.id);
		setTimeout(() => setCopied(null), 1200);
	}

	return (
		<div className="mx-auto w-full max-w-4xl px-4 py-8">
			<div className="mb-6 flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold text-[var(--mono-ink-1)]">
						{title}
					</h1>
					<p className="mt-1 text-sm text-[var(--mono-ink-3)]">{blurb}</p>
				</div>
				<button
					type="button"
					onClick={() => setAdding((v) => !v)}
					className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--mono-ink-1)] px-3 py-2 text-sm font-medium text-[var(--mono-bg-1)]"
				>
					{adding ? <X className="size-4" /> : <Plus className="size-4" />}
					{adding ? "Cancel" : "Add"}
				</button>
			</div>

			{adding && (
				<div className="mb-6 rounded-xl border border-[var(--mono-line)] p-4">
					<textarea
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						rows={6}
						placeholder={placeholder}
						className="w-full resize-y rounded-lg border border-[var(--mono-line)] bg-transparent p-3 text-sm text-[var(--mono-ink-1)] outline-none"
					/>
					<div className="mt-3 flex flex-wrap items-center gap-2">
						<input
							value={draftKind}
							onChange={(e) => setDraftKind(e.target.value)}
							placeholder="kind"
							className="w-28 rounded-lg border border-[var(--mono-line)] bg-transparent px-2 py-1.5 text-sm outline-none"
						/>
						<input
							value={draftSource}
							onChange={(e) => setDraftSource(e.target.value)}
							placeholder="source"
							className="w-44 rounded-lg border border-[var(--mono-line)] bg-transparent px-2 py-1.5 text-sm outline-none"
						/>
						<span className="text-xs text-[var(--mono-ink-3)]">
							{mode === "hook"
								? "one per line. a blank line means that one is two lines."
								: "line breaks are kept. --- on its own line starts another caption."}
						</span>
						<button
							type="button"
							onClick={() => void add()}
							className="ml-auto rounded-lg bg-[var(--mono-ink-1)] px-3 py-1.5 text-sm font-medium text-[var(--mono-bg-1)]"
						>
							Save
						</button>
					</div>
				</div>
			)}

			<div className="mb-4 flex flex-wrap items-center gap-2">
				<input
					value={q}
					onChange={(e) => setQ(e.target.value)}
					placeholder="Search"
					className="w-48 rounded-lg border border-[var(--mono-line)] bg-transparent px-3 py-1.5 text-sm outline-none"
				/>
				<button
					type="button"
					onClick={() => setKind("")}
					className={cn(
						"rounded-full border border-[var(--mono-line)] px-2.5 py-1 text-xs",
						!kind && "bg-[var(--mono-ink-1)] text-[var(--mono-bg-1)]",
					)}
				>
					all {rows.length}
				</button>
				{kinds.map(([k, n]) => (
					<button
						key={k}
						type="button"
						onClick={() => setKind(kind === k ? "" : k)}
						className={cn(
							"rounded-full border border-[var(--mono-line)] px-2.5 py-1 text-xs",
							kind === k && "bg-[var(--mono-ink-1)] text-[var(--mono-bg-1)]",
						)}
					>
						{k} {n}
					</button>
				))}
			</div>

			{loading ? (
				<div className="flex justify-center py-16">
					<Loader2 className="size-5 animate-spin text-[var(--mono-ink-3)]" />
				</div>
			) : !shown.length ? (
				<p className="py-16 text-center text-sm text-[var(--mono-ink-3)]">
					Nothing here yet.
				</p>
			) : (
				<ul className="space-y-2">
					{shown.map((r) => (
						<li
							key={r.id}
							className="group rounded-xl border border-[var(--mono-line)] p-4"
						>
							<div className="flex items-start gap-3">
								<div className="min-w-0 flex-1">
									<div
										className={cn(
											"text-[var(--mono-ink-1)]",
											mode === "hook"
												? "text-[15px] leading-snug"
												: "text-[14px] leading-relaxed",
										)}
									>
										<Rendered text={r.text} mode={mode} />
									</div>
									{(r.kind || r.source || r.note || r.deck) && (
										<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--mono-ink-3)]">
											{r.kind && (
												<span className="rounded bg-[var(--mono-bg-2)] px-1.5 py-0.5">
													{r.kind}
												</span>
											)}
											{r.source && <span>{r.source}</span>}
											{r.deck && <span>to {r.deck}</span>}
											{r.note && <span className="italic">{r.note}</span>}
										</div>
									)}
								</div>
								<div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
									<button
										type="button"
										onClick={() => void copy(r)}
										title="Copy"
										className="rounded-md p-1.5 text-[var(--mono-ink-3)] hover:text-[var(--mono-ink-1)]"
									>
										{copied === r.id ? (
											<Check className="size-4" />
										) : (
											<Copy className="size-4" />
										)}
									</button>
									<button
										type="button"
										onClick={() => void remove(r.id)}
										title="Delete"
										className="rounded-md p-1.5 text-[var(--mono-ink-3)] hover:text-red-500"
									>
										<Trash2 className="size-4" />
									</button>
								</div>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

export const HooksView = () => (
	<SnippetsView
		bucket="hook"
		title="Hooks"
		blurb="Every first line collected so far. `|` is a line break, `**bold**` is emphasis."
		placeholder={"One hook per line.\n\nA blank line means that hook is two lines."}
	/>
);

export const CaptionsView = () => (
	<SnippetsView
		bucket="caption"
		title="Captions"
		blurb="Caption bodies only, no posts. Opens with the keyword, no hashtags, no emoji."
		placeholder={
			"Paste the caption with its own line breaks.\n\nSeparate two captions with a line containing only ---"
		}
		mode="prose"
	/>
);
