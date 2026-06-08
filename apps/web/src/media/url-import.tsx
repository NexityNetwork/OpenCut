"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link as LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useEditor } from "@/editor/use-editor";
import { processMediaAssets } from "@/media/processing";
import { buildElementFromMedia } from "@/timeline/element-utils";
import { DEFAULT_NEW_ELEMENT_DURATION } from "@/timeline/creation";
import { mediaTimeFromSeconds } from "@/wasm/media-time";
import { cn } from "@/utils/ui";

const isInstagram = (s: string) => /instagram\.com/i.test(s);
const isInstagramPost = (s: string) =>
	/instagram\.com\/(reel|reels|p|tv)\//i.test(s);

export function UrlImport({
	mode,
	insertToTimeline = false,
	className,
}: {
	mode: "audio" | "video";
	insertToTimeline?: boolean;
	className?: string;
}) {
	const editor = useEditor();
	const activeProject = useEditor((e) => e.project.getActiveOrNull());
	const [url, setUrl] = useState("");
	const [busy, setBusy] = useState(false);

	const grabToFile = async (
		mediaUrl: string,
		type: "video" | "image",
		name: string,
	) => {
		const g = await fetch("/api/import-from-url/instagram/grab", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ url: mediaUrl }),
		});
		const gd = (await g.json().catch(() => ({}))) as {
			key?: string;
			ext?: string;
			contentType?: string;
			error?: string;
		};
		if (!g.ok || !gd.key) throw new Error(gd.error || "Couldn't fetch media");
		const fr = await fetch(
			`/api/import-from-url/file?key=${encodeURIComponent(gd.key)}`,
		);
		if (!fr.ok) throw new Error("Couldn't fetch the imported file");
		const blob = await fr.blob();
		const ext = gd.ext || (type === "video" ? "mp4" : "jpg");
		return new File([blob], `${name}.${ext}`, {
			type:
				gd.contentType ||
				blob.type ||
				(type === "video" ? "video/mp4" : "image/jpeg"),
		});
	};

	const importInstagram = async (link: string) => {
		setBusy(true);
		const tid = toast.loading("Fetching from Instagram…");
		try {
			const res = await fetch("/api/import-from-url/instagram", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ url: link }),
			});
			const data = (await res.json().catch(() => ({}))) as {
				kind?: string;
				title?: string;
				media?: { type: "video" | "image"; url: string }[];
				error?: string;
			};
			if (!res.ok || !data.media?.length) {
				throw new Error(data.error || "Couldn't import that link");
			}
			const base =
				(data.title || "Instagram").replace(/[^\w\s.-]+/g, " ").trim().slice(0, 50) ||
				"Instagram";
			const files: File[] = [];
			let n = 0;
			for (const m of data.media) {
				const name = data.media.length > 1 ? `${base} ${++n}` : base;
				files.push(await grabToFile(m.url, m.type, name));
			}
			const processed = await processMediaAssets({ files });
			for (const asset of processed) {
				await editor.media.addMediaAsset({
					projectId: activeProject?.metadata.id ?? "",
					asset,
				});
			}
			toast.success(
				data.kind === "carousel"
					? `Imported ${processed.length} slides`
					: `Imported "${base}"`,
				{ id: tid },
			);
			setUrl("");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Import failed", { id: tid });
		} finally {
			setBusy(false);
		}
	};

	const submit = async () => {
		const link = url.trim();
		if (!link || busy) return;

		if (isInstagram(link)) {
			if (mode !== "video") {
				toast.error("Instagram is video — paste it in the Media tab");
				return;
			}
			if (!isInstagramPost(link)) {
				toast.error("Paste a specific Instagram reel or post link");
				return;
			}
			if (!activeProject) {
				toast.error("No active project");
				return;
			}
			await importInstagram(link);
			return;
		}

		if (!/^https?:\/\//i.test(link)) {
			toast.error("Paste a full link (https://…)");
			return;
		}
		if (!activeProject) {
			toast.error("No active project");
			return;
		}
		setBusy(true);
		try {
			const res = await fetch("/api/import-from-url", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ url: link, mode }),
			});
			const meta = (await res.json().catch(() => ({}))) as {
				key?: string;
				title?: string;
				ext?: string;
				contentType?: string;
				error?: string;
			};
			if (!res.ok || !meta.key) {
				throw new Error(meta.error || "Couldn't import that link");
			}
			const fileRes = await fetch(
				`/api/import-from-url/file?key=${encodeURIComponent(meta.key)}`,
			);
			if (!fileRes.ok) throw new Error("Couldn't fetch the imported file");
			const blob = await fileRes.blob();
			const safe =
				(meta.title || "Imported")
					.replace(/[^\w\s.-]+/g, " ")
					.trim()
					.slice(0, 60) || "Imported";
			const ext = meta.ext || (mode === "video" ? "mp4" : "mp3");
			const file = new File([blob], `${safe}.${ext}`, {
				type:
					meta.contentType ||
					blob.type ||
					(mode === "video" ? "video/mp4" : "audio/mpeg"),
			});
			const [processed] = await processMediaAssets({ files: [file] });
			if (!processed) throw new Error("Couldn't process the media");
			const asset = await editor.media.addMediaAsset({
				projectId: activeProject.metadata.id,
				asset: processed,
			});
			if (!asset) throw new Error("Couldn't save to your library");
			if (insertToTimeline) {
				const duration =
					asset.duration != null
						? mediaTimeFromSeconds({ seconds: asset.duration })
						: DEFAULT_NEW_ELEMENT_DURATION;
				editor.timeline.insertElement({
					element: buildElementFromMedia({
						mediaId: asset.id,
						mediaType: asset.type,
						name: asset.name,
						duration,
						startTime: editor.playback.getCurrentTime(),
					}),
					placement: { mode: "auto" },
				});
			}
			toast.success(`Imported "${asset.name}"`);
			setUrl("");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Import failed");
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className={cn("flex items-center gap-2", className)}>
			<Input
				value={url}
				onChange={(e) => setUrl(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						void submit();
					}
				}}
				placeholder={
					mode === "video"
						? "Paste a video or Instagram link…"
						: "Paste a YouTube or music link…"
				}
				disabled={busy}
				className="w-full"
				containerClassName="w-full"
			/>
			<button
				type="button"
				onClick={() => void submit()}
				disabled={busy || !url.trim()}
				title={mode === "video" ? "Import video from link" : "Import audio from link"}
				aria-label="Import from link"
				className="border-input bg-accent text-muted-foreground hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-md border disabled:opacity-50"
			>
				{busy ? <Spinner className="size-4" /> : <LinkIcon className="size-4" />}
			</button>
		</div>
	);
}
