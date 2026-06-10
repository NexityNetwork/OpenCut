"use client";

import { useSnapIndicatorPosition } from "@/timeline/hooks/use-snap-indicator-position";
import type { SnapPoint } from "@/timeline/snapping";
import {
	getCenteredLineLeft,
	TIMELINE_INDICATOR_LINE_WIDTH_PX,
} from "@/timeline";
import { TIMELINE_LAYERS } from "./layers";
interface SnapIndicatorProps {
	snapPoint: SnapPoint | null;
	zoomLevel: number;
	isVisible: boolean;
	timelineRef: React.RefObject<HTMLDivElement | null>;
	tracksScrollRef: React.RefObject<HTMLDivElement | null>;
}

// A bright amber the dark timeline doesn't otherwise use, so an element-edge
// alignment reads instantly as "you're lined up" — distinct from the (red)
// playhead and the muted primary used for a playhead snap.
const ALIGN_COLOR = "#f5b50a";

export function SnapIndicator({
	snapPoint,
	zoomLevel,
	isVisible,
	timelineRef,
	tracksScrollRef,
}: SnapIndicatorProps) {
	const { leftPosition, topPosition, height } = useSnapIndicatorPosition({
		snapPoint,
		zoomLevel,
		timelineRef,
		tracksScrollRef,
	});

	if (!isVisible || !snapPoint) {
		return null;
	}

	// Aligning one clip's edge to another clip's start/end is the case the user
	// is hunting for ("where does that element end?") — make it pop. A playhead
	// snap keeps the quieter look it always had.
	const isEdgeAlignment =
		snapPoint.type === "element-start" || snapPoint.type === "element-end";

	if (!isEdgeAlignment) {
		return (
			<div
				className="pointer-events-none absolute"
				style={{
					left: `${getCenteredLineLeft({ centerPixel: leftPosition })}px`,
					top: topPosition,
					height: `${height}px`,
					width: `${TIMELINE_INDICATOR_LINE_WIDTH_PX}px`,
					zIndex: TIMELINE_LAYERS.snapIndicator,
				}}
			>
				<div className="bg-primary/40 h-full w-0.5 opacity-80" />
			</div>
		);
	}

	return (
		<div
			className="pointer-events-none absolute"
			style={{
				left: `${leftPosition - 4}px`,
				top: topPosition,
				height: `${height}px`,
				width: "8px",
				zIndex: TIMELINE_LAYERS.snapIndicator,
			}}
		>
			{/* The alignment line itself — full height, glowing so it's obvious. */}
			<div
				className="absolute inset-y-0 left-1/2 -translate-x-1/2"
				style={{
					width: "2px",
					backgroundColor: ALIGN_COLOR,
					boxShadow: `0 0 6px 1px ${ALIGN_COLOR}`,
				}}
			/>
			{/* End caps top & bottom, the way design tools mark a guide. */}
			<div
				className="absolute left-1/2 top-0 -translate-x-1/2"
				style={{
					width: 0,
					height: 0,
					borderLeft: "4px solid transparent",
					borderRight: "4px solid transparent",
					borderTop: `5px solid ${ALIGN_COLOR}`,
				}}
			/>
			<div
				className="absolute bottom-0 left-1/2 -translate-x-1/2"
				style={{
					width: 0,
					height: 0,
					borderLeft: "4px solid transparent",
					borderRight: "4px solid transparent",
					borderBottom: `5px solid ${ALIGN_COLOR}`,
				}}
			/>
		</div>
	);
}
