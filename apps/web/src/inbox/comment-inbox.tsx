"use client";

// Comment inbox — comments on published posts, with inline replies.
// Instagram reads/replies ride the satellite's Composio connection;
// YouTube unlocks once the wider-scope grant is connected.

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	ArrowUpRight,
	CornerDownRight,
	Heart,
	RotateCw,
	Send,
	TriangleAlert,
} from "lucide-react";
import { SiInstagram, SiYoutube } from "react-icons/si";
import { cn } from "@/utils/ui";

const PUBLISH_ORIGIN = "https://ultron-publish.catalin-932.workers.dev";

type InboxReply = {
	comment_id: string;
	author: string;
	text: string;
	ts: number | null;
};

type InboxComment = {
	platform: "instagram" | "youtube";
	post_id: string;
	post_slug: string;
	post_url: string | null;
	comment_id: string;
	author: string;
	text: string;
	ts: number | null;
	like_count: number;
	reply_count: number;
	replies: InboxReply[];
};

const DEMO_COMMENTS: InboxComment[] = [
	{
		platform: "instagram",
		post_id: "demo-1",
		post_slug: "launch-teaser",
		post_url: null,
		comment_id: "d1",
		author: "creator.daily",
		text: "This edit is so clean. What do you use?",
		ts: Date.now() - 42 * 60_000,
		like_count: 3,
		reply_count: 1,
		replies: [
			{
				comment_id: "d1r",
				author: "you",
				text: "All made in Monolith 🙌",
				ts: Date.now() - 31 * 60_000,
			},
		],
	},
	{
		platform: "instagram",
		post_id: "demo-1",
		post_slug: "launch-teaser",
		post_url: null,
		comment_id: "d2",
		author: "studio.notes",
		text: "W",
		ts: Date.now() - 2 * 3600_000,
		like_count: 1,
		reply_count: 0,
		replies: [],
	},
	{
		platform: "youtube",
		post_id: "demo-2",
		post_slug: "behind-the-scenes",
		post_url: null,
		comment_id: "d3",
		author: "FirstViewer",
		text: "Underrated channel, subscribed.",
		ts: Date.now() - 26 * 3600_000,
		like_count: 8,
		reply_count: 0,
		replies: [],
	},
];

function ago(ts: number | null): string {
	if (!ts) return "";
	const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
	if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
	if (s < 86400) return `${Math.floor(s / 3600)}h`;
	return `${Math.floor(s / 86400)}d`;
}

function platformIcon(p: "instagram" | "youtube", cls = "size-3.5") {
	return p === "instagram" ? (
		<SiInstagram className={cls} style={{ color: "#E4405F" }} />
	) : (
		<SiYoutube className={cls} style={{ color: "#FF0000" }} />
	);
}

function Avatar({ name }: { name: string }) {
	return (
		<div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--mono-line)] bg-[var(--mono-hover)] text-xs font-semibold text-[var(--mono-ink-2)] uppercase">
			{(name || "?").slice(0, 1)}
		</div>
	);
}

export function CommentInbox({ preview }: { preview: boolean }) {
	const [comments, setComments] = useState<InboxComment[] | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [filter, setFilter] = useState<"all" | "instagram" | "youtube">("all");
	const [loading, setLoading] = useState(false);
	const [replyFor, setReplyFor] = useState<string | null>(null);
	const [replyText, setReplyText] = useState("");
	const [sending, setSending] = useState(false);

	const load = useCallback(async () => {
		if (preview) {
			setComments(DEMO_COMMENTS);
			setErrors({});
			return;
		}
		setLoading(true);
		try {
			const r = await fetch("/api/publish/comments?platform=all");
			const d = (await r.json().catch(() => ({}))) as {
				comments?: InboxComment[];
				errors?: Record<string, string>;
				error?: string;
			};
			if (!r.ok) throw new Error(d.error || "Couldn't load comments");
			setComments(d.comments ?? []);
			setErrors(d.errors ?? {});
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't load comments");
			setComments((prev) => prev ?? []);
		} finally {
			setLoading(false);
		}
	}, [preview]);

	useEffect(() => {
		void load();
	}, [load]);

	const filtered = useMemo(
		() =>
			(comments ?? []).filter(
				(c) => filter === "all" || c.platform === filter,
			),
		[comments, filter],
	);

	// Group comments under their post, newest activity first.
	const groups = useMemo(() => {
		const map = new Map<
			string,
			{ key: string; platform: "instagram" | "youtube"; slug: string; url: string | null; items: InboxComment[] }
		>();
		for (const c of filtered) {
			const key = `${c.platform}:${c.post_id}`;
			const g = map.get(key) ?? {
				key,
				platform: c.platform,
				slug: c.post_slug,
				url: c.post_url,
				items: [],
			};
			g.items.push(c);
			map.set(key, g);
		}
		return [...map.values()].sort(
			(a, b) => (b.items[0]?.ts ?? 0) - (a.items[0]?.ts ?? 0),
		);
	}, [filtered]);

	const sendReply = async (c: InboxComment) => {
		const message = replyText.trim();
		if (!message || sending) return;
		if (preview) {
			toast.error("Preview only — request access to reply");
			return;
		}
		setSending(true);
		try {
			const r = await fetch("/api/publish/comments/reply", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					platform: c.platform,
					comment_id: c.comment_id,
					message,
				}),
			});
			const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
			if (!r.ok || !d.ok) throw new Error(d.error || "Reply failed");
			setComments((prev) =>
				(prev ?? []).map((x) =>
					x.comment_id === c.comment_id
						? {
								...x,
								reply_count: x.reply_count + 1,
								replies: [
									...x.replies,
									{
										comment_id: `local-${Date.now()}`,
										author: "you",
										text: message,
										ts: Date.now(),
									},
								],
							}
						: x,
				),
			);
			setReplyFor(null);
			setReplyText("");
			toast.success("Reply sent");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Reply failed");
		} finally {
			setSending(false);
		}
	};

	const counts = useMemo(() => {
		const all = comments ?? [];
		return {
			all: all.length,
			instagram: all.filter((c) => c.platform === "instagram").length,
			youtube: all.filter((c) => c.platform === "youtube").length,
		};
	}, [comments]);

	return (
		<div className="mx-auto max-w-3xl px-4 pt-16 pb-16 sm:px-8 lg:pt-10">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Comments</h1>
					<p className="mt-1 text-sm text-[var(--mono-ink-3)]">
						Everything people said on your recent posts. Replies go out from
						your connected accounts.
					</p>
				</div>
				<button
					type="button"
					onClick={() => void load()}
					disabled={loading}
					className="flex items-center gap-1.5 rounded-lg border border-[var(--mono-line)] px-3 py-2 text-[13px] text-[var(--mono-ink-2)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)] disabled:opacity-50"
				>
					<RotateCw className={cn("size-3.5", loading && "animate-spin")} />
					Refresh
				</button>
			</div>

			<div className="mt-5 flex flex-wrap gap-2">
				{(["all", "instagram", "youtube"] as const).map((p) => (
					<button
						key={p}
						type="button"
						onClick={() => setFilter(p)}
						className={cn(
							"flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] capitalize transition-colors",
							filter === p
								? "border-[var(--mono-strong)] bg-[var(--mono-active)] text-[var(--mono-ink)]"
								: "border-[var(--mono-line)] text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]",
						)}
					>
						{p !== "all" && platformIcon(p)}
						{p}
						<span className="text-[11px] text-[var(--mono-ink-3)]">
							{counts[p]}
						</span>
					</button>
				))}
			</div>

			{Object.entries(errors).map(([platform, msg]) => (
				<div
					key={platform}
					className="mt-4 flex items-center gap-3 rounded-xl border border-dashed border-[var(--mono-line)] px-4 py-3 text-[13px] text-[var(--mono-ink-2)]"
				>
					<TriangleAlert className="size-4 shrink-0 text-[var(--mono-ink-3)]" />
					<span className="flex-1">{msg}</span>
					{platform === "youtube" && (
						<button
							type="button"
							onClick={() =>
								window.open(
									`${PUBLISH_ORIGIN}/oauth2/youtube/start`,
									"_blank",
									"noopener",
								)
							}
							className="shrink-0 rounded-lg border border-[var(--mono-line)] px-2.5 py-1.5 transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
						>
							Reconnect
						</button>
					)}
				</div>
			))}

			{comments === null ? (
				<div className="flex h-48 items-center justify-center text-sm text-[var(--mono-ink-3)]">
					Loading…
				</div>
			) : groups.length === 0 ? (
				<div className="mt-10 flex flex-col items-center gap-1 rounded-2xl border border-dashed border-[var(--mono-line)] px-6 py-14 text-center">
					<div className="text-sm font-medium text-[var(--mono-ink-2)]">
						No comments yet
					</div>
					<div className="text-[13px] text-[var(--mono-ink-3)]">
						New comments on your recent posts will land here.
					</div>
				</div>
			) : (
				<div className="mt-6 space-y-7">
					{groups.map((g) => (
						<section key={g.key}>
							<div className="mb-2 flex items-center gap-2 text-[13px] text-[var(--mono-ink-3)]">
								{platformIcon(g.platform)}
								<span className="font-medium text-[var(--mono-ink-2)]">
									{g.slug}
								</span>
								<span>· {g.items.length} comment{g.items.length === 1 ? "" : "s"}</span>
								{g.url && (
									<a
										href={g.url}
										target="_blank"
										rel="noreferrer"
										className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
									>
										Open post <ArrowUpRight className="size-3" />
									</a>
								)}
							</div>
							<div className="overflow-hidden rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-panel)]">
								{g.items.map((c, i) => (
									<div
										key={c.comment_id}
										className={cn(
											"px-4 py-3.5",
											i > 0 && "border-t border-[var(--mono-line)]",
										)}
									>
										<div className="flex gap-3">
											<Avatar name={c.author} />
											<div className="min-w-0 flex-1">
												<div className="flex items-baseline gap-2">
													<span className="truncate text-[13px] font-semibold text-[var(--mono-ink)]">
														{c.author}
													</span>
													<span className="shrink-0 text-[11px] text-[var(--mono-ink-3)]">
														{ago(c.ts)}
													</span>
													{c.like_count > 0 && (
														<span className="flex shrink-0 items-center gap-0.5 text-[11px] text-[var(--mono-ink-3)]">
															<Heart className="size-3" /> {c.like_count}
														</span>
													)}
												</div>
												<p className="mt-0.5 text-sm leading-relaxed break-words text-[var(--mono-ink-2)]">
													{c.text}
												</p>

												{c.replies.length > 0 && (
													<div className="mt-2 space-y-1.5">
														{c.replies.map((rep) => (
															<div
																key={rep.comment_id}
																className="flex items-start gap-2 text-[13px]"
															>
																<CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-[var(--mono-ink-3)]" />
																<div className="min-w-0">
																	<span className="font-semibold text-[var(--mono-ink)]">
																		{rep.author}
																	</span>{" "}
																	<span className="break-words text-[var(--mono-ink-2)]">
																		{rep.text}
																	</span>
																</div>
															</div>
														))}
													</div>
												)}

												{replyFor === c.comment_id ? (
													<div className="mt-2.5 flex items-end gap-2">
														<textarea
															value={replyText}
															onChange={(e) => setReplyText(e.target.value)}
															onKeyDown={(e) => {
																if (e.key === "Enter" && !e.shiftKey) {
																	e.preventDefault();
																	void sendReply(c);
																}
																if (e.key === "Escape") setReplyFor(null);
															}}
															// eslint-disable-next-line jsx-a11y/no-autofocus
															autoFocus
															rows={1}
															placeholder={`Reply to ${c.author}…`}
															className="min-h-9 flex-1 resize-none rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-3 py-2 text-sm text-[var(--mono-ink)] outline-none placeholder:text-[var(--mono-ink-3)] focus:border-[var(--mono-strong)]"
														/>
														<button
															type="button"
															onClick={() => void sendReply(c)}
															disabled={sending || !replyText.trim()}
															aria-label="Send reply"
															className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--mono-strong)] bg-[var(--mono-active)] text-[var(--mono-ink)] transition-opacity disabled:opacity-40"
														>
															<Send className="size-4" />
														</button>
													</div>
												) : (
													<button
														type="button"
														onClick={() => {
															setReplyFor(c.comment_id);
															setReplyText("");
														}}
														className="mt-1.5 text-[12px] font-medium text-[var(--mono-ink-3)] transition-colors hover:text-[var(--mono-ink)]"
													>
														Reply
													</button>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						</section>
					))}
				</div>
			)}
		</div>
	);
}
