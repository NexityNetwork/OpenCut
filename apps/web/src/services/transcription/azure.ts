import type { TranscriptionSegment } from "@/transcription/types";

// Sends mixed timeline audio to the server /api/transcribe route (Azure fast
// transcription) and returns segments in the shape buildCaptionChunks expects.
export async function transcribeWithAzure({
	audioBlob,
	language,
}: {
	audioBlob: Blob;
	language?: string;
}): Promise<{ segments: TranscriptionSegment[]; text: string }> {
	const form = new FormData();
	form.append("audio", audioBlob, "audio.mp3");
	if (language && language !== "auto") {
		form.append("language", language);
	}

	const response = await fetch("/api/transcribe", {
		method: "POST",
		body: form,
	});

	if (!response.ok) {
		const detail = await response.json().catch(() => ({}) as { error?: string });
		throw new Error(detail.error ?? `Transcription failed (${response.status})`);
	}

	return response.json();
}
