"use client";

// Ultron public navbar, ported from nexitynetwork/ultron
// (src/components/public/PublicNav.tsx). Supabase auth CTA and analytics
// tracking were removed; the primary CTA launches the editor (/projects).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Menu,
	X,
	ChevronDown,
	ArrowUpRight,
	Info,
	Hammer,
	BookOpen,
	Compass,
	Gauge,
	Boxes,
	MessageCircleQuestion,
	DollarSign,
} from "lucide-react";

const APP = "https://app.51ultron.com";

const TOP_LINKS: Array<{ label: string; href: string; badge?: string }> = [
	{ label: "Company", href: "/docs" },
	{ label: "Genome", href: "/ai-native" },
	{ label: "Techniques", href: "/techniques" },
];

interface ResourceItem {
	label: string;
	href: string;
	Icon: typeof Info;
	external?: boolean;
}

const RESOURCE_ITEMS: ResourceItem[] = [
	{ label: "Guides", href: "/resources", Icon: BookOpen },
	{ label: "Website Audit", href: "/agent-ready", Icon: Gauge },
	{ label: "Agent blueprints", href: "/resources#blueprints", Icon: Compass },
	{ label: "Get Paid", href: "/creators", Icon: DollarSign },
	{ label: "Skills catalog", href: "/docs/skills/catalog", Icon: Boxes },
	{ label: "Product updates", href: "/docs/changelog", Icon: Info },
	{
		label: "Skill generator",
		href: "/resources/skills-generator",
		Icon: Hammer,
	},
	{ label: "Support agent", href: "/docs/support", Icon: MessageCircleQuestion },
];

function TryForFree({ className = "" }: { className?: string }) {
	return (
		<Link
			href="/projects"
			className={`items-center rounded-full bg-white px-4 py-1.5 text-[13.5px] font-semibold text-black transition-colors hover:bg-white/90 ${className}`}
		>
			Create
		</Link>
	);
}

export function Header() {
	const pathname = usePathname();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [resourcesOpen, setResourcesOpen] = useState(false);
	const resourcesRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!resourcesOpen) return;
		function onDoc(e: MouseEvent) {
			if (!resourcesRef.current?.contains(e.target as Node)) {
				setResourcesOpen(false);
			}
		}
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, [resourcesOpen]);

	useEffect(() => {
		setDrawerOpen(false);
		setResourcesOpen(false);
	}, [pathname]);

	return (
		<>
			<header
				className={`sticky inset-x-0 top-0 z-50 h-[60px] border-b border-white/[0.06] backdrop-blur-md ${
					drawerOpen ? "bg-[#1a1a1a]" : "bg-[#141413]/80"
				}`}
			>
				<div className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-4 px-5 lg:px-10">
					<Link
						href="/"
						aria-label="Ultron home"
						className="flex shrink-0 items-center gap-2.5"
					>
						<img
							src="/newlogo.png"
							alt="Ultron"
							className="h-7 w-7 rounded-md"
						/>
						<span className="hidden font-sans text-[16px] font-medium tracking-[-0.01em] text-white sm:inline">
							Ultron
						</span>
					</Link>

					<nav className="hidden items-center gap-1 lg:flex">
						{TOP_LINKS.map((l) => (
							<Link
								key={l.href}
								href={`${APP}${l.href}`}
								className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13.5px] font-medium text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
							>
								{l.label}
							</Link>
						))}

						<div ref={resourcesRef} className="relative">
							<button
								type="button"
								onClick={() => setResourcesOpen((v) => !v)}
								className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[13.5px] font-medium transition-colors hover:bg-white/[0.04] ${
									resourcesOpen
										? "bg-white/[0.05] text-white"
										: "text-white/70 hover:text-white"
								}`}
								aria-expanded={resourcesOpen}
							>
								Resources
								<ChevronDown
									className={`h-3.5 w-3.5 transition-transform ${resourcesOpen ? "rotate-180" : ""}`}
								/>
							</button>
							{resourcesOpen && (
								<div className="absolute left-1/2 top-full z-50 mt-2 w-[240px] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#1c1c1c] p-1 shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
									{RESOURCE_ITEMS.map((r) => {
										const Icon = r.Icon;
										return (
											<Link
												key={r.href}
												href={`${APP}${r.href}`}
												onClick={() => setResourcesOpen(false)}
												className="group flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.05]"
											>
												<Icon className="h-3.5 w-3.5 shrink-0 text-white/55 group-hover:text-white" />
												<span className="flex-1 truncate text-[13px] font-medium text-white/85 group-hover:text-white">
													{r.label}
												</span>
												{r.external && (
													<ArrowUpRight className="h-3 w-3 shrink-0 text-white/30" />
												)}
											</Link>
										);
									})}
								</div>
							)}
						</div>

						<Link
							href={`${APP}/discovery-lab`}
							className="inline-flex items-center rounded-md px-3 py-1.5 text-[13.5px] font-medium text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
						>
							Discover
						</Link>

						<Link
							href={`${APP}/bcp`}
							className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13.5px] font-medium text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
						>
							BCP
							<span className="inline-flex items-center rounded-full bg-[#DA4E24]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#F28C40]">
								New
							</span>
						</Link>
					</nav>

					<div className="flex shrink-0 items-center gap-2">
						<Link
							href={`${APP}/login`}
							className="hidden items-center rounded-full border border-white/[0.18] bg-transparent px-4 py-1.5 text-[13.5px] font-medium text-white/85 transition-colors hover:border-white/40 hover:bg-white/[0.04] hover:text-white lg:inline-flex"
						>
							Try Ultron
						</Link>
						<TryForFree
							className={drawerOpen ? "hidden" : "inline-flex"}
						/>
						<button
							type="button"
							onClick={() => setDrawerOpen((v) => !v)}
							className="rounded-md p-2 text-white/70 transition-colors hover:bg-white/[0.05] hover:text-white lg:hidden"
							aria-label={drawerOpen ? "Close menu" : "Open menu"}
							aria-expanded={drawerOpen}
						>
							{drawerOpen ? (
								<X className="h-5 w-5" />
							) : (
								<Menu className="h-5 w-5" />
							)}
						</button>
					</div>
				</div>
			</header>

			{drawerOpen && (
				<div className="fixed inset-x-0 top-[60px] bottom-0 z-[60] flex flex-col overflow-y-auto bg-[#1a1a1a] backdrop-blur-xl lg:hidden">
					<nav className="flex-1 px-5 pb-6 pt-4">
						<div className="flex flex-col">
							{TOP_LINKS.map((l) => (
								<Link
									key={l.href}
									href={`${APP}${l.href}`}
									onClick={() => setDrawerOpen(false)}
									className="flex items-center justify-between gap-2 py-2.5 text-[17px] font-medium text-white"
								>
									<span>{l.label}</span>
								</Link>
							))}
						</div>

						<div className="mt-6 flex flex-col">
							<div className="pb-2 text-[10.5px] font-medium uppercase tracking-[0.18em] text-white/35">
								Resources
							</div>
							{RESOURCE_ITEMS.map((r) => {
								const Icon = r.Icon;
								return (
									<Link
										key={r.href}
										href={`${APP}${r.href}`}
										onClick={() => setDrawerOpen(false)}
										className="flex items-center gap-3 py-2"
									>
										<Icon className="h-4 w-4 shrink-0 text-white/55" />
										<span className="flex-1 truncate text-[15px] font-medium text-white/85">
											{r.label}
										</span>
									</Link>
								);
							})}
						</div>

						<div className="mt-6 flex flex-col">
							<div className="pb-2 text-[10.5px] font-medium uppercase tracking-[0.18em] text-white/35">
								Explore
							</div>
							<Link
								href={`${APP}/discovery-lab`}
								onClick={() => setDrawerOpen(false)}
								className="py-2.5 text-[17px] font-medium text-white"
							>
								Discover
							</Link>
							<Link
								href={`${APP}/bcp`}
								onClick={() => setDrawerOpen(false)}
								className="flex items-center gap-2 py-2.5 text-[17px] font-medium text-white"
							>
								BCP
								<span className="inline-flex items-center rounded-full bg-[#DA4E24]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#F28C40]">
									New
								</span>
							</Link>
						</div>
					</nav>

					<div className="sticky bottom-0 border-t border-white/[0.06] bg-[#1a1a1a]/95 px-5 py-4 backdrop-blur-md">
						<div className="flex items-center gap-2.5">
							<Link
								href={`${APP}/login`}
								onClick={() => setDrawerOpen(false)}
								className="inline-flex flex-1 items-center justify-center rounded-full border border-white/[0.18] bg-transparent px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-white/[0.04]"
							>
								Try Ultron
							</Link>
							<TryForFree className="inline-flex flex-1 justify-center" />
						</div>
					</div>
				</div>
			)}
		</>
	);
}
