"use client";

// Inbox shell — the full engagement suite: Comments, DMs, Funnels, Contacts,
// Broadcasts and Analytics (Instagram-first, ManyChat-style).

import { useState } from "react";
import {
	BarChart3,
	Megaphone,
	MessagesSquare,
	Send,
	Users,
	Zap,
} from "lucide-react";
import { cn } from "@/utils/ui";
import { CommentInbox } from "@/inbox/comment-inbox";
import { DmInbox } from "@/inbox/dm-inbox";
import { AutoDmBuilder } from "@/inbox/auto-dm";
import { ContactsView } from "@/inbox/contacts-view";
import { BroadcastsView } from "@/inbox/broadcasts-view";
import { AnalyticsView } from "@/inbox/analytics-view";
import { AccountSwitcher, useIgAccounts } from "@/inbox/account-switcher";

type Tab = "comments" | "dms" | "funnels" | "contacts" | "broadcasts" | "analytics";

const TABS: { key: Tab; label: string; Icon: typeof MessagesSquare }[] = [
	{ key: "comments", label: "Comments", Icon: MessagesSquare },
	{ key: "dms", label: "DMs", Icon: Send },
	{ key: "funnels", label: "Funnels", Icon: Zap },
	{ key: "contacts", label: "Contacts", Icon: Users },
	{ key: "broadcasts", label: "Broadcasts", Icon: Megaphone },
	{ key: "analytics", label: "Analytics", Icon: BarChart3 },
];

export function InboxView({
	owner,
	preview,
}: {
	owner: string;
	preview: boolean;
}) {
	const [tab, setTab] = useState<Tab>("comments");
	const { accounts, account, setAccount } = useIgAccounts(preview);

	return (
		<div className="flex h-full flex-col">
			<div className="flex shrink-0 items-center gap-2 px-4 pt-14 pb-1 lg:pt-6">
				<div className="flex-1" />
				<div className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-[var(--mono-line)] bg-[var(--mono-panel)] p-1">
					{TABS.map((t) => (
						<button
							key={t.key}
							type="button"
							onClick={() => setTab(t.key)}
							className={cn(
								"flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors",
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
				<div className="flex flex-1 justify-end">
					<AccountSwitcher accounts={accounts} account={account} onSelect={setAccount} />
				</div>
			</div>

			<div className="min-h-0 flex-1">
				{tab === "comments" ? (
					<CommentInbox preview={preview} account={account} />
				) : tab === "dms" ? (
					<div className="mx-auto max-w-3xl px-4 pt-6 pb-10 sm:px-8">
						<DmInbox preview={preview} account={account} />
					</div>
				) : tab === "funnels" ? (
					<AutoDmBuilder owner={owner} preview={preview} account={account} />
				) : tab === "contacts" ? (
					<ContactsView owner={owner} preview={preview} />
				) : tab === "broadcasts" ? (
					<BroadcastsView owner={owner} preview={preview} />
				) : (
					<AnalyticsView owner={owner} preview={preview} />
				)}
			</div>
		</div>
	);
}
