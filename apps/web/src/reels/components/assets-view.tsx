"use client";

import { useEffect, useRef, useState } from "react";
import { Reorder } from "motion/react";
import { X } from "lucide-react";
import { PanelView } from "@/components/editor/panels/assets/views/base-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { cn } from "@/utils/ui";
import { useEditor } from "@/editor/use-editor";
import { processMediaAssets } from "@/media/processing";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { DEFAULT_NEW_ELEMENT_DURATION } from "@/timeline/creation";
import { mediaTimeFromSeconds } from "@/wasm/media-time";

// Mission Center: describe a reel ("mission"), it queues as a job that renders
// on Azure (ultron-render) and drops the clip on the timeline. Brief in, status,
// clip out — no chat, no templates.
type MissionStatus = "queued" | "generating" | "done" | "failed";

type Mission = {
	id: number;
	text: string;
	brief: string;
	status: MissionStatus;
	executionName?: string;
	outKey?: string;
	error?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const storageKey = (projectId?: string) => `ultron-missions:${projectId ?? "default"}`;

function StatusChip({ mission }: { mission: Mission }) {
	if (mission.status === "generating") {
		return (
			<span className="text-primary flex shrink-0 items-center gap-1 text-[0.65rem] font-medium">
				<Spinner className="size-3" />
				Rendering
			</span>
		);
	}
	const map = {
		queued: { label: "Queued", cls: "text-muted-foreground" },
		done: { label: "Added", cls: "text-emerald-500" },
		failed: { label: "Failed", cls: "text-destructive" },
	} as const;
	const s = map[mission.status as "queued" | "done" | "failed"];
	return (
		<span
			className={cn("shrink-0 text-[0.65rem] font-medium", s.cls)}
			title={mission.status === "failed" ? mission.error : undefined}
		>
			{s.label}
		</span>
	);
}

export function ReelsView() {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActiveOrNull());
	const projectId = activeProject?.metadata.id;

	const [brief, setBrief] = useState("");
	const [launching, setLaunching] = useState(false);
	const [missions, setMissions] = useState<Mission[]>([]);
	const hydrated = useRef(false);
	const polling = useRef<Set<number>>(new Set());
	const missionsRef = useRef<Mission[]>([]);

	useEffect(() => {
		missionsRef.current = missions;
	}, [missions]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		try {
			const raw = localStorage.getItem(storageKey(projectId));
			const list: Mission[] = raw ? JSON.parse(raw) : [];
			setMissions(list);
			for (const m of list) {
				if ((m.status === "generating" || m.status === "queued") && m.executionName && m.outKey) {
					void watch(m.id, m.executionName, m.outKey);
				}
			}
		} catch {
			setMissions([]);
		}
		hydrated.current = true;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [projectId]);

	useEffect(() => {
		if (!hydrated.current || typeof window === "undefined") return;
		localStorage.setItem(storageKey(projectId), JSON.stringify(missions));
	}, [missions, projectId]);

	const patch = (id: number, updates: Partial<Mission>) =>
		setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
	const remove = (id: number) =>
		setMissions((prev) => prev.filter((m) => m.id !== id));

	const watch = async (id: number, executionName: string, outKey: string) => {
		if (polling.current.has(id)) return;
		polling.current.add(id);
		try {
			patch(id, { status: "generating" });
			let status = "Running";
			for (let i = 0; i < 96; i++) {
				await sleep(5000);
				const poll = await fetch(`/api/render?exec=${encodeURIComponent(executionName)}`)
					.then((r) => r.json())
					.catch(() => ({ status: "Running" }));
				status = poll.status || "Running";
				if (status === "Succeeded" || status === "Failed" || status === "Degraded") break;
			}
			if (status !== "Succeeded") throw new Error(`Render ${status.toLowerCase()}`);

			const blob = await fetch(`/api/render/result?key=${encodeURIComponent(outKey)}`).then((r) => {
				if (!r.ok) throw new Error("Could not fetch the rendered video");
				return r.blob();
			});
			const name = (missionsRef.current.find((m) => m.id === id)?.text || "Reel").slice(0, 40);
			const file = new File([blob], `${name}.mp4`, { type: "video/mp4" });
			const [processed] = await processMediaAssets({ files: [file] });
			if (!processed) throw new Error("Could not process the video");
			const asset = await editor.media.addMediaAsset({
				projectId: activeProject!.metadata.id,
				asset: processed,
			});
			if (!asset) throw new Error("Could not save the video");
			const duration =
				asset.duration != null
					? mediaTimeFromSeconds({ seconds: asset.duration })
					: DEFAULT_NEW_ELEMENT_DURATION;
			editor.timeline.insertElement({
				element: buildElementFromMedia({
					mediaId: asset.id,
					mediaType: asset.type,
					name,
					duration,
					startTime: editor.playback.getCurrentTime(),
				}),
				placement: { mode: "auto" },
			});
			patch(id, { status: "done" });
			toast.success(`"${name}" added to the timeline`);
		} catch (error) {
			patch(id, { status: "failed", error: error instanceof Error ? error.message : "Failed" });
		} finally {
			polling.current.delete(id);
		}
	};

	const launch = async () => {
		const text = brief.trim();
		if (!text || !activeProject) {
			if (!activeProject) toast.error("No active project");
			return;
		}
		setLaunching(true);
		const id = Date.now();
		setMissions((prev) => [{ id, text, brief: text, status: "queued" }, ...prev]);
		setBrief("");
		try {
			const start = await fetch("/api/render", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ brief: text }),
			}).then((r) => r.json());
			if (start.error || !start.executionName) {
				throw new Error(start.error || "Could not start the mission");
			}
			patch(id, {
				status: "generating",
				executionName: start.executionName,
				outKey: start.outKey,
				text: start.title || text,
			});
			void watch(id, start.executionName, start.outKey);
		} catch (error) {
			patch(id, { status: "failed", error: error instanceof Error ? error.message : "Failed" });
		} finally {
			setLaunching(false);
		}
	};

	return (
		<PanelView title="Mission Center">
			<div className="flex flex-col gap-2">
				<Textarea
					value={brief}
					onChange={(e) => setBrief(e.target.value)}
					placeholder="Describe a reel to generate…"
					className="min-h-[80px] resize-none"
					maxLength={500}
					onKeyDown={(e) => {
						if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void launch();
					}}
				/>
				<Button
					className="w-full"
					onClick={() => void launch()}
					disabled={launching || brief.trim().length < 3}
				>
					{launching && <Spinner className="mr-1" />}
					{launching ? "Launching…" : "Launch mission"}
				</Button>
			</div>

			{missions.length > 0 && (
				<Reorder.Group
					axis="y"
					values={missions}
					onReorder={setMissions}
					className="mt-4 flex flex-col gap-1.5"
				>
					{missions.map((m, i) => (
						<Reorder.Item
							key={m.id}
							value={m}
							className="border-border bg-secondary/60 flex cursor-grab items-center gap-2 overflow-hidden rounded-lg border px-2.5 py-2 active:cursor-grabbing"
						>
							<span className="text-muted-foreground shrink-0 font-mono text-[0.65rem]">
								{i + 1}
							</span>
							<span className="text-foreground min-w-0 flex-1 truncate text-xs">
								{m.text}
							</span>
							<StatusChip mission={m} />
							<button
								type="button"
								aria-label="Remove mission"
								onClick={() => remove(m.id)}
								onPointerDown={(e) => e.stopPropagation()}
								className="text-muted-foreground hover:text-destructive shrink-0"
							>
								<X className="size-3.5" />
							</button>
						</Reorder.Item>
					))}
				</Reorder.Group>
			)}
		</PanelView>
	);
}
