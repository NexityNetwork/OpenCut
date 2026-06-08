"use client";

// Lightweight favourites for the bundled audio library, persisted in
// localStorage so the "Saved" tab actually works. Stores the full item so the
// Saved view can render without re-reading every manifest.

export type SavedAudioItem = {
	id: string;
	name: string;
	category: string;
	file: string;
};

const KEY = "ultron-saved-audio";
const EVENT = "ultron-saved-audio-changed";

export function getSavedAudio(): SavedAudioItem[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(KEY);
		const parsed = raw ? JSON.parse(raw) : [];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

export function isAudioSaved(id: string): boolean {
	return getSavedAudio().some((item) => item.id === id);
}

export function toggleSavedAudio(item: SavedAudioItem): boolean {
	const list = getSavedAudio();
	const index = list.findIndex((i) => i.id === item.id);
	let nowSaved: boolean;
	if (index >= 0) {
		list.splice(index, 1);
		nowSaved = false;
	} else {
		list.push(item);
		nowSaved = true;
	}
	window.localStorage.setItem(KEY, JSON.stringify(list));
	window.dispatchEvent(new Event(EVENT));
	return nowSaved;
}

export function subscribeSavedAudio(callback: () => void): () => void {
	if (typeof window === "undefined") return () => {};
	window.addEventListener(EVENT, callback);
	window.addEventListener("storage", callback);
	return () => {
		window.removeEventListener(EVENT, callback);
		window.removeEventListener("storage", callback);
	};
}
