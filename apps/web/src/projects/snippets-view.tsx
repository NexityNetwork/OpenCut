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

// ---------------------------------------------------------------------------
// A CAPTION HAS A SHAPE AND THE SHAPE IS IN THE TEXT.
//
// Printing the paragraphs and calling it done is still a wall. Across the book
// there are 54 captions opening on a down arrow, 161 bullet lines, 115 numbered
// section lines and 52 closing asks - that structure was written deliberately
// and the view has to read it back, not flatten it.
//
// Blank line = a block. Single newline INSIDE a block is a real break and is
// kept, because "Claude writes your code. / Supabase handles your backend." is
// a list of one-liners, not a paragraph.
//
// Nothing here rewrites the stored text. The chip around a keyword and the
// arrow glyph on a bullet are set, not saved; Copy still hands over the exact
// characters that went in.
// ---------------------------------------------------------------------------

const BULLET = /^(?:->|→|-)\s+(.*)$/;
// "1. Sentinel monitors your infrastructure." is a row with a number on it, not
// a sentence that happens to start with a digit - which is why the digits have
// to be followed by a full stop or a bracket. "3 months. That is all it takes"
// is prose and stays prose.
const NUMBERED = /^(\d{1,2})[.)]\s+(.*)$/;
// A row can carry its own little head: "Client intake: Read the onboarding doc".
const ROW_HEAD = /^([^.?!:]{2,40}):\s+(\S.*)$/;
// `Comment W`, `Comment "W"`, `Comment 400`. The quotes are display noise - the
// keyword is what matters, so it gets a chip and they go.
const ASK = /(\bComment\s+)(["“]?)([A-Za-z0-9]{1,14})(["”]?)/i;

type Item = { marker: string; text: string };
type Run = { kind: "list"; items: Item[] } | { kind: "text"; lines: string[] };
type Block = { kind: "lead" | "ask" | "para"; head?: string; runs: Run[] };

// Ending on a colon is most of it, but not all of it: one caption closes a
// paragraph with a full sentence, a full stop, a second sentence and THEN a
// colon, and setting all 119 characters of that in semibold looks like a
// mistake. So a sub-head also has to be short and hold one sentence. The list
// number is stripped before that test or "2. Running it autonomously:" fails on
// its own full stop.
function isHead(line: string) {
	if (!/:$/.test(line) || line.length > 100 || BULLET.test(line)) return false;
	return !/\.\s/.test(line.replace(/^\d+[.)]\s*/, ""));
}

function row(l: string): Item | null {
	const b = l.match(BULLET);
	if (b) return { marker: "→", text: b[1] };
	const n = l.match(NUMBERED);
	if (n) return { marker: `${n[1]}.`, text: n[2] };
	return null;
}

function runs(lines: string[]): Run[] {
	const out: Run[] = [];
	for (const l of lines) {
		const it = row(l);
		const last = out[out.length - 1];
		if (it) {
			if (last?.kind === "list") last.items.push(it);
			else out.push({ kind: "list", items: [it] });
		} else if (last?.kind === "text") last.lines.push(l);
		else out.push({ kind: "text", lines: [l] });
	}
	return out;
}

function parseCaption(text: string): Block[] {
	const paras = text
		.split(/\n{2,}/)
		.map((p) => p.trim())
		.filter(Boolean);

	return paras.map((p, i) => {
		let lines = p
			.split("\n")
			.map((l) => l.trim())
			.filter(Boolean);
		let kind: Block["kind"] = "para";
		let head: string | undefined;

		if (lines[0].startsWith("↓")) {
			// The opener. Sometimes it is the ask itself, sometimes a promise, and
			// the arrow belongs to the frame rather than the sentence.
			kind = "lead";
			head = lines[0].replace(/^↓\s*/, "");
			lines = lines.slice(1);
		} else if (i === paras.length - 1 && /^comment\b/i.test(lines[0])) {
			kind = "ask";
		} else if (isHead(lines[0])) {
			// A line that ends on a colon is a sub-head, whether it is numbered
			// ("2. Running it autonomously:") or not ("Claude for coding:").
			head = lines[0].slice(0, -1);
			lines = lines.slice(1);
		} else {
			// The same sub-head written inline: a short phrase, a colon, then the
			// sentence continues. No sentence punctuation before the colon or it is
			// just a sentence with a colon in it.
			const m = lines[0].match(/^([^.?!:]{2,60}):\s+(\S.*)$/);
			if (m && /\s/.test(m[1])) {
				head = m[1];
				lines = [m[2], ...lines.slice(1)];
			}
		}
		return { kind, head, runs: runs(lines) };
	});
}

function withKeyword(s: string) {
	const m = s.match(ASK);
	if (!m || m.index === undefined) return bold(s);
	const at = m.index;
	return (
		<>
			{s.slice(0, at + m[1].length)}
			<span className="rounded bg-[var(--mono-active)] px-1.5 py-0.5 font-semibold">
				{m[3]}
			</span>
			{s.slice(at + m[0].length)}
		</>
	);
}

// The ask is not always its own paragraph - plenty of captions end on it as the
// last LINE of one. So the keyword is found per line rather than per block, and
// it gets its chip wherever it was written.
function Lines({ lines, ask }: { lines: string[]; ask?: boolean }) {
	return (
		<p className="mb-2.5 last:mb-0">
			{lines.map((l, i) => (
				<span key={i} className="block">
					{ask || /^comment\b/i.test(l) ? withKeyword(l) : bold(l)}
				</span>
			))}
		</p>
	);
}

function Caption({ text }: { text: string }) {
	const blocks = useMemo(() => parseCaption(text), [text]);
	return (
		<div className="max-w-[68ch] text-[14.5px] leading-[1.62] text-[var(--mono-ink)]">
			{blocks.map((b, i) => (
				<div
					key={i}
					className={cn(
						"mb-3.5 last:mb-0",
						b.kind === "lead" && "mb-4",
						b.kind === "ask" &&
							"mt-4 border-t border-[var(--mono-line)] pt-3.5",
					)}
				>
					{b.kind === "lead" && b.head && (
						<p className="mb-2 flex gap-2 text-[15.5px] font-semibold leading-snug">
							<span className="shrink-0 select-none text-[var(--mono-ink-3)]">
								↓
							</span>
							<span>{withKeyword(b.head)}</span>
						</p>
					)}
					{b.kind !== "lead" && b.head && (
						<p className="mb-1.5 font-semibold">{bold(b.head)}</p>
					)}
					{b.runs.map((r, j) =>
						r.kind === "list" ? (
							<ul key={j} className="my-2.5 space-y-1.5">
								{r.items.map((it, k) => {
									const h = it.text.match(ROW_HEAD);
									return (
										<li key={k} className="flex gap-2.5">
											<span className="mt-[1px] w-[1.4em] shrink-0 select-none text-right text-[var(--mono-ink-3)]">
												{it.marker}
											</span>
											<span className="flex-1">
												{h ? (
													<>
														<strong className="font-semibold">{h[1]}</strong>{" "}
														{bold(h[2])}
													</>
												) : (
													bold(it.text)
												)}
											</span>
										</li>
									);
								})}
							</ul>
						) : (
							<Lines key={j} lines={r.lines} ask={b.kind === "ask"} />
						),
					)}
				</div>
			))}
		</div>
	);
}

// A hook is short and its `|` is a line break, the same mark the decks use, so
// what is stored goes onto a frame with no translation.
function Hook({ text }: { text: string }) {
	return (
		<div className="text-[15px] leading-snug text-[var(--mono-ink)]">
			{text.split("|").map((line, i) => (
				<span key={i} className="block">
					{bold(line.trim())}
				</span>
			))}
		</div>
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
					r.ref.toLowerCase().includes(needle) ||
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
					? b
							.split("\n")
							.map((l) => l.trim())
							.filter(Boolean)
							.join(" | ")
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

	const prose = mode === "prose";

	return (
		<div className="mx-auto w-full max-w-3xl px-4 py-8">
			<div className="mb-6 flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold text-[var(--mono-ink)]">
						{title}
					</h1>
					<p className="mt-1 text-sm text-[var(--mono-ink-3)]">{blurb}</p>
				</div>
				<button
					type="button"
					onClick={() => setAdding((v) => !v)}
					className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--mono-ink)] px-3 py-2 text-sm font-medium text-[var(--mono-app)]"
				>
					{adding ? <X className="size-4" /> : <Plus className="size-4" />}
					{adding ? "Cancel" : "Add"}
				</button>
			</div>

			{adding && (
				<div className="mb-6 rounded-xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-4">
					<textarea
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						rows={6}
						placeholder={placeholder}
						className="w-full resize-y rounded-lg border border-[var(--mono-line)] bg-[var(--mono-field)] p-3 text-sm text-[var(--mono-ink)] outline-none placeholder:text-[var(--mono-ink-3)]"
					/>
					<div className="mt-3 flex flex-wrap items-center gap-2">
						<input
							value={draftKind}
							onChange={(e) => setDraftKind(e.target.value)}
							placeholder="kind"
							className="w-28 rounded-lg border border-[var(--mono-line)] bg-[var(--mono-field)] px-2 py-1.5 text-sm text-[var(--mono-ink)] outline-none placeholder:text-[var(--mono-ink-3)]"
						/>
						<input
							value={draftSource}
							onChange={(e) => setDraftSource(e.target.value)}
							placeholder="source"
							className="w-44 rounded-lg border border-[var(--mono-line)] bg-[var(--mono-field)] px-2 py-1.5 text-sm text-[var(--mono-ink)] outline-none placeholder:text-[var(--mono-ink-3)]"
						/>
						<span className="text-xs text-[var(--mono-ink-3)]">
							{prose
								? "line breaks are kept. --- on its own line starts another caption."
								: "one per line. a blank line means that one is two lines."}
						</span>
						<button
							type="button"
							onClick={() => void add()}
							className="ml-auto rounded-lg bg-[var(--mono-ink)] px-3 py-1.5 text-sm font-medium text-[var(--mono-app)]"
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
					className="w-48 rounded-lg border border-[var(--mono-line)] bg-[var(--mono-field)] px-3 py-1.5 text-sm text-[var(--mono-ink)] outline-none placeholder:text-[var(--mono-ink-3)]"
				/>
				<button
					type="button"
					onClick={() => setKind("")}
					className={cn(
						"rounded-full border border-[var(--mono-line)] px-2.5 py-1 text-xs text-[var(--mono-ink-2)]",
						!kind && "bg-[var(--mono-ink)] text-[var(--mono-app)]",
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
							"rounded-full border border-[var(--mono-line)] px-2.5 py-1 text-xs text-[var(--mono-ink-2)]",
							kind === k && "bg-[var(--mono-ink)] text-[var(--mono-app)]",
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
				<ul className={cn("space-y-3", !prose && "space-y-2")}>
					{shown.map((r) => (
						<li
							key={r.id}
							className={cn(
								"group rounded-xl border border-[var(--mono-line)] bg-[var(--mono-panel)]",
								prose ? "p-5" : "p-4",
							)}
						>
							<div className="flex items-start gap-3">
								<div className="min-w-0 flex-1">
									{prose ? <Caption text={r.text} /> : <Hook text={r.text} />}
									{(r.ref || r.kind || r.source || r.note || r.deck) && (
										<div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--mono-line)] pt-2.5 text-[11px] text-[var(--mono-ink-3)]">
											{r.ref && (
												<span className="rounded bg-[var(--mono-active)] px-1.5 py-0.5 font-semibold text-[var(--mono-ink-2)]">
													{r.ref}
												</span>
											)}
											{r.kind && (
												<span className="rounded bg-[var(--mono-hover)] px-1.5 py-0.5">
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
										className="rounded-md p-1.5 text-[var(--mono-ink-3)] hover:text-[var(--mono-ink)]"
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
		blurb="Caption bodies only, no posts. Stored exactly as written; the keyword is the chip."
		placeholder={
			"Paste the caption with its own line breaks.\n\nSeparate two captions with a line containing only ---"
		}
		mode="prose"
	/>
);
