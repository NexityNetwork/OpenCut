"use client";

// Comment-to-DM automation builder (the ManyChat core, Instagram).
// "When someone comments <keyword> on <post>, DM them <message>."

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageSquarePlus, Plus, Trash2, Zap } from "lucide-react";
import { SiInstagram } from "react-icons/si";
import { cn } from "@/utils/ui";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/inbox/confirm-dialog";

type Rule = {
	id: string;
	post_id: string | null;
	keyword: string;
	dm_message: string;
	public_reply: string | null;
	active: boolean;
	match_count: number;
	created_at: number;
};

type IgMediaItem = {
	id: string;
	caption: string;
	media_type: string;
	permalink: string;
	comments_count: number;
	thumbnail_url?: string;
	media_url?: string;
};

const FIELD =
	"w-full rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-3.5 py-2.5 text-sm text-[var(--mono-ink)] outline-none transition-colors placeholder:text-[var(--mono-ink-3)] focus:border-[var(--mono-strong)]";
const LABEL =
	"mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]";

const DEMO_RULES: Rule[] = [
	{
		id: "demo-1",
		post_id: null,
		keyword: "prompts",
		dm_message: "Here you go! 🙌 [your link]",
		public_reply: "Sent you a DM! 📩",
		active: true,
		match_count: 214,
		created_at: Date.now() - 5 * 86400_000,
	},
];

export function AutoDmBuilder({
	owner,
	preview,
}: {
	owner: string;
	preview: boolean;
}) {
	const [rules, setRules] = useState<Rule[] | null>(null);
	const [media, setMedia] = useState<IgMediaItem[] | null>(null);
	const [creating, setCreating] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

	// New-rule form
	const [postId, setPostId] = useState<string>("");
	const [keyword, setKeyword] = useState("");
	const [dmMessage, setDmMessage] = useState("");
	const [publicReply, setPublicReply] = useState("");
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		if (preview) {
			setRules(DEMO_RULES);
			return;
		}
		try {
			const r = await fetch(
				`/api/publish/automations?owner=${encodeURIComponent(owner)}`,
			);
			const d = (await r.json().catch(() => ({}))) as { rules?: Rule[] };
			setRules(d.rules ?? []);
		} catch {
			setRules([]);
		}
	}, [owner, preview]);

	useEffect(() => {
		void load();
	}, [load]);

	const loadMedia = useCallback(async () => {
		if (preview || media) return;
		try {
			const r = await fetch("/api/publish/ig/media");
			const d = (await r.json().catch(() => ({}))) as { media?: IgMediaItem[] };
			setMedia(d.media ?? []);
		} catch {
			setMedia([]);
		}
	}, [preview, media]);

	const openForm = () => {
		setCreating(true);
		void loadMedia();
	};

	const create = async () => {
		if (busy) return;
		if (!dmMessage.trim()) {
			toast.error("Write the DM message to send");
			return;
		}
		if (preview) {
			toast.error("Preview only — request access to set up automations");
			return;
		}
		setBusy(true);
		try {
			const r = await fetch("/api/publish/automations", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					owner,
					post_id: postId || null,
					keyword: keyword.trim() || "*",
					dm_message: dmMessage.trim(),
					public_reply: publicReply.trim() || null,
				}),
			});
			const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
			if (!r.ok || !d.ok) throw new Error(d.error || "Couldn't create");
			toast.success("Automation live");
			setCreating(false);
			setPostId("");
			setKeyword("");
			setDmMessage("");
			setPublicReply("");
			void load();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't create");
		} finally {
			setBusy(false);
		}
	};

	const toggle = async (rule: Rule) => {
		if (preview) return;
		setRules((prev) =>
			(prev ?? []).map((x) =>
				x.id === rule.id ? { ...x, active: !x.active } : x,
			),
		);
		try {
			await fetch("/api/publish/automations", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ id: rule.id, active: !rule.active }),
			});
		} catch {
			void load();
		}
	};

	const remove = async (id: string) => {
		setConfirmDelete(null);
		if (preview) return;
		setRules((prev) => (prev ?? []).filter((x) => x.id !== id));
		try {
			await fetch(`/api/publish/automations?id=${encodeURIComponent(id)}`, {
				method: "DELETE",
			});
		} catch {
			void load();
		}
	};

	const postLabel = (rule: Rule) => {
		if (!rule.post_id) return "Any recent post";
		const m = media?.find((x) => x.id === rule.post_id);
		return m ? m.caption.slice(0, 40) || "Specific post" : "Specific post";
	};

	return (
		<div className="mx-auto max-w-2xl px-4 pt-16 pb-16 sm:px-8 lg:pt-10">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Auto-DM</h1>
					<p className="mt-1 text-sm text-[var(--mono-ink-3)]">
						When someone comments a keyword, automatically DM them — the
						"comment a word, get the link" funnel, on autopilot.
					</p>
				</div>
				{!creating && (
					<Button onClick={openForm}>
						<Plus className="mr-1.5 size-4" /> New
					</Button>
				)}
			</div>

			{creating && (
				<div className="mt-6 rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-5">
					<div className="mb-4 flex items-center gap-2 text-[13px] font-semibold text-[var(--mono-ink)]">
						<MessageSquarePlus className="size-4" /> New automation
					</div>

					<div className="space-y-4">
						<div>
							<label className={LABEL}>On which post</label>
							<select
								value={postId}
								onChange={(e) => setPostId(e.target.value)}
								className={cn(FIELD, "appearance-none")}
							>
								<option value="">Any recent post</option>
								{(media ?? []).map((m) => (
									<option key={m.id} value={m.id}>
										{(m.caption || m.media_type || "Post").slice(0, 60)}
										{m.comments_count ? ` · ${m.comments_count} comments` : ""}
									</option>
								))}
							</select>
							{media === null && !preview && (
								<p className="mt-1 text-[11px] text-[var(--mono-ink-3)]">
									Loading your posts…
								</p>
							)}
						</div>

						<div>
							<label className={LABEL}>Trigger keyword</label>
							<input
								value={keyword}
								onChange={(e) => setKeyword(e.target.value)}
								placeholder='e.g. "prompts" (leave blank to match every comment)'
								className={FIELD}
							/>
						</div>

						<div>
							<label className={LABEL}>DM to send</label>
							<textarea
								value={dmMessage}
								onChange={(e) => setDmMessage(e.target.value)}
								placeholder="Here's the link you asked for 🙌 …"
								className={cn(FIELD, "min-h-24 resize-none leading-relaxed")}
							/>
						</div>

						<div>
							<label className={LABEL}>Public reply (optional)</label>
							<input
								value={publicReply}
								onChange={(e) => setPublicReply(e.target.value)}
								placeholder="Sent you a DM! 📩"
								className={FIELD}
							/>
							<p className="mt-1 text-[11px] text-[var(--mono-ink-3)]">
								Posted as a reply under their comment so others see it works.
							</p>
						</div>
					</div>

					<div className="mt-5 flex justify-end gap-3">
						<Button
							variant="ghost"
							onClick={() => setCreating(false)}
							disabled={busy}
						>
							Cancel
						</Button>
						<Button onClick={create} disabled={busy}>
							{busy ? "Saving…" : "Turn on"}
						</Button>
					</div>
				</div>
			)}

			<div className="mt-6 space-y-3">
				{rules === null ? (
					<div className="py-10 text-center text-sm text-[var(--mono-ink-3)]">
						Loading…
					</div>
				) : rules.length === 0 && !creating ? (
					<div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-[var(--mono-line)] px-6 py-12 text-center">
						<Zap className="mb-1 size-5 text-[var(--mono-ink-3)]" />
						<div className="text-sm font-medium text-[var(--mono-ink-2)]">
							No automations yet
						</div>
						<div className="text-[13px] text-[var(--mono-ink-3)]">
							Set one up to auto-DM everyone who comments a keyword.
						</div>
					</div>
				) : (
					rules.map((rule) => (
						<div
							key={rule.id}
							className="flex items-start gap-4 rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-4"
						>
							<div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--mono-hover)]">
								<SiInstagram className="size-4" style={{ color: "#E4405F" }} />
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-center gap-1.5 text-sm">
									<span className="text-[var(--mono-ink-3)]">Comment</span>
									<span className="rounded-md bg-[var(--mono-active)] px-1.5 py-0.5 font-semibold text-[var(--mono-ink)]">
										{rule.keyword === "*" ? "anything" : rule.keyword}
									</span>
									<span className="text-[var(--mono-ink-3)]">on</span>
									<span className="font-medium text-[var(--mono-ink-2)]">
										{postLabel(rule)}
									</span>
									<span className="text-[var(--mono-ink-3)]">→ DM</span>
								</div>
								<p className="mt-1 truncate text-[13px] text-[var(--mono-ink-2)]">
									“{rule.dm_message}”
								</p>
								<div className="mt-1.5 flex items-center gap-3 text-[11px] text-[var(--mono-ink-3)]">
									<span>{rule.match_count} sent</span>
									{rule.public_reply && <span>· also replies publicly</span>}
								</div>
							</div>
							<div className="flex shrink-0 items-center gap-1">
								<button
									type="button"
									onClick={() => void toggle(rule)}
									title={rule.active ? "Pause" : "Resume"}
									className={cn(
										"relative h-5 w-9 rounded-full transition-colors",
										rule.active
											? "bg-[var(--mono-strong)]"
											: "bg-[var(--mono-line)]",
									)}
								>
									<span
										className={cn(
											"absolute top-0.5 size-4 rounded-full bg-[var(--mono-app)] transition-transform",
											rule.active ? "translate-x-4" : "translate-x-0.5",
										)}
									/>
								</button>
								<button
									type="button"
									onClick={() => setConfirmDelete(rule.id)}
									aria-label="Delete"
									className="flex size-7 items-center justify-center rounded-md text-[var(--mono-ink-3)] transition-colors hover:bg-[var(--mono-hover)] hover:text-red-400"
								>
									<Trash2 className="size-3.5" />
								</button>
							</div>
						</div>
					))
				)}
			</div>

			<ConfirmDialog
				open={!!confirmDelete}
				title="Delete automation?"
				body="It will stop sending DMs. This can't be undone."
				confirmLabel="Delete"
				onConfirm={() => confirmDelete && void remove(confirmDelete)}
				onCancel={() => setConfirmDelete(null)}
			/>
		</div>
	);
}
