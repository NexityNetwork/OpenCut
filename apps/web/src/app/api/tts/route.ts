import { NextResponse } from "next/server";

// Text-to-Speech proxy to Azure AI Speech. Keeps the Speech key server-side and
// returns an MP3 the client adds to the timeline as a voiceover clip.

const MAX_TEXT_LENGTH = 5000;

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

export async function POST(request: Request) {
	const key = process.env.AZURE_SPEECH_KEY;
	const region = process.env.AZURE_SPEECH_REGION ?? "eastus";
	if (!key) {
		return NextResponse.json(
			{ error: "Text-to-speech is not configured." },
			{ status: 503 },
		);
	}

	let body: {
		text?: string;
		voice?: string;
		style?: string;
		rate?: number;
	};
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
	}

	const text = (body.text ?? "").trim();
	const voice = body.voice ?? "en-US-AvaNeural";
	const style = body.style?.trim() || null;
	const rate = typeof body.rate === "number" ? body.rate : 1;

	if (!text) {
		return NextResponse.json({ error: "No text provided." }, { status: 400 });
	}
	if (text.length > MAX_TEXT_LENGTH) {
		return NextResponse.json(
			{ error: `Text is too long (max ${MAX_TEXT_LENGTH} characters).` },
			{ status: 400 },
		);
	}

	const locale = voice.split("-").slice(0, 2).join("-") || "en-US";
	let inner = escapeXml(text);
	if (rate && rate !== 1) {
		const percent = Math.round((rate - 1) * 100);
		inner = `<prosody rate='${percent >= 0 ? "+" : ""}${percent}%'>${inner}</prosody>`;
	}
	if (style) {
		inner = `<mstts:express-as style='${escapeXml(style)}'>${inner}</mstts:express-as>`;
	}
	const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='${locale}'><voice name='${escapeXml(voice)}'>${inner}</voice></speak>`;

	const azureResponse = await fetch(
		`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
		{
			method: "POST",
			headers: {
				"Ocp-Apim-Subscription-Key": key,
				"Content-Type": "application/ssml+xml",
				"X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
				"User-Agent": "ultron-edits",
			},
			body: ssml,
		},
	);

	if (!azureResponse.ok) {
		const detail = await azureResponse.text().catch(() => "");
		return NextResponse.json(
			{ error: `Speech synthesis failed (${azureResponse.status}). ${detail.slice(0, 200)}` },
			{ status: 502 },
		);
	}

	const audio = await azureResponse.arrayBuffer();
	return new Response(audio, {
		headers: {
			"Content-Type": "audio/mpeg",
			"Cache-Control": "no-store",
		},
	});
}
