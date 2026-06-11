import { hasKeyframesForPath } from "@/animation/keyframe-query";
import { resolveNumberAtTime } from "@/animation/values";
import { VOLUME_DB_MAX, VOLUME_DB_MIN } from "./audio-constants";
import type { TimelineElement } from "./types";
const DEFAULT_STEP_SECONDS = 1 / 60;

export type AudioCapableElement = Extract<
	TimelineElement,
	{ type: "audio" | "video" }
>;

export function clampDb(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.min(VOLUME_DB_MAX, Math.max(VOLUME_DB_MIN, value));
}

export function dBToLinear(db: number): number {
	return 10 ** (clampDb(db) / 20);
}

export function getElementVolume({
	element,
}: {
	element: AudioCapableElement;
}): number {
	const value = element.params.volume;
	return typeof value === "number" ? value : 0;
}

export function isElementMuted({
	element,
}: {
	element: AudioCapableElement;
}): boolean {
	return element.params.muted === true;
}

export function hasAnimatedVolume({
	element,
}: {
	element: AudioCapableElement;
}): boolean {
	return hasKeyframesForPath({
		animations: element.animations,
		propertyPath: "volume",
	});
}

function fadeValues(element: AudioCapableElement): {
	fadeIn: number;
	fadeOut: number;
} {
	return {
		fadeIn:
			typeof element.params.fadeIn === "number" ? element.params.fadeIn : 0,
		fadeOut:
			typeof element.params.fadeOut === "number" ? element.params.fadeOut : 0,
	};
}

// True when the clip has a fade in or out — callers use this (alongside volume
// keyframes) to take the time-varying gain path instead of a single constant.
export function hasFade(element: AudioCapableElement): boolean {
	const { fadeIn, fadeOut } = fadeValues(element);
	return fadeIn > 0 || fadeOut > 0;
}

import { TICKS_PER_SECOND } from "@/wasm";

export function resolveEffectiveAudioGain({
	element,
	trackMuted = false,
	localTime,
}: {
	element: AudioCapableElement;
	trackMuted?: boolean;
	localTime: number;
}): number {
	if (trackMuted || isElementMuted({ element })) {
		return 0;
	}

	const resolvedDb = resolveNumberAtTime({
		baseValue: getElementVolume({ element }),
		animations: element.animations,
		propertyPath: "volume",
		localTime: Math.round(localTime * TICKS_PER_SECOND),
	});

	return dBToLinear(resolvedDb) * fadeEnvelope({ element, localTime });
}

// Linear fade in/out applied on top of the volume, relative to the clip's
// visible span. Returns a 0..1 multiplier.
function fadeEnvelope({
	element,
	localTime,
}: {
	element: AudioCapableElement;
	localTime: number;
}): number {
	const { fadeIn, fadeOut } = fadeValues(element);
	if (fadeIn <= 0 && fadeOut <= 0) return 1;
	const durSec = element.duration / TICKS_PER_SECOND;
	let factor = 1;
	if (fadeIn > 0 && localTime < fadeIn) {
		factor *= Math.max(0, Math.min(1, localTime / fadeIn));
	}
	if (fadeOut > 0 && localTime > durSec - fadeOut) {
		factor *= Math.max(0, Math.min(1, (durSec - localTime) / fadeOut));
	}
	return factor;
}

export function buildWaveformGainSamples({
	element,
	count,
}: {
	element: AudioCapableElement;
	count: number;
}): number[] {
	const durationSeconds = element.duration / TICKS_PER_SECOND;
	return Array.from({ length: count }, (_, i) => {
		const localTime = ((i + 0.5) / count) * durationSeconds;
		return resolveEffectiveAudioGain({ element, localTime });
	});
}

export function buildAudioGainAutomation({
	element,
	trackMuted = false,
	fromLocalTime,
	toLocalTime,
	stepSeconds = DEFAULT_STEP_SECONDS,
}: {
	element: AudioCapableElement;
	trackMuted?: boolean;
	fromLocalTime: number;
	toLocalTime: number;
	stepSeconds?: number;
}): Array<{ localTime: number; gain: number }> {
	const startTime = Math.max(0, fromLocalTime);
	const endTime = Math.max(startTime, toLocalTime);
	const safeStep =
		Number.isFinite(stepSeconds) && stepSeconds > 0
			? stepSeconds
			: DEFAULT_STEP_SECONDS;
	const points: Array<{ localTime: number; gain: number }> = [];

	for (let localTime = startTime; localTime < endTime; localTime += safeStep) {
		points.push({
			localTime,
			gain: resolveEffectiveAudioGain({
				element,
				trackMuted,
				localTime,
			}),
		});
	}

	points.push({
		localTime: endTime,
		gain: resolveEffectiveAudioGain({
			element,
			trackMuted,
			localTime: endTime,
		}),
	});

	return points;
}
