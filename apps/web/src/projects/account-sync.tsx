"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/auth/client";
import { storageService } from "@/services/storage/service";
import type { TProject } from "@/project/types";
import type { MediaAsset } from "@/media/types";

// Syncs the user's projects to their account: project JSON in D1, media bytes in
// R2 (see /api/account/*). Local IndexedDB/OPFS stays the working copy; this
// keeps it mirrored to the account so projects survive a browser wipe and follow
// the user across devices. Last-write-wins per project via metadata.updatedAt.

type RemoteProject = { id: string; data: string; updatedAt: number };
type RemoteMedia = { id: string; meta: string };

const projTime = (p: TProject) => new Date(p.metadata.updatedAt).getTime() || 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reviveProject(raw: any): TProject {
	if (raw?.metadata) {
		raw.metadata.createdAt = new Date(raw.metadata.createdAt);
		raw.metadata.updatedAt = new Date(raw.metadata.updatedAt);
	}
	for (const scene of raw?.scenes ?? []) {
		if (scene.createdAt) scene.createdAt = new Date(scene.createdAt);
		if (scene.updatedAt) scene.updatedAt = new Date(scene.updatedAt);
	}
	return raw as TProject;
}

async function listRemoteProjects(owner: string): Promise<RemoteProject[]> {
	const r = await fetch(
		`/api/account/projects?owner=${encodeURIComponent(owner)}`,
	);
	const d = (await r.json().catch(() => ({}))) as { projects?: RemoteProject[] };
	return Array.isArray(d.projects) ? d.projects : [];
}

async function putRemoteProject(owner: string, project: TProject) {
	await fetch("/api/account/projects", {
		method: "PUT",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			owner,
			id: project.metadata.id,
			data: JSON.stringify(project),
			updatedAt: projTime(project),
		}),
	});
}

async function listRemoteMedia(
	owner: string,
	projectId: string,
): Promise<RemoteMedia[]> {
	const r = await fetch(
		`/api/account/media?owner=${encodeURIComponent(owner)}&projectId=${encodeURIComponent(projectId)}`,
	);
	const d = (await r.json().catch(() => ({}))) as { media?: RemoteMedia[] };
	return Array.isArray(d.media) ? d.media : [];
}

async function pushProjectMedia(owner: string, projectId: string) {
	const [local, remote] = await Promise.all([
		storageService.loadAllMediaAssets({ projectId }),
		listRemoteMedia(owner, projectId),
	]);
	const remoteIds = new Set(remote.map((m) => m.id));
	for (const asset of local) {
		if (remoteIds.has(asset.id)) continue;
		try {
			await fetch(
				`/api/account/media?owner=${encodeURIComponent(owner)}&projectId=${encodeURIComponent(projectId)}&id=${encodeURIComponent(asset.id)}`,
				{
					method: "PUT",
					headers: {
						"content-type": asset.file.type || "application/octet-stream",
						"x-media-meta": JSON.stringify({
							name: asset.name,
							type: asset.type,
							width: asset.width,
							height: asset.height,
							duration: asset.duration,
							thumbnailUrl: asset.thumbnailUrl,
							ephemeral: asset.ephemeral,
						}),
					},
					body: asset.file,
				},
			);
		} catch {
			/* best effort */
		}
	}
}

async function pullProjectMedia(owner: string, projectId: string) {
	const [remote, local] = await Promise.all([
		listRemoteMedia(owner, projectId),
		storageService.loadAllMediaAssets({ projectId }),
	]);
	const localIds = new Set(local.map((m) => m.id));
	for (const m of remote) {
		if (localIds.has(m.id)) continue;
		try {
			const meta = JSON.parse(typeof m.meta === "string" ? m.meta : "{}");
			const res = await fetch(
				`/api/account/media/file?owner=${encodeURIComponent(owner)}&projectId=${encodeURIComponent(projectId)}&id=${encodeURIComponent(m.id)}`,
			);
			if (!res.ok) continue;
			const blob = await res.blob();
			const file = new File([blob], meta.name || m.id, {
				type: blob.type || "application/octet-stream",
			});
			await storageService.saveMediaAsset({
				projectId,
				mediaAsset: {
					id: m.id,
					name: meta.name ?? m.id,
					type: meta.type ?? "video",
					file,
					url: URL.createObjectURL(file),
					width: meta.width,
					height: meta.height,
					duration: meta.duration,
					thumbnailUrl: meta.thumbnailUrl,
					ephemeral: meta.ephemeral,
				} as MediaAsset,
			});
		} catch {
			/* best effort */
		}
	}
}

export async function pushProject(owner: string, project: TProject) {
	await putRemoteProject(owner, project);
	await pushProjectMedia(owner, project.metadata.id);
}

async function reconcile(owner: string) {
	const [local, remote] = await Promise.all([
		storageService.loadAllProjects(),
		listRemoteProjects(owner),
	]);
	const remoteById = new Map(remote.map((r) => [r.id, r]));
	const localById = new Map(local.map((p) => [p.metadata.id, p]));

	for (const p of local) {
		const r = remoteById.get(p.metadata.id);
		if (!r || projTime(p) > r.updatedAt) {
			try {
				await pushProject(owner, p);
			} catch {
				/* best effort */
			}
		}
	}
	for (const r of remote) {
		const p = localById.get(r.id);
		if (!p || r.updatedAt > projTime(p)) {
			try {
				await storageService.saveProject({
					project: reviveProject(JSON.parse(r.data)),
				});
				await pullProjectMedia(owner, r.id);
			} catch {
				/* best effort */
			}
		}
	}
}

export function AccountSync() {
	const { data: session } = useSession();
	const userId = session?.user?.id ?? null;
	const reconciledFor = useRef<string | null>(null);

	// Reconcile once per login: push local up, pull the account down.
	useEffect(() => {
		if (!userId || reconciledFor.current === userId) return;
		reconciledFor.current = userId;
		reconcile(userId).catch((e) =>
			console.warn("[account-sync] reconcile failed", e),
		);
	}, [userId]);

	// Push the active project (debounced) as it's edited. Lazy-import the editor
	// core so non-editor pages don't pull it into their bundle.
	useEffect(() => {
		if (!userId) return;
		let timer: ReturnType<typeof setTimeout> | null = null;
		let unsubscribe = () => {};
		let cancelled = false;
		void import("@/core").then(({ EditorCore }) => {
			if (cancelled) return;
			const editor = EditorCore.getInstance();
			unsubscribe = editor.project.subscribe(() => {
				if (timer) clearTimeout(timer);
				timer = setTimeout(() => {
					const active = editor.project.getActiveOrNull();
					if (active) void pushProject(userId, active).catch(() => {});
				}, 2000);
			});
		});
		return () => {
			cancelled = true;
			if (timer) clearTimeout(timer);
			unsubscribe();
		};
	}, [userId]);

	return null;
}
