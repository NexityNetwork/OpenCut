"use client";

// Instagram DM inbox — conversation list + thread view with inline reply.
// Reads/sends ride the satellite's Composio messaging tools.

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	ImagePlus,
	Loader2,
	MessagesSquare,
	RotateCw,
	SendHorizontal,
} from "lucide-react";
import { SiInstagram } from "react-icons/si";
import { cn } from "@/utils/ui";
import { uploadBlobToR2 } from "@/canvas-editor/publish-export";
import { fileUrl } from "@/projects/vault-client";

type Conversation = {
	id: string;
	with: string;
	with_id: string;
	snippet: string;
	updated_time: string | null;
};

type Message = {
	id: string;
	from: string;
	from_id: string;
	text: string;
	ts: string | null;
	mine: boolean;
};

const DEMO_CONVS: Conversation[] = [
	{
		id: "demo-a",
		with: "creator.daily",
		with_id: "0",
		snippet: "Sent! let me know if it works",
		updated_time: new Date(Date.now() - 12 * 60_000).toISOString(),
	},
	{
		id: "demo-b",
		with: "studio.notes",
		with_id: "0",
		snippet: "what preset is that",
		updated_time: new Date(Date.now() - 3 * 3600_000).toISOString(),
	},
];
const DEMO_MSGS: Record<string, Message[]> = {
	"demo-a": [
		{ id: "m1", from: "creator.daily", from_id: "1", text: "Hey! saw your reel, can you send the prompts?", ts: null, mine: false },
		{ id: "m2", from: "you", from_id: "0", text: "Just sent them over 🙌", ts: null, mine: true },
		{ id: "m3", from: "creator.daily", from_id: "1", text: "Sent! let me know if it works", ts: null, mine: false },
	],
	"demo-b": [
		{ id: "m4", from: "studio.notes", from_id: "2", text: "what preset is that", ts: null, mine: false },
	],
};

function ago(ts: string | null): string {
	if (!ts) return "";
	const t = Date.parse(ts);
	if (!Number.isFinite(t)) return "";
	const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
	if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
	if (s < 86400) return `${Math.floor(s / 3600)}h`;
	return `${Math.floor(s / 86400)}d`;
}

function Avatar({ name }: { name: string }) {
	return (
		<div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--mono-line)] bg-[var(--mono-hover)] text-sm font-semibold text-[var(--mono-ink-2)] uppercase">
			{(name || "?").slice(0, 1)}
		</div>
	);
}

export function DmInbox({ preview, account }: { preview: boolean; account?: string }) {
	const [convs, setConvs] = useState<Conversation[] | null>(null);
	const [active, setActive] = useState<Conversation | null>(null);
	const [messages, setMessages] = useState<Message[] | null>(null);
	const [loadingConvs, setLoadingConvs] = useState(false);
	const [loadingMsgs, setLoadingMsgs] = useState(false);
	const [draft, setDraft] = useState("");
	const [sending, setSending] = useState(false);
	const threadRef = useRef<HTMLDivElement>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	const loadConvs = useCallback(async () => {
		if (preview) {
			setConvs(DEMO_CONVS);
			return;
		}
		setLoadingConvs(true);
		try {
			const r = await fetch(`/api/publish/dm${account ? `?account=${encodeURIComponent(account)}` : ""}`);
			const d = (await r.json().catch(() => ({}))) as {
				conversations?: Conversation[];
				error?: string;
			};
			if (!r.ok) throw new Error(d.error || "Couldn't load DMs");
			setConvs(d.conversations ?? []);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't load DMs");
			setConvs((prev) => prev ?? []);
		} finally {
			setLoadingConvs(false);
		}
	}, [preview, account]);

	useEffect(() => {
		void loadConvs();
	}, [loadConvs]);

	const openConv = useCallback(
		async (c: Conversation) => {
			setActive(c);
			setMessages(null);
			if (preview) {
				setMessages(DEMO_MSGS[c.id] ?? []);
				return;
			}
			setLoadingMsgs(true);
			try {
				const r = await fetch(
					`/api/publish/dm/messages?conversation_id=${encodeURIComponent(c.id)}${account ? `&account=${encodeURIComponent(account)}` : ""}`,
				);
				const d = (await r.json().catch(() => ({}))) as {
					messages?: Message[];
					error?: string;
				};
				if (!r.ok) throw new Error(d.error || "Couldn't load thread");
				setMessages(d.messages ?? []);
			} catch (e) {
				toast.error(e instanceof Error ? e.message : "Couldn't load thread");
				setMessages([]);
			} finally {
				setLoadingMsgs(false);
			}
		},
		[preview, account],
	);

	useEffect(() => {
		const el = threadRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages]);

	const sendImage = async (file: File) => {
		if (!active || sending) return;
		if (preview) {
			toast.error("Preview only — request access to reply");
			return;
		}
		if (!active.with_id || active.with_id === "0") {
			toast.error("Can't resolve this recipient");
			return;
		}
		if (!file.type.startsWith("image/")) {
			toast.error("Instagram DMs accept images only — send other files as a link");
			return;
		}
		setSending(true);
		const tid = toast.loading("Sending image…");
		try {
			const ext = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "jpg";
			const key = await uploadBlobToR2({
				data: file,
				ext,
				contentType: file.type || "image/jpeg",
			});
			const origin = window.location.origin;
			const r = await fetch("/api/publish/dm/send", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					recipient_id: active.with_id,
					image_url: `${origin}${fileUrl(key)}`,
					text: draft.trim() || undefined,
					account,
				}),
			});
			const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
			if (!r.ok || !d.ok) throw new Error(d.error || "Send failed");
			setMessages((prev) => [
				...(prev ?? []),
				{
					id: `local-${Date.now()}`,
					from: "you",
					from_id: "me",
					text: draft.trim() ? `${draft.trim()} 🖼️` : "🖼️ Image sent",
					ts: new Date().toISOString(),
					mine: true,
				},
			]);
			setDraft("");
			toast.success("Image sent", { id: tid });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Send failed", { id: tid });
		} finally {
			setSending(false);
		}
	};

	const send = async () => {
		const text = draft.trim();
		if (!text || !active || sending) return;
		if (preview) {
			toast.error("Preview only — request access to reply");
			return;
		}
		if (!active.with_id || active.with_id === "0") {
			toast.error("Can't resolve this recipient");
			return;
		}
		setSending(true);
		try {
			const r = await fetch("/api/publish/dm/send", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ recipient_id: active.with_id, text, account }),
			});
			const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string };
			if (!r.ok || !d.ok) throw new Error(d.error || "Send failed");
			setMessages((prev) => [
				...(prev ?? []),
				{
					id: `local-${Date.now()}`,
					from: "you",
					from_id: "me",
					text,
					ts: new Date().toISOString(),
					mine: true,
				},
			]);
			setDraft("");
			toast.success("Message sent");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Send failed");
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="flex h-[calc(100dvh-12rem)] overflow-hidden rounded-2xl lg:h-[calc(100vh-7.5rem)] border border-[var(--mono-line)] bg-[var(--mono-panel)]">
			{/* Conversation list */}
			<div
				className={cn(
					"flex w-full shrink-0 flex-col border-r border-[var(--mono-line)] sm:w-72",
					active && "hidden sm:flex",
				)}
			>
				<div className="flex items-center justify-between px-4 py-3">
					<span className="text-[13px] font-semibold text-[var(--mono-ink)]">
						Messages
					</span>
					<button
						type="button"
						onClick={() => void loadConvs()}
						disabled={loadingConvs}
						aria-label="Refresh"
						className="flex size-7 items-center justify-center rounded-md text-[var(--mono-ink-3)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
					>
						<RotateCw className={cn("size-3.5", loadingConvs && "animate-spin")} />
					</button>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto">
					{convs === null ? (
						<div className="px-4 py-6 text-sm text-[var(--mono-ink-3)]">
							Loading…
						</div>
					) : convs.length === 0 ? (
						<div className="px-4 py-10 text-center text-[13px] text-[var(--mono-ink-3)]">
							No conversations yet. They'll appear here as people DM you.
						</div>
					) : (
						convs.map((c) => (
							<button
								key={c.id}
								type="button"
								onClick={() => void openConv(c)}
								className={cn(
									"flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
									active?.id === c.id
										? "bg-[var(--mono-active)]"
										: "hover:bg-[var(--mono-hover)]",
								)}
							>
								<Avatar name={c.with} />
								<div className="min-w-0 flex-1">
									<div className="flex items-baseline justify-between gap-2">
										<span className="truncate text-[13px] font-semibold text-[var(--mono-ink)]">
											{c.with}
										</span>
										<span className="shrink-0 text-[11px] text-[var(--mono-ink-3)]">
											{ago(c.updated_time)}
										</span>
									</div>
									<div className="truncate text-[12px] text-[var(--mono-ink-3)]">
										{c.snippet || "—"}
									</div>
								</div>
							</button>
						))
					)}
				</div>
			</div>

			{/* Thread */}
			<div className={cn("flex min-w-0 flex-1 flex-col", !active && "hidden sm:flex")}>
				{!active ? (
					<div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
						<div className="flex size-16 items-center justify-center rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-elev)]">
							<MessagesSquare className="size-7 text-[var(--mono-ink-3)]" strokeWidth={1.5} />
						</div>
						<div className="text-sm font-medium text-[var(--mono-ink-2)]">
							Your Instagram DMs
						</div>
						<p className="max-w-xs text-[13px] text-[var(--mono-ink-3)]">
							Pick a conversation on the left to read the thread and reply. New
							messages from your funnels and followers land here.
						</p>
					</div>
				) : (
					<>
						<div className="flex items-center gap-3 border-b border-[var(--mono-line)] px-4 py-3">
							<button
								type="button"
								onClick={() => setActive(null)}
								className="text-[13px] text-[var(--mono-ink-3)] hover:text-[var(--mono-ink)] sm:hidden"
							>
								Back
							</button>
							<Avatar name={active.with} />
							<div className="min-w-0">
								<div className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--mono-ink)]">
									<SiInstagram className="size-3.5" style={{ color: "#E4405F" }} />
									{active.with}
								</div>
							</div>
						</div>

						<div
							ref={threadRef}
							className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-4"
						>
							{loadingMsgs ? (
								<div className="flex h-full items-center justify-center text-sm text-[var(--mono-ink-3)]">
									Loading…
								</div>
							) : (messages ?? []).length === 0 ? (
								<div className="flex h-full items-center justify-center text-[13px] text-[var(--mono-ink-3)]">
									No messages.
								</div>
							) : (
								(messages ?? []).map((m) => (
									<div
										key={m.id}
										className={cn("flex", m.mine ? "justify-end" : "justify-start")}
									>
										<div
											className={cn(
												"max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words",
												m.mine
													? "bg-[var(--mono-ink)] text-[var(--mono-app)]"
													: "border border-[var(--mono-line)] bg-[var(--mono-elev)] text-[var(--mono-ink)]",
											)}
										>
											{m.text || <span className="opacity-50">(no text)</span>}
										</div>
									</div>
								))
							)}
						</div>

						<div className="flex items-center gap-2 border-t border-[var(--mono-line)] p-3">
							<input
								ref={fileRef}
								type="file"
								accept="image/*"
								className="hidden"
								onChange={(e) => {
									const f = e.target.files?.[0];
									e.currentTarget.value = "";
									if (f) void sendImage(f);
								}}
							/>
							<button
								type="button"
								onClick={() => fileRef.current?.click()}
								disabled={sending}
								aria-label="Attach image"
								title="Attach image"
								className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--mono-line)] text-[var(--mono-ink-2)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)] disabled:opacity-50"
							>
								<ImagePlus className="size-4" />
							</button>
							<div className="flex flex-1 items-center rounded-full border border-[var(--mono-line)] bg-[var(--mono-field)] px-4 transition-colors focus-within:border-[var(--mono-strong)]">
								<input
									value={draft}
									onChange={(e) => setDraft(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											e.preventDefault();
											void send();
										}
									}}
									placeholder={`Message ${active.with}…`}
									className="h-10 min-w-0 flex-1 bg-transparent text-sm text-[var(--mono-ink)] outline-none placeholder:text-[var(--mono-ink-3)]"
								/>
							</div>
							<button
								type="button"
								onClick={() => void send()}
								disabled={sending || !draft.trim()}
								aria-label="Send"
								className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--mono-ink)] text-[var(--mono-app)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-25"
							>
								{sending ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<SendHorizontal className="size-4" />
								)}
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
