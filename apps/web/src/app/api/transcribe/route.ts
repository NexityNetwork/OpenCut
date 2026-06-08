import { NextResponse } from "next/server";

// Speech-to-Text proxy to Azure AI Speech "fast transcription". Accepts an audio
// file and returns timestamped segments the Captions panel turns into cues.

const LOCALE_MAP: Record<string, string> = {
	en: "en-US",
	es: "es-ES",
	it: "it-IT",
	fr: "fr-FR",
	de: "de-DE",
	pt: "pt-BR",
	ru: "ru-RU",
	ja: "ja-JP",
	zh: "zh-CN",
	ko: "ko-KR",
	nl: "nl-NL",
	pl: "pl-PL",
	tr: "tr-TR",
	ar: "ar-EG",
	hi: "hi-IN",
};

// Candidate locales for auto language identification.
const AUTO_LOCALES = [
	"en-US",
	"es-ES",
	"fr-FR",
	"de-DE",
	"it-IT",
	"pt-BR",
	"ja-JP",
	"zh-CN",
];

function resolveLocales(language: string | null): string[] {
	if (!language || language === "auto") return AUTO_LOCALES;
	if (language.includes("-")) return [language];
	return [LOCALE_MAP[language] ?? "en-US"];
}

export async function POST(request: Request) {
	const key = process.env.AZURE_SPEECH_KEY;
	const region = process.env.AZURE_SPEECH_REGION ?? "eastus";
	if (!key) {
		return NextResponse.json(
			{ error: "Transcription is not configured." },
			{ status: 503 },
		);
	}

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
	}

	const audio = form.get("audio");
	const language =
		typeof form.get("language") === "string"
			? (form.get("language") as string)
			: null;
	if (!(audio instanceof Blob)) {
		return NextResponse.json({ error: "No audio provided." }, { status: 400 });
	}

	const definition = {
		locales: resolveLocales(language),
		profanityFilterMode: "None",
	};

	const azureForm = new FormData();
	azureForm.append("audio", audio, "audio.mp3");
	azureForm.append(
		"definition",
		new Blob([JSON.stringify(definition)], { type: "application/json" }),
	);

	const azureResponse = await fetch(
		`https://${region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15`,
		{
			method: "POST",
			headers: { "Ocp-Apim-Subscription-Key": key },
			body: azureForm,
		},
	);

	if (!azureResponse.ok) {
		const detail = await azureResponse.text().catch(() => "");
		return NextResponse.json(
			{ error: `Transcription failed (${azureResponse.status}). ${detail.slice(0, 200)}` },
			{ status: 502 },
		);
	}

	const data = (await azureResponse.json()) as {
		combinedPhrases?: { text?: string }[];
		phrases?: {
			text?: string;
			offsetMilliseconds?: number;
			durationMilliseconds?: number;
		}[];
	};

	const segments = (data.phrases ?? [])
		.filter((p) => p.text && p.text.trim().length > 0)
		.map((p) => {
			const start = (p.offsetMilliseconds ?? 0) / 1000;
			const end = start + (p.durationMilliseconds ?? 0) / 1000;
			return { text: p.text as string, start, end };
		});

	const text = data.combinedPhrases?.map((p) => p.text ?? "").join(" ") ?? "";

	return NextResponse.json({ segments, text });
}
