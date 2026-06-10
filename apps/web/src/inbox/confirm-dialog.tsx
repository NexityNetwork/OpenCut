"use client";

// Small shared confirm dialog, mono-styled — used across the inbox tools.

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
	open,
	title,
	body,
	confirmLabel,
	onConfirm,
	onCancel,
}: {
	open: boolean;
	title: string;
	body: string;
	confirmLabel: string;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	return (
		<Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
			<DialogContent className="max-w-sm gap-0 rounded-2xl border-[var(--mono-line)] bg-[var(--mono-panel)] p-0 text-[var(--mono-ink)]">
				<div className="p-6">
					<DialogTitle className="text-[15px] font-semibold text-[var(--mono-ink)]">
						{title}
					</DialogTitle>
					<p className="mt-2 text-sm leading-relaxed text-[var(--mono-ink-2)]">
						{body}
					</p>
				</div>
				<div className="flex items-center justify-end gap-3 border-t border-[var(--mono-line)] px-6 py-4">
					<Button variant="ghost" onClick={onCancel}>
						Cancel
					</Button>
					<Button variant="destructive" onClick={onConfirm}>
						{confirmLabel}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
