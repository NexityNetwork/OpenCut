"use client";

// Faint vertical guide lines at every clip edge, shown while dragging or
// resizing — so you can see the alignment targets across all layers (the
// "builder" feel), not just the single bright line at the moment you snap.

import { useMemo } from "react";
import { useContainerSize } from "@/hooks/use-container-size";
import {
	getCenteredLineLeft,
	timelineTimeToSnappedPixels,
	type TimelineTrack,
} from "@/timeline";
import { TIMELINE_TRACK_LABELS_COLUMN_WIDTH_PX } from "@/timeline/components/layout";
import { useScrollPosition } from "@/timeline/hooks/use-scroll-position";
import { addMediaTime } from "@/wasm";
import { TIMELINE_LAYERS } from "./layers";

interface AlignmentGuidesProps {
	tracks: TimelineTrack[];
	zoomLevel: number;
	isVisible: boolean;
	excludeIds: Set<string>;
	timelineRef: React.RefObject<HTMLDivElement | null>;
	tracksScrollRef: React.RefObject<HTMLDivElement | null>;
}

export function AlignmentGuides({
	tracks,
	zoomLevel,
	isVisible,
	excludeIds,
	timelineRef,
	tracksScrollRef,
}: AlignmentGuidesProps) {
	const { height: timelineHeight } = useContainerSize({
		containerRef: timelineRef,
	});
	const { scrollLeft } = useScrollPosition({ scrollRef: tracksScrollRef });

	// Every distinct start/end edge of the other clips (deduped by tick).
	const edges = useMemo(() => {
		if (!isVisible) return [];
		const byTick = new Map<number, number>();
		for (const track of tracks) {
			for (const el of track.elements) {
				if (excludeIds.has(el.id)) continue;
				const start = el.startTime;
				const end = addMediaTime({ a: el.startTime, b: el.duration });
				byTick.set(Number(start), start);
				byTick.set(Number(end), end);
			}
		}
		return [...byTick.values()];
	}, [tracks, excludeIds, isVisible]);

	if (!isVisible || edges.length === 0) return null;
	const height = (timelineHeight || 400) - 8;

	return (
		<>
			{edges.map((time) => {
				const left =
					TIMELINE_TRACK_LABELS_COLUMN_WIDTH_PX +
					timelineTimeToSnappedPixels({ time, zoomLevel }) -
					scrollLeft;
				return (
					<div
						key={String(time)}
						className="pointer-events-none absolute"
						style={{
							left: `${getCenteredLineLeft({ centerPixel: left })}px`,
							top: 0,
							height: `${height}px`,
							width: "1px",
							zIndex: TIMELINE_LAYERS.snapIndicator - 1,
						}}
					>
						<div className="bg-foreground/15 h-full w-px" />
					</div>
				);
			})}
		</>
	);
}
