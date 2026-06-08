// Curated subset of Azure neural voices for the Voiceover panel. Each `style`
// maps to <mstts:express-as>; an empty styles list means the voice has no
// expressive styles (plain read).

export type TtsVoice = {
	shortName: string;
	displayName: string;
	gender: "Female" | "Male";
	locale: string;
	language: string;
	styles: string[];
};

export const TTS_VOICES: TtsVoice[] = [
	{ shortName: "en-US-AvaNeural", displayName: "Ava", gender: "Female", locale: "en-US", language: "English (US)", styles: ["angry", "fearful", "sad"] },
	{ shortName: "en-US-AndrewNeural", displayName: "Andrew", gender: "Male", locale: "en-US", language: "English (US)", styles: [] },
	{ shortName: "en-US-EmmaNeural", displayName: "Emma", gender: "Female", locale: "en-US", language: "English (US)", styles: [] },
	{ shortName: "en-US-BrianNeural", displayName: "Brian", gender: "Male", locale: "en-US", language: "English (US)", styles: [] },
	{ shortName: "en-US-AriaNeural", displayName: "Aria", gender: "Female", locale: "en-US", language: "English (US)", styles: ["chat", "customerservice", "narration-professional", "newscast-casual", "cheerful", "empathetic", "angry", "sad", "excited", "friendly", "hopeful", "shouting", "whispering"] },
	{ shortName: "en-US-GuyNeural", displayName: "Guy", gender: "Male", locale: "en-US", language: "English (US)", styles: ["newscast", "angry", "cheerful", "sad", "excited", "friendly", "terrified", "shouting", "hopeful", "whispering"] },
	{ shortName: "en-US-JennyNeural", displayName: "Jenny", gender: "Female", locale: "en-US", language: "English (US)", styles: ["assistant", "chat", "customerservice", "newscast", "angry", "cheerful", "sad", "excited", "friendly", "hopeful", "whispering"] },
	{ shortName: "en-US-DavisNeural", displayName: "Davis", gender: "Male", locale: "en-US", language: "English (US)", styles: ["chat", "angry", "cheerful", "excited", "friendly", "hopeful", "sad", "shouting", "whispering"] },
	{ shortName: "en-GB-SoniaNeural", displayName: "Sonia", gender: "Female", locale: "en-GB", language: "English (UK)", styles: ["cheerful", "sad"] },
	{ shortName: "en-GB-RyanNeural", displayName: "Ryan", gender: "Male", locale: "en-GB", language: "English (UK)", styles: ["cheerful", "chat", "whispering", "sad"] },
	{ shortName: "en-AU-NatashaNeural", displayName: "Natasha", gender: "Female", locale: "en-AU", language: "English (AU)", styles: [] },
	{ shortName: "es-ES-ElviraNeural", displayName: "Elvira", gender: "Female", locale: "es-ES", language: "Spanish", styles: [] },
	{ shortName: "fr-FR-DeniseNeural", displayName: "Denise", gender: "Female", locale: "fr-FR", language: "French", styles: ["cheerful", "sad", "whispering", "excited"] },
	{ shortName: "de-DE-KatjaNeural", displayName: "Katja", gender: "Female", locale: "de-DE", language: "German", styles: [] },
	{ shortName: "it-IT-ElsaNeural", displayName: "Elsa", gender: "Female", locale: "it-IT", language: "Italian", styles: [] },
	{ shortName: "pt-BR-FranciscaNeural", displayName: "Francisca", gender: "Female", locale: "pt-BR", language: "Portuguese (BR)", styles: ["calm"] },
	{ shortName: "hi-IN-SwaraNeural", displayName: "Swara", gender: "Female", locale: "hi-IN", language: "Hindi", styles: ["newscast", "cheerful", "empathetic"] },
	{ shortName: "ja-JP-NanamiNeural", displayName: "Nanami", gender: "Female", locale: "ja-JP", language: "Japanese", styles: ["chat", "customerservice", "cheerful"] },
];

export const DEFAULT_TTS_VOICE = "en-US-AvaNeural";

export function getTtsVoice(shortName: string): TtsVoice | undefined {
	return TTS_VOICES.find((v) => v.shortName === shortName);
}
