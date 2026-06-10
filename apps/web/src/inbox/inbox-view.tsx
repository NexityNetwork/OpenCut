"use client";

// Inbox shell — Comments, DMs and Auto-DM under one roof (Instagram-first).

import { useState } from "react";
import { MessagesSquare, Send, Zap } from "lucide-react";
import { cn } from "@/utils/ui";
import { CommentInbox } from "@/inbox/comment-inbox";
import { DmInbox } from "@/inbox/dm-inbox";
import { AutoDmBuilder } from "@/inbox/auto-dm";

type Tab = "comments" | "dms" | "auto";

const TABS: { key: Tab; label: string; Icon: typeof MessagesSquare }[] = [
	{ key: "comments", label: "Comments", Icon: MessagesSquare },
	{ key: "dms", label: "DMs", Icon: Send },
	{ key: "auto", label: "Funnels", Icon: Zap },
];

export function InboxView({
	owner,
	preview,
}: {
	owner: string;
	preview: boolean;
}) {
	const [tab, setTab] = useState<Tab>("comments");

	return (
		<div className="flex h-full flex-col">
			<div className="flex shrink-0 justify-center px-4 pt-14 sm:px-8 lg:pt-6">
				<div className="flex gap-1 rounded-xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-1">
					{TABS.map((t) => (
						<button
							key={t.key}
							type="button"
							onClick={() => setTab(t.key)}
							className={cn(
								"flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors",
								tab === t.key
									? "bg-[var(--mono-active)] text-[var(--mono-ink)]"
									: "text-[var(--mono-ink-3)] hover:text-[var(--mono-ink)]",
							)}
						>
							<t.Icon className="size-3.5" />
							{t.label}
						</button>
					))}
				</div>
			</div>

			<div className="min-h-0 flex-1">
				{tab === "comments" ? (
					<CommentInbox preview={preview} />
				) : tab === "dms" ? (
					<div className="mx-auto max-w-3xl px-4 pt-6 pb-10 sm:px-8">
						<DmInbox preview={preview} />
					</div>
				) : (
					<AutoDmBuilder owner={owner} preview={preview} />
				)}
			</div>
		</div>
	);
}
