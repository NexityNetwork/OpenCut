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
	// Always a picker, so switching accounts is one click.
	const current = accounts.find((a) => a.id === account) ?? accounts[0];
	const label = (a: IgAccount) => (a.handle ? `@${a.handle}` : a.label);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex items-center gap-1.5 rounded-lg border border-[var(--mono-line)] bg-[var(--mono-panel)] px-2.5 py-1.5 text-[13px] font-medium text-[var(--mono-ink)] transition-colors hover:bg-[var(--mono-hover)]"
				>
					<SiInstagram className="size-3.5" style={{ color: "#E4405F" }} />
					{current ? label(current) : "No account"}
					<ChevronDown className="size-3.5 text-[var(--mono-ink-3)]" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-52">
				<div className="px-2 py-1 text-[10px] font-semibold tracking-wide text-[var(--mono-ink-3)] uppercase">
					Instagram accounts
				</div>
				{accounts.map((a) => (
					<DropdownMenuItem key={a.id} onClick={() => onSelect(a.id)}>
						<SiInstagram className="size-3.5" style={{ color: "#E4405F" }} />
						<span className="flex-1">{label(a)}</span>
						{a.id === account && <Check className="size-3.5" />}
					</DropdownMenuItem>
				))}
				<div className="px-2 pt-1 pb-0.5 text-[11px] text-[var(--mono-ink-3)]">
					Connect more from Publish → Channels
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
