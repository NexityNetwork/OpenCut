"use client";

// Contact CRM — auto-built from funnel leads + DM threads. Tag, filter, and
// save segments to target later with broadcasts.

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, RotateCw, Search, Tag } from "lucide-react";
import { cn } from "@/utils/ui";

type Contact = {
	id: string;
	username: string;
	name: string | null;
	status: string;
	source: string;
	tags: string[];
	reachable: boolean;
	last_inbound_at: number | null;
	last_seen: number;
};

type Segment = {
	id: string;
	name: string;
	rules: { tags_any?: string[]; status?: string[]; reachable?: boolean };
	size: number;
	reachable: number;
};

const STATUSES = ["lead", "engaged", "qualified", "customer", "cold"];
const STATUS_CLS: Record<string, string> = {
	lead: "bg-[var(--mono-active)] text-[var(--mono-ink-2)]",
	engaged: "bg-amber-500/15 text-amber-500",
	qualified: "bg-emerald-500/15 text-emerald-500",
	customer: "bg-sky-500/15 text-sky-500",
	cold: "bg-[var(--mono-line)] text-[var(--mono-ink-3)]",
};

const DEMO: Contact[] = [
	{ id: "d1", username: "creator.daily", name: null, status: "qualified", source: "funnel", tags: ["funnel", "vip"], reachable: true, last_inbound_at: Date.now(), last_seen: Date.now() },
	{ id: "d2", username: "studio.notes", name: null, status: "engaged", source: "dm", tags: ["dm"], reachable: true, last_inbound_at: Date.now(), last_seen: Date.now() },
	{ id: "d3", username: "foundermode", name: null, status: "lead", source: "funnel", tags: ["funnel"], reachable: false, last_inbound_at: null, last_seen: Date.now() },
];

export function ContactsView({ owner, preview }: { owner: string; preview: boolean }) {
	const [contacts, setContacts] = useState<Contact[] | null>(null);
	const [allTags, setAllTags] = useState<string[]>([]);
	const [segments, setSegments] = useState<Segment[]>([]);
	const [total, setTotal] = useState(0);
	const [q, setQ] = useState("");
	const [status, setStatus] = useState("");
	const [tag, setTag] = useState("");
	const [reachable, setReachable] = useState(false);
	const [syncing, setSyncing] = useState(false);

	const load = useCallback(async () => {
		if (preview) {
			setContacts(DEMO);
			setAllTags(["funnel", "dm", "vip"]);
			setTotal(DEMO.length);
			return;
		}
		const p = new URLSearchParams({ owner });
		if (q) p.set("q", q);
		if (status) p.set("status", status);
		if (tag) p.set("tag", tag);
		if (reachable) p.set("reachable", "1");
		try {
			const r = await fetch(`/api/publish/contacts?${p}`);
			const d = (await r.json().catch(() => ({}))) as {
				contacts?: Contact[]; tags?: string[]; total?: number;
			};
			setContacts(d.contacts ?? []);
			setAllTags(d.tags ?? []);
			setTotal(d.total ?? 0);
		} catch {
			setContacts([]);
		}
	}, [owner, q, status, tag, reachable, preview]);

	const loadSegments = useCallback(async () => {
		if (preview) return;
		try {
			const r = await fetch(`/api/publish/segments?owner=${encodeURIComponent(owner)}`);
			const d = (await r.json().catch(() => ({}))) as { segments?: Segment[] };
			setSegments(d.segments ?? []);
		} catch {
			/* */
		}
	}, [owner, preview]);

	// Sync once on mount (pulls in fresh DM contacts under this owner), then list.
	useEffect(() => {
		let active = true;
		(async () => {
			if (!preview) {
				try {
					await fetch(`/api/publish/contacts/sync?owner=${encodeURIComponent(owner)}`, { method: "POST" });
				} catch { /* */ }
			}
			if (active) {
				void load();
				void loadSegments();
			}
		})();
		return () => {
			active = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [owner]);

	useEffect(() => {
		void load();
	}, [load]);

	const sync = async () => {
		if (preview || syncing) return;
		setSyncing(true);
		try {
			await fetch(`/api/publish/contacts/sync?owner=${encodeURIComponent(owner)}`, { method: "POST" });
			await load();
			toast.success("Contacts refreshed");
		} catch {
			toast.error("Sync failed");
		} finally {
			setSyncing(false);
		}
	};

	const patch = async (id: string, body: Record<string, unknown>) => {
		if (preview) return;
		try {
			await fetch("/api/publish/contacts", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ id, ...body }),
			});
		} catch {
			/* */
		}
	};

	const setContactStatus = (c: Contact, s: string) => {
		setContacts((prev) => (prev ?? []).map((x) => (x.id === c.id ? { ...x, status: s } : x)));
		void patch(c.id, { status: s });
	};
	const toggleTag = (c: Contact, t: string) => {
		const next = c.tags.includes(t) ? c.tags.filter((x) => x !== t) : [...c.tags, t];
		setContacts((prev) => (prev ?? []).map((x) => (x.id === c.id ? { ...x, tags: next } : x)));
		void patch(c.id, { tags: next });
	};

	const saveSegment = async () => {
		if (preview) {
			toast.error("Preview only");
			return;
		}
		const name = window.prompt("Name this segment");
		if (!name) return;
		const rules: Segment["rules"] = {};
		if (tag) rules.tags_any = [tag];
		if (status) rules.status = [status];
		if (reachable) rules.reachable = true;
		try {
			const r = await fetch("/api/publish/segments", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ owner, name, rules }),
			});
			if (!r.ok) throw new Error();
			toast.success("Segment saved");
			void loadSegments();
		} catch {
			toast.error("Couldn't save segment");
		}
	};

	const applySegment = (s: Segment) => {
		setTag(s.rules.tags_any?.[0] ?? "");
		setStatus(s.rules.status?.[0] ?? "");
		setReachable(!!s.rules.reachable);
	};

	const reachableCount = useMemo(
		() => (contacts ?? []).filter((c) => c.reachable).length,
		[contacts],
	);

	return (
		<div className="mx-auto max-w-4xl px-4 pt-6 pb-16 sm:px-8">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
					<p className="mt-1 text-sm text-[var(--mono-ink-3)]">
						Everyone who's commented, DMed or come through a funnel — tagged and
						ready to segment. {reachableCount} reachable now.
					</p>
				</div>
				<button
					type="button"
					onClick={sync}
					disabled={syncing}
					className="flex items-center gap-1.5 rounded-lg border border-[var(--mono-line)] px-3 py-2 text-[13px] text-[var(--mono-ink-2)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)] disabled:opacity-50"
				>
					<RotateCw className={cn("size-3.5", syncing && "animate-spin")} /> Sync
				</button>
			</div>

			{/* Segments */}
			{segments.length > 0 && (
				<div className="mt-5 flex flex-wrap items-center gap-2">
					<span className="text-[11px] font-semibold tracking-wide text-[var(--mono-ink-3)] uppercase">
						Segments
					</span>
					{segments.map((s) => (
						<button
							key={s.id}
							type="button"
							onClick={() => applySegment(s)}
							className="rounded-full border border-[var(--mono-line)] px-3 py-1 text-[12px] text-[var(--mono-ink-2)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
						>
							{s.name}{" "}
							<span className="text-[var(--mono-ink-3)]">· {s.size}</span>
						</button>
					))}
				</div>
			)}

			{/* Filters */}
			<div className="mt-5 flex flex-wrap items-center gap-2">
				<div className="flex min-w-48 flex-1 items-center gap-2 rounded-full border border-[var(--mono-line)] bg-[var(--mono-field)] px-3.5 py-2">
					<Search className="size-4 shrink-0 text-[var(--mono-ink-3)]" />
					<input
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="Search contacts…"
						className="min-w-0 flex-1 bg-transparent text-sm text-[var(--mono-ink)] outline-none placeholder:text-[var(--mono-ink-2)]"
					/>
				</div>
				<select
					value={status}
					onChange={(e) => setStatus(e.target.value)}
					className="rounded-lg border border-[var(--mono-line)] bg-[var(--mono-field)] px-3 py-2 text-[13px] text-[var(--mono-ink-2)] outline-none"
				>
					<option value="">Any status</option>
					{STATUSES.map((s) => (
						<option key={s} value={s}>{s}</option>
					))}
				</select>
				<select
					value={tag}
					onChange={(e) => setTag(e.target.value)}
					className="rounded-lg border border-[var(--mono-line)] bg-[var(--mono-field)] px-3 py-2 text-[13px] text-[var(--mono-ink-2)] outline-none"
				>
					<option value="">Any tag</option>
					{allTags.map((t) => (
						<option key={t} value={t}>{t}</option>
					))}
				</select>
				<button
					type="button"
					onClick={() => setReachable((v) => !v)}
					className={cn(
						"rounded-lg border px-3 py-2 text-[13px] transition-colors",
						reachable
							? "border-[var(--mono-strong)] bg-[var(--mono-active)] text-[var(--mono-ink)]"
							: "border-[var(--mono-line)] text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)]",
					)}
				>
					Reachable now
				</button>
				{(tag || status || reachable) && (
					<button
						type="button"
						onClick={saveSegment}
						className="flex items-center gap-1 rounded-lg border border-[var(--mono-line)] px-3 py-2 text-[13px] text-[var(--mono-ink-2)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
					>
						<Plus className="size-3.5" /> Save segment
					</button>
				)}
			</div>

			{/* List */}
			<div className="mt-5 overflow-hidden rounded-2xl border border-[var(--mono-line)]">
				{contacts === null ? (
					<div className="py-12 text-center text-sm text-[var(--mono-ink-3)]">
						Loading…
					</div>
				) : contacts.length === 0 ? (
					<div className="py-16 text-center">
						<div className="text-sm font-medium text-[var(--mono-ink-2)]">
							No contacts yet
						</div>
						<div className="mt-1 text-[13px] text-[var(--mono-ink-3)]">
							They appear as people comment, DM, or come through your funnels.
						</div>
					</div>
				) : (
					contacts.map((c, i) => (
						<div
							key={c.id}
							className={cn(
								"flex items-center gap-3 px-4 py-3",
								i > 0 && "border-t border-[var(--mono-line)]",
							)}
						>
							<div className="relative flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--mono-line)] bg-[var(--mono-hover)] text-xs font-semibold text-[var(--mono-ink-2)] uppercase">
								{(c.username || "?").slice(0, 1)}
								{c.reachable && (
									<span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-[var(--mono-app)] bg-emerald-500" title="Reachable now" />
								)}
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<span className="truncate text-[13px] font-semibold text-[var(--mono-ink)]">
										{c.username || "instagram user"}
									</span>
									{c.tags.map((t) => (
										<span
											key={t}
											className="hidden items-center gap-0.5 rounded bg-[var(--mono-active)] px-1.5 py-0.5 text-[10px] text-[var(--mono-ink-2)] sm:inline-flex"
										>
											<Tag className="size-2.5" />
											{t}
										</span>
									))}
								</div>
								<div className="mt-0.5 text-[11px] text-[var(--mono-ink-3)] capitalize">
									from {c.source}
								</div>
							</div>
							<TagAdder onAdd={(t) => toggleTag(c, t)} existing={c.tags} />
							<select
								value={c.status}
								onChange={(e) => setContactStatus(c, e.target.value)}
								className={cn(
									"shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold outline-none",
									STATUS_CLS[c.status] ?? STATUS_CLS.lead,
								)}
							>
								{STATUSES.map((s) => (
									<option key={s} value={s} className="bg-[var(--mono-panel)] text-[var(--mono-ink)]">
										{s}
									</option>
								))}
							</select>
						</div>
					))
				)}
			</div>
			{total > (contacts?.length ?? 0) && (
				<div className="mt-3 text-center text-[12px] text-[var(--mono-ink-3)]">
					Showing {contacts?.length} of {total}
				</div>
			)}
		</div>
	);
}

function TagAdder({
	onAdd,
	existing,
}: {
	onAdd: (t: string) => void;
	existing: string[];
}) {
	const [open, setOpen] = useState(false);
	const [v, setV] = useState("");
	return open ? (
		<div className="flex shrink-0 items-center gap-1">
			<input
				// eslint-disable-next-line jsx-a11y/no-autofocus
				autoFocus
				value={v}
				onChange={(e) => setV(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" && v.trim()) {
						onAdd(v.trim());
						setV("");
						setOpen(false);
					}
					if (e.key === "Escape") setOpen(false);
				}}
				onBlur={() => setOpen(false)}
				placeholder="tag"
				className="h-7 w-20 rounded-md border border-[var(--mono-line)] bg-[var(--mono-field)] px-2 text-[12px] text-[var(--mono-ink)] outline-none"
			/>
		</div>
	) : (
		<button
			type="button"
			onClick={() => setOpen(true)}
			title="Add tag"
			className="flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--mono-ink-3)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
		>
			<Tag className="size-3.5" />
		</button>
	);
}
