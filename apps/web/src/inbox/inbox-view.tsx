"use client";

// SM Automation shell — the full engagement suite: Comments, DMs, Funnels,
// Contacts, Broadcasts and Analytics (Instagram-first, ManyChat-style).
// Navigation lives in the sidebar now; this only renders the active section
// plus the account switcher.

import {
	BarChart3,
	type LucideIcon,
	Megaphone,
	MessagesSquare,
	Send,
	Users,
	Zap,
} from "lucide-react";
import { CommentInbox } from "@/inbox/comment-inbox";
import { DmInbox } from "@/inbox/dm-inbox";
import { AutoDmBuilder } from "@/inbox/auto-dm";
import { ContactsView } from "@/inbox/contacts-view";
import { BroadcastsView } from "@/inbox/broadcasts-view";
import { AnalyticsView } from "@/inbox/analytics-view";
import { AccountSwitcher, useIgAccounts } from "@/inbox/account-switcher";

export type InboxTab =
	| "comments"
	| "dms"
	| "funnels"
	| "contacts"
	| "broadcasts"
	| "analytics";

export const INBOX_TABS: { key: InboxTab; label: string; Icon: LucideIcon }[] = [
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
	tab,
}: {
	owner: string;
	preview: boolean;
	tab: InboxTab;
}) {
	const { accounts, account, setAccount } = useIgAccounts(preview);

	return (
		<div className="flex h-full flex-col">
			<div className="flex shrink-0 items-center justify-end px-4 pt-14 pb-1 sm:px-8 lg:pt-6">
				<AccountSwitcher accounts={accounts} account={account} onSelect={setAccount} />
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
					<ContactsView owner={owner} preview={preview} account={account} />
				) : tab === "broadcasts" ? (
					<BroadcastsView owner={owner} preview={preview} />
				) : (
					<AnalyticsView owner={owner} preview={preview} />
				)}
			</div>
		</div>
	);
}
