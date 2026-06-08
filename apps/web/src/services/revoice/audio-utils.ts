"use client";

// Client-side audio helpers for the "change voice" redub: decode a clip's
// audio, encode WAV for Azure STT, and reassemble the re-synthesized phrases
// back onto the original timeline.

export async function decodeFileToAudioBuffer(file: Blob): Promise<AudioBuffer> {
	const arrayBuffer = await file.arrayBuffer();
	const ctx = new AudioContext();
	try {
		// decodeAudioData pulls the audio track out of mp4/mov/mp3/wav/etc.
		return await ctx.decodeAudioData(arrayBuffer);
	} finally {
		void ctx.close();
	}
}

export async function decodeArrayBufferToAudioBuffer(
	data: ArrayBuffer,
): Promise<AudioBuffer> {
	const ctx = new AudioContext();
	try {
		return await ctx.decodeAudioData(data);
	} finally {
		void ctx.close();
	}
}

// Downmix to mono at a target sample rate (16k keeps the STT upload small).
export async function toMono(
	buffer: AudioBuffer,
	targetRate: number,
): Promise<AudioBuffer> {
	const length = Math.max(1, Math.ceil(buffer.duration * targetRate));
	const offline = new OfflineAudioContext(1, length, targetRate);
	const source = offline.createBufferSource();
	source.buffer = buffer;
	source.connect(offline.destination);
	source.start();
	return offline.startRendering();
}

// Place each re-voiced phrase at its original start time in one mono buffer, so
// the new track lines up with the source clip's pacing and pauses.
export async function assemblePhrases({
	parts,
	totalSeconds,
	sampleRate = 24000,
}: {
	parts: { buffer: AudioBuffer; start: number }[];
	totalSeconds: number;
	sampleRate?: number;
}): Promise<AudioBuffer> {
	const length = Math.max(1, Math.ceil(totalSeconds * sampleRate));
	const offline = new OfflineAudioContext(1, length, sampleRate);
	for (const { buffer, start } of parts) {
		const node = offline.createBufferSource();
		node.buffer = buffer;
		node.connect(offline.destination);
		node.start(Math.max(0, start));
	}
	return offline.startRendering();
}

// 16-bit PCM WAV from a mono AudioBuffer.
export function audioBufferToWav(buffer: AudioBuffer): Blob {
	const sampleRate = buffer.sampleRate;
	const samples = buffer.getChannelData(0);
	const dataLength = samples.length * 2;
	const arrayBuffer = new ArrayBuffer(44 + dataLength);
	const view = new DataView(arrayBuffer);

	const writeString = (offset: number, value: string) => {
		for (let i = 0; i < value.length; i++) {
			view.setUint8(offset + i, value.charCodeAt(i));
		}
	};

	writeString(0, "RIFF");
	view.setUint32(4, 36 + dataLength, true);
	writeString(8, "WAVE");
	writeString(12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true); // PCM
	view.setUint16(22, 1, true); // mono
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	writeString(36, "data");
	view.setUint32(40, dataLength, true);

	let offset = 44;
	for (let i = 0; i < samples.length; i++) {
		const clamped = Math.max(-1, Math.min(1, samples[i]));
		view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
		offset += 2;
	}

	return new Blob([arrayBuffer], { type: "audio/wav" });
}
