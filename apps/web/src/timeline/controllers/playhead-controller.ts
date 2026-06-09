import type { MouseEvent as ReactMouseEvent } from "react";
import type { FrameRate } from "opencut-wasm";
import {
	mediaTime,
	snapSeekMediaTime,
	TICKS_PER_SECOND,
	type MediaTime,
} from "@/wasm";
import {
	buildTimelineSnapPoints,
	getTimelineSnapThresholdInTicks,
	resolveTimelineSnap,
	type SnapPoint,
} from "@/timeline/snapping";
import { getBookmarkSnapPoints } from "@/timeline/bookmarks/index";
import { getElementEdgeSnapPoints } from "@/timeline/element-snap-source";
import { getAnimationKeyframeSnapPointsForTimeline } from "@/timeline/animation-snap-points";
import {
	getCenteredLineLeft,
	timelineTimeToPixels,
	timelineTimeToSnappedPixels,
} from "@/timeline";
import { BASE_TIMELINE_PIXELS_PER_SECOND } from "@/timeline/scale";
import type { Bookmark, SceneTracks } from "@/timeline";

// --- Session ---

interface ScrubSession {
	kind: "scrubbing";
	/** True when scrub started from a ruler click (not the playhead handle). */
	didStartFromRuler: boolean;
	/** True once the mouse has moved during a ruler drag. */
	hasMoved: boolean;
	/** Most recent frame-snapped time set by scrub(). */
	currentTime: MediaTime | null;
	/** Snap targets captured once at drag start — elements don't move while scrubbing. */
	snapPoints: SnapPoint[];
}

type Session = { kind: "idle" } | ScrubSession;

// --- Config ---

export interface PlayheadConfig {
	zoomLevel: number;
	duration: MediaTime;
	getActiveProjectFps: () => FrameRate | null;
	isShiftHeld: () => boolean;
	getIsPlaying: () => boolean;
	getRulerEl: () => HTMLDivElement | null;
	getRulerScrollEl: () => HTMLDivElement | null;
	getTracksScrollEl: () => HTMLDivElement | null;
	getPlayheadEl: () => HTMLDivElement | null;
	getSceneTracks: () => SceneTracks;
	getSceneBookmarks: () => Bookmark[];
	seek: (time: MediaTime) => void;
	setScrubbing: (isScrubbing: boolean) => void;
	setTimelineViewState: (viewState: {
		zoomLevel: number;
		scrollLeft: number;
		playheadTime: MediaTime;
	}) => void;
}

export interface PlayheadConfigRef {
	readonly current: PlayheadConfig;
}

// --- Pure helpers (px → logical) ---

function pixelToTime({
	clientX,
	rulerEl,
	zoomLevel,
	duration,
}: {
	clientX: number;
	rulerEl: HTMLDivElement;
	zoomLevel: number;
	duration: MediaTime;
}): MediaTime {
	const rulerRect = rulerEl.getBoundingClientRect();
	const contentWidth = timelineTimeToPixels({ time: duration, zoomLevel });
	const clampedX = Math.max(
		0,
		Math.min(contentWidth, clientX - rulerRect.left),
	);
	const seconds = Math.max(
		0,
		Math.min(
			duration / TICKS_PER_SECOND,
			clampedX / (BASE_TIMELINE_PIXELS_PER_SECOND * zoomLevel),
		),
	);
	return mediaTime({ ticks: Math.round(seconds * TICKS_PER_SECOND) });
}

// --- Controller ---

export class PlayheadController {
	private lastMouseClientX = 0;
	private pendingMoveEvent: MouseEvent | null = null;
	private rafId: number | null = null;

	private session: Session = { kind: "idle" };
	private readonly configRef: PlayheadConfigRef;

	constructor(deps: { configRef: PlayheadConfigRef }) {
		this.configRef = deps.configRef;
		this.onPlayheadMouseDown = this.onPlayheadMouseDown.bind(this);
		this.onRulerMouseDown = this.onRulerMouseDown.bind(this);
		this.handleMouseMove = this.handleMouseMove.bind(this);
		this.handleMouseUp = this.handleMouseUp.bind(this);
		this.handleInterrupt = this.handleInterrupt.bind(this);
	}

	private get config(): PlayheadConfig {
		return this.configRef.current;
	}

	get isActive(): boolean {
		return this.session.kind !== "idle";
	}

	getLastMouseClientX(): number {
		return this.lastMouseClientX;
	}

	destroy(): void {
		this.deactivate();
	}

	// --- Public event handlers (bound, stable references) ---

	onPlayheadMouseDown(event: ReactMouseEvent): void {
		event.preventDefault();
		event.stopPropagation();
		this.session = {
			kind: "scrubbing",
			didStartFromRuler: false,
			hasMoved: false,
			currentTime: null,
			snapPoints: this.buildScrubSnapPoints(),
		};
		this.config.setScrubbing(true);
		this.scrub({ event, isElementSnappingEnabled: true });
		this.activate();
	}

	onRulerMouseDown(event: ReactMouseEvent): void {
		if (event.button !== 0) return;
		if (this.config.getPlayheadEl()?.contains(event.target as Node)) return;

		event.preventDefault();
		this.session = {
			kind: "scrubbing",
			didStartFromRuler: true,
			hasMoved: false,
			currentTime: null,
			snapPoints: this.buildScrubSnapPoints(),
		};
		this.config.setScrubbing(true);
		// No element-edge snapping on initial ruler click — avoids a jarring jump.
		this.scrub({ event, isElementSnappingEnabled: false });
		this.activate();
	}

	// Snap targets are captured once per drag: while scrubbing the playhead,
	// elements/keyframes/bookmarks don't move, so rebuilding them on every
	// mousemove (O(elements) each time) was pure overhead and the main lag.
	private buildScrubSnapPoints(): SnapPoint[] {
		return buildTimelineSnapPoints({
			sources: [
				() => getElementEdgeSnapPoints({ tracks: this.config.getSceneTracks() }),
				() => getBookmarkSnapPoints({ bookmarks: this.config.getSceneBookmarks() }),
				() =>
					getAnimationKeyframeSnapPointsForTimeline({
						tracks: this.config.getSceneTracks(),
					}),
			],
		});
	}

	// --- Public non-session methods ---

	/**
	 * Imperatively updates the playhead DOM element's `left` style.
	 * Called on scroll and playback events to avoid React re-renders
	 * during animation frame updates.
	 */
	updatePlayheadLeft(time: MediaTime): void {
		const playheadEl = this.config.getPlayheadEl();
		if (!playheadEl) return;

		const centerPixel = timelineTimeToSnappedPixels({
			time,
			zoomLevel: this.config.zoomLevel,
		});
		const scrollLeft = this.config.getRulerScrollEl()?.scrollLeft ?? 0;
		playheadEl.style.left = `${getCenteredLineLeft({ centerPixel }) - scrollLeft}px`;
	}

	/**
	 * Updates the playhead position and auto-scrolls to keep the playhead
	 * visible during playback.
	 */
	handlePlaybackUpdate(time: MediaTime): void {
		this.updatePlayheadLeft(time);

		// Auto-scroll only during playback, not while scrubbing.
		if (!this.config.getIsPlaying() || this.session.kind === "scrubbing")
			return;

		const rulerViewport = this.config.getRulerScrollEl();
		const tracksViewport = this.config.getTracksScrollEl();
		if (!rulerViewport || !tracksViewport) return;

		const playheadPixels = timelineTimeToPixels({
			time,
			zoomLevel: this.config.zoomLevel,
		});
		const viewportWidth = rulerViewport.clientWidth;
		const isOutOfView =
			playheadPixels < rulerViewport.scrollLeft ||
			playheadPixels > rulerViewport.scrollLeft + viewportWidth;

		if (isOutOfView) {
			const desiredScroll = Math.max(
				0,
				Math.min(
					rulerViewport.scrollWidth - viewportWidth,
					playheadPixels - viewportWidth / 2,
				),
			);
			rulerViewport.scrollLeft = tracksViewport.scrollLeft = desiredScroll;
		}
	}

	// --- Private ---

	private activate(): void {
		window.addEventListener("mousemove", this.handleMouseMove);
		window.addEventListener("mouseup", this.handleMouseUp);
		// Safety nets: a mouseup is missed if the pointer is released outside the
		// browser window or the tab loses focus mid-drag. Without these the scrub
		// session stays active and the playhead gets "stuck" following the cursor.
		window.addEventListener("blur", this.handleInterrupt);
		document.addEventListener("pointercancel", this.handleInterrupt);
	}

	private deactivate(): void {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		this.pendingMoveEvent = null;
		window.removeEventListener("mousemove", this.handleMouseMove);
		window.removeEventListener("mouseup", this.handleMouseUp);
		window.removeEventListener("blur", this.handleInterrupt);
		document.removeEventListener("pointercancel", this.handleInterrupt);
	}

	// Ends a scrub that lost its mouseup (pointer released off-window or focus
	// lost), so the playhead can never get permanently stuck mid-drag.
	private handleInterrupt(): void {
		if (this.session.kind !== "scrubbing") return;
		this.config.setScrubbing(false);
		this.session = { kind: "idle" };
		this.deactivate();
	}

	/**
	 * Converts pointer position to a frame-snapped timeline time and seeks.
	 * `isElementSnappingEnabled` controls element-edge snapping; frame-level snapping
	 * is always applied.
	 */
	private scrub({
		event,
		isElementSnappingEnabled,
	}: {
		event: MouseEvent | ReactMouseEvent;
		isElementSnappingEnabled: boolean;
	}): void {
		const ruler = this.config.getRulerEl();
		if (!ruler) return;

		const fps = this.config.getActiveProjectFps();
		if (!fps) return;

		const { zoomLevel, duration } = this.config;
		const rawTime = pixelToTime({
			clientX: event.clientX,
			rulerEl: ruler,
			zoomLevel,
			duration,
		});
		const frameTime = snapSeekMediaTime({ time: rawTime, duration, fps });

		const time = (() => {
			if (!isElementSnappingEnabled || this.config.isShiftHeld())
				return frameTime;

			const snapPoints =
				this.session.kind === "scrubbing" ? this.session.snapPoints : [];
			if (snapPoints.length === 0) return frameTime;

			const result = resolveTimelineSnap({
				targetTime: frameTime,
				snapPoints,
				maxSnapDistance: getTimelineSnapThresholdInTicks({ zoomLevel }),
			});
			return result.snapPoint ? result.snappedTime : frameTime;
		})();

		if (this.session.kind === "scrubbing") {
			this.session.currentTime = time;
		}
		this.config.seek(time);
		this.lastMouseClientX = event.clientX;
	}

	private handleMouseMove(event: MouseEvent): void {
		if (this.session.kind !== "scrubbing") return;
		this.pendingMoveEvent = event;
		if (this.session.didStartFromRuler) {
			this.session.hasMoved = true;
		}
		// Coalesce rapid mousemoves into one seek per animation frame so the
		// playhead tracks the cursor smoothly instead of firing a seek (and a
		// preview re-render) on every pointer event.
		if (this.rafId === null) {
			this.rafId = requestAnimationFrame(() => {
				this.rafId = null;
				const ev = this.pendingMoveEvent;
				this.pendingMoveEvent = null;
				if (ev && this.session.kind === "scrubbing") {
					this.scrub({ event: ev, isElementSnappingEnabled: true });
				}
			});
		}
	}

	private handleMouseUp(event: MouseEvent): void {
		if (this.session.kind !== "scrubbing") return;

		// Flush any pending throttled move so we land exactly under the cursor.
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
		if (this.pendingMoveEvent) {
			this.scrub({
				event: this.pendingMoveEvent,
				isElementSnappingEnabled: true,
			});
			this.pendingMoveEvent = null;
		}

		const session = this.session;
		this.config.setScrubbing(false);

		if (session.currentTime !== null) {
			this.config.seek(session.currentTime);
			this.config.setTimelineViewState({
				zoomLevel: this.config.zoomLevel,
				scrollLeft: this.config.getTracksScrollEl()?.scrollLeft ?? 0,
				playheadTime: session.currentTime,
			});
		}

		// Ruler click without drag: snap to clicked position on mouseup.
		if (session.didStartFromRuler && !session.hasMoved) {
			this.scrub({ event, isElementSnappingEnabled: false });
		}

		this.session = { kind: "idle" };
		this.deactivate();
	}
}
