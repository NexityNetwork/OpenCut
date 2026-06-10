"use client";

// Account switcher — picks which connected Instagram account the whole inbox
// (comments, DMs, funnels, contacts) operates on.

import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { SiInstagram } from "react-icons/si";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type IgAccount = {
	id: string;
	label: string;
	handle: string | null;
	platform_user_id: string | null;
};

export function useIgAccounts(preview: boolean) {
	const [accounts, setAccounts] = useState<IgAccount[]>([]);
	const [account, setAccount] = useState<string>("");

	useEffect(() => {
		if (preview) {
			setAccounts([{ id: "demo", label: "ultron-ig-main", handle: "ultron.agi", platform_user_id: null }]);
			setAccount("demo");
			return;
		}
		fetch("/api/publish/accounts")
			.then((r) => (r.ok ? r.json() : { accounts: [] }))
			.then((d: { accounts?: IgAccount[] }) => {
				const list = d.accounts ?? [];
				setAccounts(list);
				setAccount((cur) => cur || list[0]?.id || "");
			})
			.catch(() => setAccounts([]));
	}, [preview]);

	return { accounts, account, setAccount };
}

export function AccountSwitcher({
	accounts,
	account,
	onSelect,
}: {
	accounts: IgAccount[];
	account: string;
	onSelect: (id: string) => void;
}) {
	// Nothing to switch between with a single account — show it as a static pill.
	const current = accounts.find((a) => a.id === account) ?? accounts[0];
	if (!current) return null;
	const label = (a: IgAccount) => (a.handle ? `@${a.handle}` : a.label);

	if (accounts.length < 2) {
		return (
			<div className="flex items-center gap-1.5 rounded-lg border border-[var(--mono-line)] bg-[var(--mono-panel)] px-2.5 py-1.5 text-[13px] font-medium text-[var(--mono-ink-2)]">
				<SiInstagram className="size-3.5" style={{ color: "#E4405F" }} />
				{label(current)}
			</div>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex items-center gap-1.5 rounded-lg border border-[var(--mono-line)] bg-[var(--mono-panel)] px-2.5 py-1.5 text-[13px] font-medium text-[var(--mono-ink)] transition-colors hover:bg-[var(--mono-hover)]"
				>
					<SiInstagram className="size-3.5" style={{ color: "#E4405F" }} />
					{label(current)}
					<ChevronDown className="size-3.5 text-[var(--mono-ink-3)]" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-48">
				{accounts.map((a) => (
					<DropdownMenuItem key={a.id} onClick={() => onSelect(a.id)}>
						<SiInstagram className="size-3.5" style={{ color: "#E4405F" }} />
						<span className="flex-1">{label(a)}</span>
						{a.id === account && <Check className="size-3.5" />}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
