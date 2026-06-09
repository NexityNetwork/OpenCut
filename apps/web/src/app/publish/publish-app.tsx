"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	LayoutGrid,
	Send,
	Plus,
	RefreshCw,
	Calendar,
	AlertTriangle,
	CheckCircle2,
	Inbox,
} from "lucide-react";
import { SiYoutube, SiInstagram, SiTiktok } from "react-icons/si";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/utils/ui";
import { useSession } from "@/auth/client";

type Job = {
	id: string;
	status: string;
	title: string;
	caption: string;
	platforms: string[];
	when?: number | string;
	thumb?: string;
	error?: string;
	raw: Record<string, unknown>;
};

type Health = {
	ok?: boolean;
	composio_project?: string;
	has_publish_key?: boolean;
	r2?: string;
	d1?: string;
} | null;

function normalize(j: Record<string, unknown>): Job {
	const g = (...keys: string[]) => {
		for (const k of keys) if (j[k] != null && j[k] !== "") return j[k];
		return undefined;
	};
	const status = String(g("status", "state") ?? "queued").toLowerCase();
	const rawP = g("platforms", "channels", "platform", "channel", "targets");
	const platforms = (Array.isArray(rawP) ? rawP : rawP ? [rawP] : []).map(String);
	const caption = String(g("caption", "text", "body") ?? "");
	return {
		id: String(g("id", "uuid", "key") ?? Math.random().toString(36).slice(2)),
		status,
		title: String(g("title", "name") ?? caption.slice(0, 60) ?? "Untitled post"),
		caption,
		platforms,
		when: g("scheduled_at", "scheduledAt", "schedule_at", "created_at", "createdAt", "ts") as
			| number
			| string
			| undefined,
		thumb: g("thumb", "thumbnail", "media_url", "mediaUrl") as string | undefined,
		error: g("error", "last_error") as string | undefined,
		raw: j,
	};
}

const statusColor = (s: string) =>
	/post|publish|done|success|complete/.test(s)
		? "bg-green-500"
		: /fail|error/.test(s)
			? "bg-red-500"
			: /schedul/.test(s)
				? "bg-blue-500"
				: /process|posting|dispatch|running|pending/.test(s)
					? "bg-amber-400"
					: "bg-muted-foreground/50";

function PlatformIcon({ p }: { p: string }) {
	const k = p.toLowerCase();
	if (k.includes("you")) return <SiYoutube className="size-3.5" style={{ color: "#FF0000" }} />;
	if (k.includes("insta")) return <SiInstagram className="size-3.5" style={{ color: "#E4405F" }} />;
	if (k.includes("tik")) return <SiTiktok className="size-3.5" />;
	return null;
}

function rel(t?: number | string) {
	if (!t) return "";
	const d = typeof t === "number" ? t : Date.parse(String(t));
	if (!d || Number.isNaN(d)) return "";
	const diff = d - Date.now();
	const abs = Math.abs(diff);
	const days = Math.round(abs / 86400000);
	const h = Math.round(abs / 3600000);
	const m = Math.max(1, Math.round(abs / 60000));
	const unit = days >= 1 ? `${days}d` : h >= 1 ? `${h}h` : `${m}m`;
	return diff > 0 ? `in ${unit}` : `${unit} ago`;
}

export default function PublishApp() {
	const router = useRouter();
	const { data: session } = useSession();
	const [health, setHealth] = useState<Health>(null);
	const [queue, setQueue] = useState<Job[] | null>(null);
	const [configured, setConfigured] = useState<boolean | null>(null);
	const [selected, setSelected] = useState<Job | null>(null);
	const [refreshing, setRefreshing] = useState(false);

	const load = useCallback(async () => {
		setRefreshing(true);
		try {
			const h = await fetch("/api/publish/health")
				.then((r) => (r.ok ? r.json() : null))
				.catch(() => null);
			setHealth(h);
		} catch {
			setHealth(null);
		}
		try {
			const r = await fetch("/api/publish/queue");
			if (r.status === 401 || r.status === 403) {
				setConfigured(false);
				setQueue([]);
			} else if (r.ok) {
				const d = await r.json().catch(() => ({}));
				const arr: unknown[] = Array.isArray(d)
					? d
					: (d.items ?? d.queue ?? d.jobs ?? d.results ?? []);
				setConfigured(true);
				setQueue(arr.map((x) => normalize(x as Record<string, unknown>)));
			} else {
				setConfigured(false);
				setQueue([]);
			}
		} catch {
			setConfigured(false);
			setQueue([]);
		}
		setRefreshing(false);
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	return (
		<div className="bg-background text-foreground flex h-screen overflow-hidden">
			{/* Sidebar */}
			<aside className="border-border/60 bg-card/30 flex w-72 shrink-0 flex-col border-r">
				<div className="px-4 pt-4 pb-2">
					<Link href="/projects" className="flex items-center text-lg font-bold tracking-tight">
						<span className="text-foreground">Ultron</span>
						<span className="text-muted-foreground ml-1.5 font-medium">Publish</span>
					</Link>
				</div>

				<nav className="space-y-0.5 px-2">
					<Link
						href="/projects"
						className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors"
					>
						<LayoutGrid className="size-4" />
						Library
					</Link>
					<span className="bg-muted text-foreground flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium">
						<Send className="size-4" />
						Publishing
					</span>
				</nav>

				<div className="px-3 py-3">
					<button
						type="button"
						onClick={() => router.push("/projects")}
						className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
					>
						<Plus className="size-4" />
						New post
					</button>
				</div>

				<div className="flex items-center justify-between px-4 pt-2 pb-1">
					<span className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">
						Scheduled
					</span>
					<button
						type="button"
						onClick={() => void load()}
						aria-label="Refresh"
						className="text-muted-foreground hover:text-foreground transition-colors"
					>
						<RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
					</button>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
					{queue === null ? (
						<div className="flex justify-center py-8">
							<Spinner className="text-muted-foreground size-4" />
						</div>
					) : queue.length === 0 ? (
						<div className="text-muted-foreground px-2.5 py-6 text-xs leading-relaxed">
							No scheduled posts yet.
							<br />
							Open a finished project and hit{" "}
							<span className="text-foreground font-medium">Publish</span>.
						</div>
					) : (
						queue.map((job) => (
							<button
								key={job.id}
								type="button"
								onClick={() => setSelected(job)}
								className={cn(
									"group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
									selected?.id === job.id
										? "bg-muted"
										: "hover:bg-muted/60",
								)}
							>
								<span
									className={cn(
										"size-2 shrink-0 rounded-full",
										statusColor(job.status),
									)}
								/>
								<span className="min-w-0 flex-1">
									<span className="block truncate text-sm">{job.title}</span>
									<span className="text-muted-foreground flex items-center gap-1.5 text-[11px]">
										{job.platforms.slice(0, 3).map((p) => (
											<PlatformIcon key={p} p={p} />
										))}
										{rel(job.when) && <span>{rel(job.when)}</span>}
									</span>
								</span>
							</button>
						))
					)}
				</div>

				<div className="border-border/60 border-t px-3 py-3">
					<div className="flex items-center gap-2.5">
						{session?.user?.image ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={session.user.image}
								alt=""
								className="size-7 shrink-0 rounded-full"
							/>
						) : (
							<span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium">
								{(session?.user?.name ?? "U").slice(0, 1)}
							</span>
						)}
						<span className="min-w-0 flex-1">
							<span className="block truncate text-xs font-medium">
								{session?.user?.name ?? "You"}
							</span>
							<span className="text-muted-foreground block truncate text-[11px]">
								{session?.user?.email ?? "Not signed in"}
							</span>
						</span>
					</div>
					<div className="text-muted-foreground mt-2.5 flex items-center gap-1.5 text-[11px]">
						<span
							className={cn(
								"size-1.5 rounded-full",
								health?.ok ? "bg-green-500" : "bg-muted-foreground/50",
							)}
						/>
						{health?.ok ? "Publishing engine online" : "Engine offline"}
					</div>
				</div>
			</aside>

			{/* Detail / overview */}
			<main className="min-w-0 flex-1 overflow-y-auto">
				{selected ? (
					<JobDetail job={selected} onBack={() => setSelected(null)} />
				) : (
					<Overview health={health} configured={configured} count={queue?.length ?? 0} />
				)}
			</main>
		</div>
	);
}

function Overview({
	health,
	configured,
	count,
}: {
	health: Health;
	configured: boolean | null;
	count: number;
}) {
	return (
		<div className="mx-auto max-w-2xl px-8 py-16">
			<h1 className="text-2xl font-semibold tracking-tight">Publishing center</h1>
			<p className="text-muted-foreground mt-1 text-sm">
				Schedule and track posts across your channels. Pick a post on the left to
				see it in full.
			</p>

			<div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div className="border-border/60 bg-card/40 rounded-xl border p-4">
					<div className="text-muted-foreground flex items-center gap-2 text-xs">
						<CheckCircle2 className="size-4" />
						Engine
					</div>
					<div className="mt-1.5 text-lg font-semibold">
						{health?.ok ? "Online" : "Offline"}
					</div>
				</div>
				<div className="border-border/60 bg-card/40 rounded-xl border p-4">
					<div className="text-muted-foreground flex items-center gap-2 text-xs">
						<Calendar className="size-4" />
						Scheduled
					</div>
					<div className="mt-1.5 text-lg font-semibold">{count}</div>
				</div>
				<div className="border-border/60 bg-card/40 rounded-xl border p-4">
					<div className="text-muted-foreground flex items-center gap-2 text-xs">
						<Send className="size-4" />
						Channels
					</div>
					<div className="mt-1.5 flex items-center gap-2 pt-0.5">
						<SiYoutube style={{ color: "#FF0000" }} className="size-4" />
						<SiInstagram style={{ color: "#E4405F" }} className="size-4" />
						<SiTiktok className="size-4" />
					</div>
				</div>
			</div>

			{configured === false && (
				<div className="border-amber-500/30 bg-amber-500/10 mt-6 flex items-start gap-3 rounded-xl border p-4">
					<AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
					<div className="text-sm">
						<div className="font-medium">Live queue not connected yet</div>
						<p className="text-muted-foreground mt-0.5">
							The publishing engine is online, but this app needs its{" "}
							<code className="bg-muted rounded px-1 py-0.5 text-xs">PUBLISH_KEY</code>{" "}
							to sync your scheduled posts and connected channels. One secret to
							set and this lights up.
						</p>
					</div>
				</div>
			)}

			<div className="text-muted-foreground mt-10 flex flex-col items-center gap-2 py-10 text-center">
				<Inbox className="size-8 opacity-60" />
				<p className="text-sm">No post selected</p>
			</div>
		</div>
	);
}

function JobDetail({ job, onBack }: { job: Job; onBack: () => void }) {
	return (
		<div className="mx-auto max-w-2xl px-8 py-10">
			<button
				type="button"
				onClick={onBack}
				className="text-muted-foreground hover:text-foreground mb-6 text-sm md:hidden"
			>
				← Back
			</button>
			<div className="flex items-start justify-between gap-4">
				<h1 className="text-xl font-semibold tracking-tight">{job.title}</h1>
				<span
					className={cn(
						"flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
						/post|done|success/.test(job.status)
							? "bg-green-500/15 text-green-500"
							: /fail|error/.test(job.status)
								? "bg-red-500/15 text-red-500"
								: "bg-muted text-muted-foreground",
					)}
				>
					<span className={cn("size-2 rounded-full", statusColor(job.status))} />
					{job.status}
				</span>
			</div>

			<div className="text-muted-foreground mt-2 flex items-center gap-3 text-sm">
				{job.platforms.map((p) => (
					<span key={p} className="flex items-center gap-1.5 capitalize">
						<PlatformIcon p={p} />
						{p}
					</span>
				))}
				{rel(job.when) && (
					<span className="flex items-center gap-1.5">
						<Calendar className="size-3.5" />
						{rel(job.when)}
					</span>
				)}
			</div>

			{job.thumb && (
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={job.thumb}
					alt=""
					className="bg-muted mt-6 max-h-[50vh] rounded-xl object-contain"
				/>
			)}

			{job.caption && (
				<div className="border-border/60 bg-card/40 mt-6 rounded-xl border p-4">
					<div className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
						Caption
					</div>
					<p className="text-sm leading-relaxed whitespace-pre-wrap">{job.caption}</p>
				</div>
			)}

			{job.error && (
				<div className="border-red-500/30 bg-red-500/10 mt-6 rounded-xl border p-4 text-sm">
					<div className="mb-1 font-medium text-red-500">Error</div>
					<p className="text-muted-foreground whitespace-pre-wrap">{job.error}</p>
				</div>
			)}
		</div>
	);
}
