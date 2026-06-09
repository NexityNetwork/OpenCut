"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/auth/client";

// SSR-safe shell: only light imports here. The actual sync engine and the editor
// core are dynamically imported inside client effects so they never evaluate on
// the server (they touch IndexedDB/OPFS and would crash SSR).
export function AccountSync() {
	const { data: session } = useSession();
	const userId = session?.user?.id ?? null;
	const reconciledFor = useRef<string | null>(null);

	// Reconcile once per login: push local up, pull the account down.
	useEffect(() => {
		if (!userId || reconciledFor.current === userId) return;
		reconciledFor.current = userId;
		void import("@/projects/account-sync-engine").then(({ reconcile }) =>
			reconcile(userId).catch((e) =>
				console.warn("[account-sync] reconcile failed", e),
			),
		);
	}, [userId]);

	// Push the active project (debounced) as it's edited.
	useEffect(() => {
		if (!userId) return;
		let timer: ReturnType<typeof setTimeout> | null = null;
		let unsubscribe = () => {};
		let cancelled = false;
		void Promise.all([
			import("@/core"),
			import("@/projects/account-sync-engine"),
		]).then(([{ EditorCore }, { pushProject }]) => {
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
