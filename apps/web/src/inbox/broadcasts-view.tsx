"use client";

// Broadcasting — send a DM to a saved segment. Instagram only delivers to
// contacts who messaged you in the last 24h, so the composer shows the
// reachable count and the engine targets exactly that set.

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Megaphone, Plus, Trash2 } from "lucide-react";
import { cn } from "@/utils/ui";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/inbox/confirm-dialog";
import { uploadBlobToR2 } from "@/canvas-editor/publish-export";
import { fileUrl } from "@/projects/vault-client";

type Segment = { id: string; name: string; size: number; reachable: number };
type Broadcast = {
	id: string;
	name: string;
	message: string;
	status: string;
	sent_count: number;
	target_count: number;
	created_at: number;
};

const STATUS_CLS: Record<string, string> = {
	draft: "bg-[var(--mono-active)] text-[var(--mono-ink-3)]",
	scheduled: "bg-amber-500/15 text-amber-500",
	sending: "bg-sky-500/15 text-sky-500",
	sent: "bg-emerald-500/15 text-emerald-500",
};

export function BroadcastsView({ owner, preview }: { owner: string; preview: boolean }) {
	const [broadcasts, setBroadcasts] = useState<Broadcast[] | null>(null);
	const [segments, setSegments] = useState<Segment[]>([]);
	const [creating, setCreating] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (preview) {
			setBroadcasts([
				{ id: "d1", name: "Launch day", message: "We're live!", status: "sent", sent_count: 142, target_count: 150, created_at: Date.now() - 86400_000 },
			]);
			return;
		}
		try {
			const [b, s] = await Promise.all([
				fetch(`/api/publish/broadcasts?owner=${encodeURIComponent(owner)}`).then((r) => r.json()),
				fetch(`/api/publish/segments?owner=${encodeURIComponent(owner)}`).then((r) => r.json()),
			]);
			setBroadcasts(b.broadcasts ?? []);
			setSegments(s.segments ?? []);
		} catch {
			setBroadcasts([]);
		}
	}, [owner, preview]);

	useEffect(() => {
		void load();
	}, [load]);

	const remove = async (id: string) => {
		setConfirmDelete(null);
		if (preview) return;
		setBroadcasts((prev) => (prev ?? []).filter((x) => x.id !== id));
		try {
			await fetch(`/api/publish/broadcasts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
		} catch {
			void load();
		}
	};

	if (creating) {
		return (
			<BroadcastComposer
				owner={owner}
				preview={preview}
				segments={segments}
				onCancel={() => setCreating(false)}
				onSent={() => {
					setCreating(false);
					void load();
				}}
			/>
		);
	}

	return (
		<div className="mx-auto max-w-2xl px-4 pt-6 pb-16 sm:px-8">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Broadcasts</h1>
					<p className="mt-1 text-sm text-[var(--mono-ink-3)]">
						Message a whole segment at once. Delivered to contacts who messaged
						you in the last 24 hours.
					</p>
				</div>
				<Button onClick={() => setCreating(true)}>
					<Plus className="mr-1.5 size-4" /> New
				</Button>
			</div>

			<div className="mt-6 space-y-3">
				{broadcasts === null ? (
					<div className="py-10 text-center text-sm text-[var(--mono-ink-3)]">Loading…</div>
				) : broadcasts.length === 0 ? (
					<div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-[var(--mono-line)] px-6 py-16 text-center">
						<div className="mb-2 flex size-14 items-center justify-center rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-elev)]">
							<Megaphone className="size-6 text-[var(--mono-ink-3)]" strokeWidth={1.5} />
						</div>
						<div className="text-sm font-medium text-[var(--mono-ink-2)]">No broadcasts yet</div>
						<div className="max-w-xs text-[13px] text-[var(--mono-ink-3)]">
							Build a segment in Contacts, then blast it a message here.
						</div>
					</div>
				) : (
					broadcasts.map((b) => (
						<div
							key={b.id}
							className="flex items-center gap-4 rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-4"
						>
							<div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--mono-hover)] text-[var(--mono-ink-2)]">
								<Megaphone className="size-4" />
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<span className="truncate text-sm font-semibold text-[var(--mono-ink)]">{b.name}</span>
									<span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold capitalize", STATUS_CLS[b.status] ?? STATUS_CLS.draft)}>
										{b.status}
									</span>
								</div>
								<p className="mt-0.5 truncate text-[13px] text-[var(--mono-ink-2)]">{b.message || "Image"}</p>
								<div className="mt-1 text-[11px] text-[var(--mono-ink-3)]">
									{b.sent_count} sent{b.target_count ? ` of ${b.target_count} targeted` : ""}
								</div>
							</div>
							{b.status !== "sending" && (
								<button
									type="button"
									onClick={() => setConfirmDelete(b.id)}
									aria-label="Delete"
									className="flex size-7 shrink-0 items-center justify-center rounded-md text-[var(--mono-ink-3)] transition-colors hover:bg-[var(--mono-hover)] hover:text-red-400"
								>
									<Trash2 className="size-3.5" />
								</button>
							)}
						</div>
					))
				)}
			</div>

			<ConfirmDialog
				open={!!confirmDelete}
				title="Delete broadcast?"
				body="This removes it from the list. Already-sent messages aren't recalled."
				confirmLabel="Delete"
				onConfirm={() => confirmDelete && void remove(confirmDelete)}
				onCancel={() => setConfirmDelete(null)}
			/>
		</div>
	);
}

function BroadcastComposer({
	owner,
	preview,
	segments,
	onCancel,
	onSent,
}: {
	owner: string;
	preview: boolean;
	segments: Segment[];
	onCancel: () => void;
	onSent: () => void;
}) {
	const [name, setName] = useState("");
	const [segmentId, setSegmentId] = useState(segments[0]?.id ?? "");
	const [message, setMessage] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [busy, setBusy] = useState(false);
	const [uploading, setUploading] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	const seg = segments.find((s) => s.id === segmentId);
	const reachable = seg?.reachable ?? 0;

	const attach = async (file: File) => {
		if (!file.type.startsWith("image/")) {
			toast.error("Images only");
			return;
		}
		setUploading(true);
		try {
			const ext = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "jpg";
			const key = await uploadBlobToR2({ data: file, ext, contentType: file.type || "image/jpeg" });
			setImageUrl(`${window.location.origin}${fileUrl(key)}`);
			toast.success("Image attached");
		} catch {
			toast.error("Upload failed");
		} finally {
			setUploading(false);
		}
	};

	const send = async () => {
		if (busy) return;
		if (!message.trim() && !imageUrl) {
			toast.error("Write a message or attach an image");
			return;
		}
		if (preview) {
			toast.error("Preview only — request access to broadcast");
			return;
		}
		setBusy(true);
		try {
			const r = await fetch("/api/publish/broadcasts", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					owner,
					name: name.trim() || "Broadcast",
					segment_id: segmentId || null,
					message: message.trim(),
					image_url: imageUrl || null,
					send_now: true,
				}),
			});
			const d = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; target_count?: number };
			if (!r.ok || !d.ok) throw new Error(d.error || "Couldn't queue broadcast");
			toast.success(`Queued to ${d.target_count ?? reachable} contacts`);
			onSent();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Failed");
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="mx-auto max-w-2xl px-4 pt-6 pb-16 sm:px-8">
			<button
				type="button"
				onClick={onCancel}
				className="mb-4 text-[13px] text-[var(--mono-ink-3)] transition-colors hover:text-[var(--mono-ink)]"
			>
				← Broadcasts
			</button>
			<h1 className="text-2xl font-semibold tracking-tight">New broadcast</h1>

			<div className="mt-6 space-y-5">
				<input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Internal name (e.g. Launch day)"
					className="w-full rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-3.5 py-2.5 text-sm text-[var(--mono-ink)] outline-none placeholder:text-[var(--mono-ink-3)] focus:border-[var(--mono-strong)]"
				/>

				<div>
					<label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-[var(--mono-ink-3)] uppercase">
						Audience
					</label>
					{segments.length === 0 ? (
						<div className="rounded-xl border border-dashed border-[var(--mono-line)] p-3 text-[13px] text-[var(--mono-ink-3)]">
							No segments yet — save one from Contacts. This will go to everyone
							reachable.
						</div>
					) : (
						<select
							value={segmentId}
							onChange={(e) => setSegmentId(e.target.value)}
							className="w-full rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-3.5 py-2.5 text-sm text-[var(--mono-ink)] outline-none"
						>
							<option value="">Everyone reachable</option>
							{segments.map((s) => (
								<option key={s.id} value={s.id}>
									{s.name} ({s.reachable} reachable)
								</option>
							))}
						</select>
					)}
					<p className="mt-1.5 text-[11px] text-[var(--mono-ink-3)]">
						{reachable || "—"} contact{reachable === 1 ? "" : "s"} can receive this
						right now (messaged you within 24h).
					</p>
				</div>

				<div>
					<label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-[var(--mono-ink-3)] uppercase">
						Message
					</label>
					<textarea
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder="What do you want to send?"
						className="min-h-28 w-full resize-none rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--mono-ink)] outline-none placeholder:text-[var(--mono-ink-3)] focus:border-[var(--mono-strong)]"
					/>
				</div>

				<input
					ref={fileRef}
					type="file"
					accept="image/*"
					className="hidden"
					onChange={(e) => {
						const f = e.target.files?.[0];
						e.currentTarget.value = "";
						if (f) void attach(f);
					}}
				/>
				{imageUrl ? (
					<div className="flex items-center gap-3 rounded-xl border border-[var(--mono-line)] p-2">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={imageUrl} alt="" className="size-14 rounded-lg object-cover" />
						<span className="flex-1 text-[13px] text-[var(--mono-ink-2)]">Image attached</span>
						<button
							type="button"
							onClick={() => setImageUrl("")}
							className="text-[13px] text-[var(--mono-ink-3)] hover:text-[var(--mono-ink)]"
						>
							Remove
						</button>
					</div>
				) : (
					<button
						type="button"
						onClick={() => fileRef.current?.click()}
						disabled={uploading}
						className="flex items-center gap-2 rounded-xl border border-[var(--mono-line)] px-3.5 py-2.5 text-[13px] text-[var(--mono-ink-2)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
					>
						{uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
						Attach image
					</button>
				)}
			</div>

			<div className="mt-6 flex justify-end gap-3">
				<Button variant="ghost" onClick={onCancel} disabled={busy}>
					Cancel
				</Button>
				<Button onClick={send} disabled={busy}>
					{busy ? "Sending…" : "Send now"}
				</Button>
			</div>
		</div>
	);
}
