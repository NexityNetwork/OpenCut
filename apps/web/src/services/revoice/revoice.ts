"use client";

import {
	assemblePhrases,
	audioBufferToWav,
	decodeArrayBufferToAudioBuffer,
	decodeFileToAudioBuffer,
	toMono,
} from "./audio-utils";

type Phrase = { text: string; start: number; end: number };

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

async function transcribe({
	wav,
	language,
}: {
	wav: Blob;
	language?: string;
}): Promise<Phrase[]> {
	const form = new FormData();
	form.append("audio", wav, "audio.wav");
	if (language && language !== "auto") form.append("language", language);

	const response = await fetch("/api/transcribe", { method: "POST", body: form });
	if (!response.ok) {
		const detail = await response.json().catch(() => ({}) as { error?: string });
		throw new Error(detail.error ?? `Transcription failed (${response.status})`);
	}
	const data = (await response.json()) as { segments?: Phrase[] };
	return data.segments ?? [];
}

async function synthesize({
	text,
	voice,
	style,
	rate,
}: {
	text: string;
	voice: string;
	style?: string;
	rate: number;
}): Promise<ArrayBuffer> {
	// A long clip makes many TTS calls; retry transient failures so one hiccup
	// doesn't abort the whole redub.
	let lastError: unknown = null;
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const response = await fetch("/api/tts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text, voice, style, rate }),
			});
			if (!response.ok) {
				const detail = await response
					.json()
					.catch(() => ({}) as { error?: string });
				throw new Error(
					detail.error ?? `Speech synthesis failed (${response.status})`,
				);
			}
			return await response.arrayBuffer();
		} catch (error) {
			lastError = error;
			await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
		}
	}
	throw lastError instanceof Error
		? lastError
		: new Error("Speech synthesis failed");
}

/**
 * Re-voices a clip's speech: transcribe → re-synthesize each phrase in the
 * target voice, rate-fitted to its slot → reassemble at the original phrase
 * start times. The result is a WAV the caller drops onto the timeline aligned
 * to the source clip (pacing/pauses preserved; new voice's own inflection).
 */
export async function revoiceClip({
	file,
	voice,
	style,
	language,
	onProgress,
}: {
	file: Blob;
	voice: string;
	style?: string;
	language?: string;
	onProgress?: (message: string) => void;
}): Promise<{ blob: Blob; durationSeconds: number; phraseCount: number }> {
	onProgress?.("Reading clip audio…");
	const source = await decodeFileToAudioBuffer(file);
	const durationSeconds = source.duration;

	onProgress?.("Transcribing…");
	const mono = await toMono(source, 16000);
	const phrases = await transcribe({
		wav: audioBufferToWav(mono),
		language,
	});
	if (phrases.length === 0) {
		throw new Error("No speech was detected in the selected clip");
	}

	const parts: { buffer: AudioBuffer; start: number }[] = [];
	for (let i = 0; i < phrases.length; i++) {
		const phrase = phrases[i];
		onProgress?.(`Synthesizing line ${i + 1} of ${phrases.length}…`);
		const slot = Math.max(0.4, phrase.end - phrase.start);

		// Pass 1: synthesize at natural rate and measure the actual length —
		// neural voices vary in pace, so estimating from text length drifts and
		// leaves gaps. Measuring is exact.
		let mp3 = await synthesize({ text: phrase.text, voice, style, rate: 1 });
		let buffer = await decodeArrayBufferToAudioBuffer(mp3.slice(0));

		// Pass 2 (only if needed): re-synthesize at the rate that makes this line
		// fill its original slot, using Azure's own rate so pitch is preserved.
		const fitRate = clamp(buffer.duration / slot, 0.7, 1.6);
		if (Math.abs(fitRate - 1) > 0.06) {
			mp3 = await synthesize({ text: phrase.text, voice, style, rate: fitRate });
			buffer = await decodeArrayBufferToAudioBuffer(mp3.slice(0));
		}

		parts.push({ buffer, start: phrase.start });
	}

	onProgress?.("Aligning to the timeline…");
	const master = await assemblePhrases({
		parts,
		totalSeconds: durationSeconds,
		sampleRate: 24000,
	});

	return {
		blob: audioBufferToWav(master),
		durationSeconds,
		phraseCount: phrases.length,
	};
}
