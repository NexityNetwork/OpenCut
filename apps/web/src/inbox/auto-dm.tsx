"use client";

// Instagram comment-to-DM funnels — the ManyChat core, native to Monolith.
// A funnel: keyword comment -> rotated public auto-reply -> auto-DM -> capture
// the lead -> (optional) qualify their reply with GPT. Copy is generated as a
// pool of variations so public replies never repeat (Instagram flags that).

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
	ChevronLeft,
	Loader2,
	Plus,
	Sparkles,
	Trash2,
	Users,
	X,
	Zap,
} from "lucide-react";
import { SiInstagram } from "react-icons/si";
import { cn } from "@/utils/ui";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/inbox/confirm-dialog";

type Funnel = {
	id: string;
	name: string;
	enabled: boolean;
	preset: string;
	post_id: string | null;
	post_thumb: string | null;
	keywords: string[];
	reply_enabled: boolean;
	reply_pool: string[];
	dm_pool: string[];
	dm_link: string | null;
	qualify_enabled: boolean;
	qualify_question: string | null;
	match_count: number;
	lead_count: number;
	created_at: number;
};

type Lead = {
	id: string;
	username: string;
	comment_text: string;
	status: string;
	qualify_summary: string | null;
	score: number | null;
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

type Preset = {
	key: string;
	emoji: string;
	title: string;
	desc: string;
	name: string;
	keywords: string[];
	replySeed: string;
	dmSeed: string;
	qualify: boolean;
	question: string;
};

const PRESETS: Preset[] = [
	{
		key: "lead_magnet",
		emoji: "🧲",
		title: "Lead magnet",
		desc: "Comment a word, get the free resource in DMs.",
		name: "Lead magnet",
		keywords: ["GUIDE"],
		replySeed: "Sent! Check your DMs 📩",
		dmSeed: "Here's the free guide you asked for 🙌",
		qualify: false,
		question: "",
	},
	{
		key: "link",
		emoji: "🔗",
		title: "Link in DM",
		desc: "Push your link through DMs — beats link-in-bio reach.",
		name: "Link in DM",
		keywords: ["LINK"],
		replySeed: "Just DMed you the link!",
		dmSeed: "Here's the link you wanted 👇",
		qualify: false,
		question: "",
	},
	{
		key: "waitlist",
		emoji: "📝",
		title: "Waitlist",
		desc: "Collect signups for a launch or a drop.",
		name: "Waitlist",
		keywords: ["WAITLIST", "ME"],
		replySeed: "You're on the list! check your DMs",
		dmSeed: "You're in 🎉 tap here to lock your spot:",
		qualify: false,
		question: "",
	},
	{
		key: "code",
		emoji: "🎁",
		title: "Discount code",
		desc: "Reward commenters with a promo code.",
		name: "Discount code",
		keywords: ["CODE"],
		replySeed: "Code sent to your DMs 🎁",
		dmSeed: "Here's your code, enjoy 👇",
		qualify: false,
		question: "",
	},
	{
		key: "booking",
		emoji: "📅",
		title: "Book a call",
		desc: "Send your booking link and qualify the lead.",
		name: "Book a call",
		keywords: ["CALL"],
		replySeed: "Sent you the link to grab a time 📅",
		dmSeed: "Happy to chat! Grab a time here:",
		qualify: true,
		question: "What are you hoping to solve on the call?",
	},
	{
		key: "qualify",
		emoji: "✅",
		title: "Qualify & close",
		desc: "Start a real conversation and score the lead.",
		name: "Qualify lead",
		keywords: ["INFO"],
		replySeed: "DMing you now!",
		dmSeed:
			"Glad you reached out! Quick question so I point you the right way —",
		qualify: true,
		question: "What's your biggest challenge with this right now?",
	},
	{
		key: "custom",
		emoji: "✨",
		title: "Start from scratch",
		desc: "Build your own funnel, your way.",
		name: "My funnel",
		keywords: [],
		replySeed: "",
		dmSeed: "",
		qualify: false,
		question: "",
	},
];

const LABEL =
	"mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]";
const FIELD =
	"w-full rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-3.5 py-2.5 text-sm text-[var(--mono-ink)] outline-none transition-colors placeholder:text-[var(--mono-ink-3)] focus:border-[var(--mono-strong)]";

const DEMO_FUNNELS: Funnel[] = [
	{
		id: "demo-1",
		name: "Lead magnet",
		enabled: true,
		preset: "lead_magnet",
		post_id: null,
		post_thumb: null,
		keywords: ["prompts"],
		reply_enabled: true,
		reply_pool: ["Sent you a DM! 📩", "Check your inbox 🙌", "Just slid into your DMs!"],
		dm_pool: ["Here you go! 🙌 [your link]"],
		dm_link: null,
		qualify_enabled: false,
		qualify_question: null,
		match_count: 214,
		lead_count: 214,
		created_at: Date.now() - 5 * 86400_000,
	},
];

const DEMO_LEADS: Lead[] = [
	{
		id: "l1",
		username: "creator.daily",
		comment_text: "prompts please!",
		status: "qualified",
		qualify_summary: "Runs an agency, wants the full pack — strong fit.",
		score: 88,
		created_at: Date.now() - 60 * 60_000,
	},
	{
		id: "l2",
		username: "studio.notes",
		comment_text: "prompts",
		status: "dm_sent",
		qualify_summary: null,
		score: null,
		created_at: Date.now() - 3 * 3600_000,
	},
];

export function AutoDmBuilder({
	owner,
	preview,
}: {
	owner: string;
	preview: boolean;
}) {
	const [funnels, setFunnels] = useState<Funnel[] | null>(null);
	const [media, setMedia] = useState<IgMediaItem[] | null>(null);
	const [mode, setMode] = useState<"list" | "presets" | "form">("list");
	const [preset, setPreset] = useState<Preset | null>(null);
	const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (preview) {
			setFunnels(DEMO_FUNNELS);
			return;
		}
		try {
			const r = await fetch(
				`/api/publish/funnels?owner=${encodeURIComponent(owner)}`,
			);
			const d = (await r.json().catch(() => ({}))) as { funnels?: Funnel[] };
			setFunnels(d.funnels ?? []);
		} catch {
			setFunnels([]);
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

	const startNew = () => {
		if (preview) {
			toast.error("Preview only — request access to build funnels");
			return;
		}
		setMode("presets");
		void loadMedia();
	};

	const choosePreset = (p: Preset) => {
		setPreset(p);
		setMode("form");
	};

	const toggle = async (f: Funnel) => {
		if (preview) return;
		setFunnels((prev) =>
			(prev ?? []).map((x) => (x.id === f.id ? { ...x, enabled: !x.enabled } : x)),
		);
		try {
			await fetch("/api/publish/funnels", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ id: f.id, enabled: !f.enabled }),
			});
		} catch {
			void load();
		}
	};

	const remove = async (id: string) => {
		setConfirmDelete(null);
		if (preview) return;
		setFunnels((prev) => (prev ?? []).filter((x) => x.id !== id));
		try {
			await fetch(`/api/publish/funnels?id=${encodeURIComponent(id)}`, {
				method: "DELETE",
			});
		} catch {
			void load();
		}
	};

	if (mode === "presets") {
		return (
			<div className="mx-auto max-w-3xl px-4 pt-6 pb-16 sm:px-8">
				<button
					type="button"
					onClick={() => setMode("list")}
					className="mb-4 flex items-center gap-1 text-[13px] text-[var(--mono-ink-3)] transition-colors hover:text-[var(--mono-ink)]"
				>
					<ChevronLeft className="size-4" /> Back
				</button>
				<h1 className="text-2xl font-semibold tracking-tight">
					Pick a funnel
				</h1>
				<p className="mt-1 text-sm text-[var(--mono-ink-3)]">
					Proven comment-to-DM plays. Start from one and tweak everything.
				</p>
				<div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
					{PRESETS.map((p) => (
						<button
							key={p.key}
							type="button"
							onClick={() => choosePreset(p)}
							className="group flex items-start gap-3 rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-4 text-left transition-colors hover:border-[var(--mono-strong)] hover:bg-[var(--mono-hover)]"
						>
							<span className="text-2xl leading-none">{p.emoji}</span>
							<div className="min-w-0">
								<div className="text-sm font-semibold text-[var(--mono-ink)]">
									{p.title}
								</div>
								<div className="mt-0.5 text-[13px] text-[var(--mono-ink-3)]">
									{p.desc}
								</div>
							</div>
						</button>
					))}
				</div>
			</div>
		);
	}

	if (mode === "form" && preset) {
		return (
			<FunnelForm
				owner={owner}
				preset={preset}
				media={media}
				onCancel={() => setMode("list")}
				onSaved={() => {
					setMode("list");
					void load();
				}}
			/>
		);
	}

	return (
		<div className="mx-auto max-w-3xl px-4 pt-6 pb-16 sm:px-8">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Funnels</h1>
					<p className="mt-1 text-sm text-[var(--mono-ink-3)]">
						Turn comments into DMs and leads automatically. Keyword in, link
						out, lead captured.
					</p>
				</div>
				<Button onClick={startNew}>
					<Plus className="mr-1.5 size-4" /> New funnel
				</Button>
			</div>

			<div className="mt-6 space-y-3">
				{funnels === null ? (
					<div className="py-10 text-center text-sm text-[var(--mono-ink-3)]">
						Loading…
					</div>
				) : funnels.length === 0 ? (
					<div className="flex flex-col items-center gap-1 rounded-2xl border border-dashed border-[var(--mono-line)] px-6 py-16 text-center">
						<div className="mb-2 flex size-14 items-center justify-center rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-elev)]">
							<Zap className="size-6 text-[var(--mono-ink-3)]" strokeWidth={1.5} />
						</div>
						<div className="text-sm font-medium text-[var(--mono-ink-2)]">
							No funnels yet
						</div>
						<div className="max-w-xs text-[13px] text-[var(--mono-ink-3)]">
							Build one to auto-reply and auto-DM everyone who comments your
							keyword — then watch the leads roll in.
						</div>
						<Button className="mt-4" onClick={startNew}>
							<Plus className="mr-1.5 size-4" /> New funnel
						</Button>
					</div>
				) : (
					funnels.map((f) => (
						<FunnelCard
							key={f.id}
							funnel={f}
							preview={preview}
							onToggle={() => void toggle(f)}
							onDelete={() => setConfirmDelete(f.id)}
						/>
					))
				)}
			</div>

			<ConfirmDialog
				open={!!confirmDelete}
				title="Delete funnel?"
				body="It stops replying and DMing. Captured leads are removed too. This can't be undone."
				confirmLabel="Delete"
				onConfirm={() => confirmDelete && void remove(confirmDelete)}
				onCancel={() => setConfirmDelete(null)}
			/>
		</div>
	);
}

// ---------------------------------------------------------------- Funnel card
function FunnelCard({
	funnel,
	preview,
	onToggle,
	onDelete,
}: {
	funnel: Funnel;
	preview: boolean;
	onToggle: () => void;
	onDelete: () => void;
}) {
	const [showLeads, setShowLeads] = useState(false);
	const [leads, setLeads] = useState<Lead[] | null>(null);

	const loadLeads = useCallback(async () => {
		if (preview) {
			setLeads(DEMO_LEADS);
			return;
		}
		try {
			const r = await fetch(
				`/api/publish/funnels/leads?funnel=${encodeURIComponent(funnel.id)}`,
			);
			const d = (await r.json().catch(() => ({}))) as { leads?: Lead[] };
			setLeads(d.leads ?? []);
		} catch {
			setLeads([]);
		}
	}, [funnel.id, preview]);

	const toggleLeads = () => {
		const next = !showLeads;
		setShowLeads(next);
		if (next && leads === null) void loadLeads();
	};

	return (
		<div className="rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-panel)]">
			<div className="flex items-start gap-4 p-4">
				<div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-[var(--mono-line)] bg-[var(--mono-hover)]">
					{funnel.post_thumb ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img
							src={funnel.post_thumb}
							alt=""
							className="size-full object-cover"
						/>
					) : (
						<div className="flex size-full items-center justify-center">
							<SiInstagram className="size-5" style={{ color: "#E4405F" }} />
						</div>
					)}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="truncate text-sm font-semibold text-[var(--mono-ink)]">
							{funnel.name}
						</span>
						{funnel.qualify_enabled && (
							<span className="rounded-md bg-[var(--mono-active)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--mono-ink-2)]">
								QUALIFIES
							</span>
						)}
					</div>
					<div className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px]">
						<span className="text-[var(--mono-ink-3)]">Comment</span>
						{funnel.keywords.length ? (
							funnel.keywords.map((k) => (
								<span
									key={k}
									className="rounded-md bg-[var(--mono-active)] px-1.5 py-0.5 font-semibold text-[var(--mono-ink)]"
								>
									{k}
								</span>
							))
						) : (
							<span className="rounded-md bg-[var(--mono-active)] px-1.5 py-0.5 font-semibold text-[var(--mono-ink)]">
								anything
							</span>
						)}
						<span className="text-[var(--mono-ink-3)]">
							on {funnel.post_id ? "this post" : "any recent post"} → DM
						</span>
					</div>
					<div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[var(--mono-ink-3)]">
						<button
							type="button"
							onClick={toggleLeads}
							className="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
						>
							<Users className="size-3" /> {funnel.lead_count} lead
							{funnel.lead_count === 1 ? "" : "s"}
						</button>
						{funnel.reply_enabled && <span>· auto-replies publicly</span>}
						{funnel.dm_link && <span>· sends a link</span>}
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-1">
					<button
						type="button"
						onClick={onToggle}
						title={funnel.enabled ? "Pause" : "Resume"}
						className={cn(
							"relative h-5 w-9 rounded-full transition-colors",
							funnel.enabled ? "bg-[var(--mono-strong)]" : "bg-[var(--mono-line)]",
						)}
					>
						<span
							className={cn(
								"absolute top-0.5 size-4 rounded-full bg-[var(--mono-app)] transition-transform",
								funnel.enabled ? "translate-x-4" : "translate-x-0.5",
							)}
						/>
					</button>
					<button
						type="button"
						onClick={onDelete}
						aria-label="Delete"
						className="flex size-7 items-center justify-center rounded-md text-[var(--mono-ink-3)] transition-colors hover:bg-[var(--mono-hover)] hover:text-red-400"
					>
						<Trash2 className="size-3.5" />
					</button>
				</div>
			</div>

			{showLeads && (
				<div className="border-t border-[var(--mono-line)] px-4 py-3">
					{leads === null ? (
						<div className="py-4 text-center text-[13px] text-[var(--mono-ink-3)]">
							Loading leads…
						</div>
					) : leads.length === 0 ? (
						<div className="py-4 text-center text-[13px] text-[var(--mono-ink-3)]">
							No leads captured yet.
						</div>
					) : (
						<div className="space-y-2">
							{leads.map((l) => (
								<LeadRow key={l.id} lead={l} />
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function LeadRow({ lead }: { lead: Lead }) {
	return (
		<div className="flex items-start gap-3 rounded-xl bg-[var(--mono-hover)] px-3 py-2">
			<div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--mono-line)] bg-[var(--mono-elev)] text-[11px] font-semibold text-[var(--mono-ink-2)] uppercase">
				{(lead.username || "?").slice(0, 1)}
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="truncate text-[13px] font-semibold text-[var(--mono-ink)]">
						{lead.username || "instagram user"}
					</span>
					<StatusBadge status={lead.status} score={lead.score} />
				</div>
				<p className="mt-0.5 truncate text-[12px] text-[var(--mono-ink-3)]">
					{lead.qualify_summary || `commented "${lead.comment_text}"`}
				</p>
			</div>
		</div>
	);
}

function StatusBadge({ status, score }: { status: string; score: number | null }) {
	const map: Record<string, { label: string; cls: string }> = {
		new: { label: "New", cls: "bg-[var(--mono-active)] text-[var(--mono-ink-2)]" },
		dm_sent: { label: "DM sent", cls: "bg-[var(--mono-active)] text-[var(--mono-ink-2)]" },
		engaged: { label: "Engaged", cls: "bg-amber-500/15 text-amber-500" },
		qualified: {
			label: score ? `Qualified · ${score}` : "Qualified",
			cls: "bg-emerald-500/15 text-emerald-500",
		},
		unqualified: { label: "Not a fit", cls: "bg-[var(--mono-line)] text-[var(--mono-ink-3)]" },
	};
	const s = map[status] ?? map.new;
	return (
		<span
			className={cn(
				"shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
				s.cls,
			)}
		>
			{s.label}
		</span>
	);
}

// ---------------------------------------------------------------- Funnel form
function FunnelForm({
	owner,
	preset,
	media,
	onCancel,
	onSaved,
}: {
	owner: string;
	preset: Preset;
	media: IgMediaItem[] | null;
	onCancel: () => void;
	onSaved: () => void;
}) {
	const [name, setName] = useState(preset.name);
	const [postId, setPostId] = useState<string>("");
	const [keywords, setKeywords] = useState<string[]>(preset.keywords);
	const [replyEnabled, setReplyEnabled] = useState(true);
	const [replySeed, setReplySeed] = useState(preset.replySeed);
	const [replyPool, setReplyPool] = useState<string[]>([]);
	const [dmSeed, setDmSeed] = useState(preset.dmSeed);
	const [dmPool, setDmPool] = useState<string[]>([]);
	const [dmLink, setDmLink] = useState("");
	const [qualify, setQualify] = useState(preset.qualify);
	const [question, setQuestion] = useState(preset.question);
	const [busy, setBusy] = useState(false);
	const [genReply, setGenReply] = useState(false);
	const [genDm, setGenDm] = useState(false);

	const selectedThumb = useMemo(() => {
		const m = (media ?? []).find((x) => x.id === postId);
		return m?.thumbnail_url || m?.media_url || null;
	}, [media, postId]);

	const generate = async (kind: "reply" | "dm") => {
		const base = (kind === "reply" ? replySeed : dmSeed).trim();
		if (!base) {
			toast.error(
				kind === "reply"
					? "Write a reply first, then generate"
					: "Write a DM first, then generate",
			);
			return;
		}
		const setGen = kind === "reply" ? setGenReply : setGenDm;
		setGen(true);
		try {
			const r = await fetch("/api/funnel-ai", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					action: "variations",
					base,
					kind,
					count: kind === "reply" ? 12 : 8,
					link: kind === "dm" ? dmLink.trim() : "",
					owner,
				}),
			});
			const d = (await r.json().catch(() => ({}))) as {
				variations?: string[];
				error?: string;
			};
			if (!r.ok) throw new Error(d.error || "Couldn't generate");
			const pool = d.variations ?? [];
			if (kind === "reply") setReplyPool(pool);
			else setDmPool(pool);
			toast.success(`${pool.length} variations ready`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't generate");
		} finally {
			setGen(false);
		}
	};

	const save = async () => {
		if (busy) return;
		const finalReplyPool = replyEnabled
			? replyPool.length
				? replyPool
				: replySeed.trim()
					? [replySeed.trim()]
					: []
			: [];
		const finalDmPool = dmPool.length
			? dmPool
			: dmSeed.trim()
				? [dmSeed.trim()]
				: [];
		if (finalDmPool.length === 0) {
			toast.error("Write the DM to send");
			return;
		}
		if (qualify && !question.trim()) {
			toast.error("Add the question to ask, or turn off qualifying");
			return;
		}
		setBusy(true);
		try {
			const r = await fetch("/api/publish/funnels", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					owner,
					name: name.trim() || preset.name,
					preset: preset.key,
					post_id: postId || null,
					post_thumb: selectedThumb,
					keywords,
					reply_enabled: replyEnabled,
					reply_pool: finalReplyPool,
					dm_pool: finalDmPool,
					dm_link: dmLink.trim() || null,
					qualify_enabled: qualify,
					qualify_question: qualify ? question.trim() : null,
					enabled: true,
				}),
			});
			const d = (await r.json().catch(() => ({}))) as {
				ok?: boolean;
				error?: string;
			};
			if (!r.ok || !d.ok) throw new Error(d.error || "Couldn't save");
			toast.success("Funnel is live");
			onSaved();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Couldn't save");
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="mx-auto max-w-2xl px-4 pt-6 pb-16 sm:px-8">
			<button
				type="button"
				onClick={onCancel}
				className="mb-4 flex items-center gap-1 text-[13px] text-[var(--mono-ink-3)] transition-colors hover:text-[var(--mono-ink)]"
			>
				<ChevronLeft className="size-4" /> Funnels
			</button>

			<div className="flex items-center gap-2">
				<span className="text-2xl leading-none">{preset.emoji}</span>
				<input
					value={name}
					onChange={(e) => setName(e.target.value)}
					className="min-w-0 flex-1 bg-transparent text-2xl font-semibold tracking-tight text-[var(--mono-ink)] outline-none"
				/>
			</div>

			<div className="mt-6 space-y-6">
				{/* Post picker */}
				<div>
					<label className={LABEL}>On which post</label>
					<PostPicker
						media={media}
						postId={postId}
						onSelect={setPostId}
					/>
				</div>

				{/* Keywords */}
				<div>
					<label className={LABEL}>Trigger keywords</label>
					<KeywordChips keywords={keywords} onChange={setKeywords} />
					<p className="mt-1.5 text-[11px] text-[var(--mono-ink-3)]">
						A comment containing any of these starts the funnel. Leave empty to
						match every comment.
					</p>
				</div>

				{/* Public reply */}
				<div className="rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-4">
					<Toggle
						on={replyEnabled}
						onChange={setReplyEnabled}
						label="Auto-reply publicly"
						hint="Posts under their comment so others see the funnel works. Rotated so it never repeats."
					/>
					{replyEnabled && (
						<div className="mt-3 space-y-3">
							<div className="flex gap-2">
								<input
									value={replySeed}
									onChange={(e) => setReplySeed(e.target.value)}
									placeholder="Sent you a DM! 📩"
									className={cn(FIELD, "flex-1")}
								/>
								<GenButton
									busy={genReply}
									onClick={() => void generate("reply")}
								/>
							</div>
							<VariationPool
								pool={replyPool}
								onRemove={(i) =>
									setReplyPool((p) => p.filter((_, j) => j !== i))
								}
								emptyHint="Add a line and tap Vary so each public reply is unique."
							/>
						</div>
					)}
				</div>

				{/* DM */}
				<div className="rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-4">
					<div className="mb-1 text-[13px] font-semibold text-[var(--mono-ink)]">
						The DM
					</div>
					<div className="mb-3 text-[12px] text-[var(--mono-ink-3)]">
						Sent straight to anyone who triggers the funnel.
					</div>
					<div className="space-y-3">
						<div className="flex gap-2">
							<textarea
								value={dmSeed}
								onChange={(e) => setDmSeed(e.target.value)}
								placeholder="Here's the link you asked for 🙌"
								className={cn(FIELD, "min-h-20 flex-1 resize-none leading-relaxed")}
							/>
							<GenButton busy={genDm} onClick={() => void generate("dm")} />
						</div>
						<input
							value={dmLink}
							onChange={(e) => setDmLink(e.target.value)}
							placeholder="Link to include (optional) — e.g. https://…"
							className={FIELD}
						/>
						<VariationPool
							pool={dmPool}
							onRemove={(i) => setDmPool((p) => p.filter((_, j) => j !== i))}
							emptyHint="Tap Vary to spin up natural DM variations (the link is baked in)."
						/>
					</div>
				</div>

				{/* Qualify */}
				<div className="rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-4">
					<Toggle
						on={qualify}
						onChange={setQualify}
						label="Qualify the lead with AI"
						hint="Adds a question to the DM, then scores their reply so you see hot leads first."
					/>
					{qualify && (
						<input
							value={question}
							onChange={(e) => setQuestion(e.target.value)}
							placeholder="What's your biggest challenge right now?"
							className={cn(FIELD, "mt-3")}
						/>
					)}
				</div>
			</div>

			<div className="mt-6 flex justify-end gap-3">
				<Button variant="ghost" onClick={onCancel} disabled={busy}>
					Cancel
				</Button>
				<Button onClick={save} disabled={busy}>
					{busy ? "Saving…" : "Turn on"}
				</Button>
			</div>
		</div>
	);
}

// ------------------------------------------------------------- sub-components
function GenButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={busy}
			className="flex h-[2.7rem] shrink-0 items-center gap-1.5 self-start rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-3 text-[13px] font-medium text-[var(--mono-ink-2)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)] disabled:opacity-50"
		>
			{busy ? (
				<Loader2 className="size-3.5 animate-spin" />
			) : (
				<Sparkles className="size-3.5" />
			)}
			Vary
		</button>
	);
}

function VariationPool({
	pool,
	onRemove,
	emptyHint,
}: {
	pool: string[];
	onRemove: (i: number) => void;
	emptyHint: string;
}) {
	if (pool.length === 0) {
		return (
			<p className="text-[11px] text-[var(--mono-ink-3)]">{emptyHint}</p>
		);
	}
	return (
		<div className="space-y-1.5">
			<div className="text-[11px] font-medium text-[var(--mono-ink-3)]">
				{pool.length} variations · sent at random
			</div>
			<div className="flex flex-wrap gap-1.5">
				{pool.map((v, i) => (
					<span
						key={`${i}-${v.slice(0, 8)}`}
						className="group flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--mono-line)] bg-[var(--mono-field)] py-1 pr-1 pl-2.5 text-[12px] text-[var(--mono-ink-2)]"
					>
						<span className="truncate">{v}</span>
						<button
							type="button"
							onClick={() => onRemove(i)}
							aria-label="Remove variation"
							className="flex size-4 shrink-0 items-center justify-center rounded text-[var(--mono-ink-3)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
						>
							<X className="size-3" />
						</button>
					</span>
				))}
			</div>
		</div>
	);
}

function KeywordChips({
	keywords,
	onChange,
}: {
	keywords: string[];
	onChange: (k: string[]) => void;
}) {
	const [draft, setDraft] = useState("");
	const add = () => {
		const v = draft.trim().replace(/,$/, "").trim();
		if (!v) return;
		if (!keywords.some((k) => k.toLowerCase() === v.toLowerCase())) {
			onChange([...keywords, v]);
		}
		setDraft("");
	};
	return (
		<div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-2.5 py-2 focus-within:border-[var(--mono-strong)]">
			{keywords.map((k) => (
				<span
					key={k}
					className="flex items-center gap-1 rounded-lg bg-[var(--mono-active)] py-1 pr-1 pl-2 text-[13px] font-medium text-[var(--mono-ink)]"
				>
					{k}
					<button
						type="button"
						onClick={() => onChange(keywords.filter((x) => x !== k))}
						aria-label={`Remove ${k}`}
						className="flex size-4 items-center justify-center rounded text-[var(--mono-ink-3)] transition-colors hover:bg-[var(--mono-hover)] hover:text-[var(--mono-ink)]"
					>
						<X className="size-3" />
					</button>
				</span>
			))}
			<input
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === ",") {
						e.preventDefault();
						add();
					}
					if (e.key === "Backspace" && !draft && keywords.length) {
						onChange(keywords.slice(0, -1));
					}
				}}
				onBlur={add}
				placeholder={keywords.length ? "" : "Type a keyword, press Enter"}
				className="h-7 min-w-[8rem] flex-1 bg-transparent px-1 text-sm text-[var(--mono-ink)] outline-none placeholder:text-[var(--mono-ink-3)]"
			/>
		</div>
	);
}

function Toggle({
	on,
	onChange,
	label,
	hint,
}: {
	on: boolean;
	onChange: (v: boolean) => void;
	label: string;
	hint: string;
}) {
	return (
		<div className="flex items-start justify-between gap-4">
			<div className="min-w-0">
				<div className="text-[13px] font-semibold text-[var(--mono-ink)]">
					{label}
				</div>
				<div className="mt-0.5 text-[12px] text-[var(--mono-ink-3)]">{hint}</div>
			</div>
			<button
				type="button"
				onClick={() => onChange(!on)}
				className={cn(
					"relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors",
					on ? "bg-[var(--mono-strong)]" : "bg-[var(--mono-line)]",
				)}
			>
				<span
					className={cn(
						"absolute top-0.5 size-4 rounded-full bg-[var(--mono-app)] transition-transform",
						on ? "translate-x-4" : "translate-x-0.5",
					)}
				/>
			</button>
		</div>
	);
}

function PostPicker({
	media,
	postId,
	onSelect,
}: {
	media: IgMediaItem[] | null;
	postId: string;
	onSelect: (id: string) => void;
}) {
	return (
		<div className="flex gap-2 overflow-x-auto pb-1">
			<button
				type="button"
				onClick={() => onSelect("")}
				className={cn(
					"flex aspect-square w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border text-[11px] font-medium transition-colors",
					postId === ""
						? "border-[var(--mono-strong)] bg-[var(--mono-active)] text-[var(--mono-ink)]"
						: "border-[var(--mono-line)] text-[var(--mono-ink-3)] hover:bg-[var(--mono-hover)]",
				)}
			>
				<Zap className="size-4" />
				Any post
			</button>
			{media === null ? (
				<div className="flex h-20 items-center px-3 text-[12px] text-[var(--mono-ink-3)]">
					Loading posts…
				</div>
			) : (
				media.map((m) => {
					const thumb = m.thumbnail_url || m.media_url;
					const on = postId === m.id;
					return (
						<button
							key={m.id}
							type="button"
							onClick={() => onSelect(m.id)}
							title={m.caption || "Post"}
							className={cn(
								"relative aspect-square w-20 shrink-0 overflow-hidden rounded-xl border transition-all",
								on
									? "border-[var(--mono-strong)] ring-2 ring-[var(--mono-strong)]"
									: "border-[var(--mono-line)] hover:opacity-90",
							)}
						>
							{thumb ? (
								// eslint-disable-next-line @next/next/no-img-element
								<img src={thumb} alt="" className="size-full object-cover" />
							) : (
								<div className="flex size-full items-center justify-center bg-[var(--mono-hover)]">
									<SiInstagram className="size-4" style={{ color: "#E4405F" }} />
								</div>
							)}
							{m.comments_count > 0 && (
								<span className="absolute right-1 bottom-1 rounded bg-black/65 px-1 text-[9px] font-semibold text-white">
									{m.comments_count}
								</span>
							)}
						</button>
					);
				})
			)}
		</div>
	);
}
