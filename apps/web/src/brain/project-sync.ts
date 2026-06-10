// Brain sync, editor slice — pushes serialized project documents to the
// server so the Brain has "everything the editor has". Projects are authored
// in browser storage (IndexedDB); this mirrors them on save (debounced) and
// reconciles the full set when the library opens.

import { storageService } from "@/services/storage/service";
import { getVaultOwner } from "@/projects/vault-owner";

const DEBOUNCE_MS = 4_000;
const timers = new Map<string, number>();

async function push(id: string): Promise<boolean> {
	try {
		const raw = await storageService.getRawProject(id);
		if (!raw) return false;
		const r = await fetch("/api/brain/projects", {
			method: "POST",
			headers: { "content-type": "application/json" },
			// Server prefers the session user; this is the anonymous fallback.
			body: JSON.stringify({ project: raw, owner: getVaultOwner() }),
		});
		return r.ok;
	} catch {
		return false; // offline / signed out — next save retries
	}
}

/** Debounced fire-and-forget sync, called from the project autosave path. */
export function queueProjectSync(id: string): void {
	if (typeof window === "undefined" || !id) return;
	const t = timers.get(id);
	if (t) window.clearTimeout(t);
	timers.set(
		id,
		window.setTimeout(() => {
			timers.delete(id);
			void push(id);
			// Mirror any newly added media to R2 so it's durable promptly, not
			// only on the next time the project is opened.
			void import("./media-sync")
				.then((m) => m.backupProjectMedia(id))
				.catch(() => {});
		}, DEBOUNCE_MS),
	);
}

/**
 * Reconcile every locally stored project with the Brain: push the ones the
 * server has never seen or whose local copy is newer. Sequential on purpose
 * (docs can be a few hundred KB each).
 */
export async function bulkSyncProjects(
	metas: { id: string; updatedAt: Date }[],
): Promise<number> {
	if (typeof window === "undefined" || metas.length === 0) return 0;
	let server = new Map<string, number>();
	try {
		const r = await fetch("/api/brain/projects");
		const d = (await r.json().catch(() => ({}))) as {
			projects?: { id: string; updated_at: number }[];
		};
		server = new Map((d.projects ?? []).map((p) => [p.id, p.updated_at ?? 0]));
	} catch {
		return 0;
	}
	let pushed = 0;
	for (const m of metas) {
		const local = m.updatedAt instanceof Date ? m.updatedAt.getTime() : 0;
		const remote = server.get(m.id) ?? 0;
		if (local > remote && (await push(m.id))) pushed++;
	}
	return pushed;
}
