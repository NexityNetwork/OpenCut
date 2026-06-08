"use client";

// Ultron footer, ported from nexitynetwork/ultron
// (src/components/landing/SharedFooterCTA.tsx): message-bubble CTA + the
// Product/Build/Resources/Company/Legal columns + the ghost "ultron" wordmark.
// The CTA launches the editor (/projects).

import Link from "next/link";
import {
	Activity,
	Award,
	Boxes,
	BookOpen,
	Brain,
	Briefcase,
	Building2,
	Cpu,
	FileText,
	Layers,
	Mail,
	Network,
	ScrollText,
	Send,
	Shield,
	Wrench,
	Workflow,
	type LucideIcon,
} from "lucide-react";

const APP = "https://app.51ultron.com";

type FooterLink = {
	title: string;
	desc: string;
	href: string;
	icon: LucideIcon;
};

const FOOTER_COLUMNS: { heading: string; items: FooterLink[] }[] = [
	{
		heading: "Product",
		items: [
			{ title: "BCP", desc: "The directory layer for the agentic web.", href: "/bcp", icon: Network },
			{ title: "Workers", desc: "Runtime, sandbox, and the shell.", href: "/docs/workers/shell", icon: Cpu },
			{ title: "Skills", desc: "Battle-tested instructions.", href: "/docs/skills/catalog", icon: Award },
			{ title: "Console", desc: "Operator surface for your company.", href: "/company-demo", icon: Layers },
		],
	},
	{
		heading: "Build",
		items: [
			{ title: "Quickstart", desc: "Five minutes from signup to first run.", href: "/docs/quickstart", icon: Workflow },
			{ title: "Architecture", desc: "Chat loop, workers, and sandbox.", href: "/docs/architecture", icon: ScrollText },
			{ title: "BCP spec", desc: "Protocol reference.", href: "/docs/bcp/spec", icon: Boxes },
			{ title: "Memory", desc: "Storage surfaces and retrieval.", href: "/docs/memory/surfaces", icon: Brain },
		],
	},
	{
		heading: "Resources",
		items: [
			{ title: "Techniques", desc: "Drop-in workflows.", href: "/techniques", icon: Wrench },
			{ title: "Playbooks", desc: "Field-tested systems.", href: "/resources", icon: BookOpen },
			{ title: "Creators", desc: "Get paid for views.", href: "/creators", icon: Send },
			{ title: "Docs", desc: "Everything in one place.", href: "/docs", icon: FileText },
		],
	},
	{
		heading: "Company",
		items: [
			{ title: "Enterprise", desc: "Org-wide deployment.", href: "/enterprise", icon: Building2 },
			{ title: "Contact", desc: "Talk to a human.", href: "/contact", icon: Mail },
			{ title: "Changelog", desc: "What we just shipped.", href: "/docs/changelog", icon: Briefcase },
			{ title: "Status", desc: "System status.", href: "/docs", icon: Activity },
		],
	},
	{
		heading: "Legal",
		items: [
			{ title: "Privacy", desc: "Privacy policy.", href: "/docs/legal/privacy", icon: Shield },
			{ title: "Terms", desc: "Terms of service.", href: "/docs/legal/terms", icon: FileText },
			{ title: "DPA", desc: "Data processing addendum.", href: "/docs/legal/dpa", icon: FileText },
			{ title: "Processors", desc: "Who we share data with.", href: "/docs/legal/subprocessors", icon: Boxes },
		],
	},
];

function FooterNavGrid() {
	return (
		<section className="relative">
			<div
				className="mx-auto w-full max-w-[1200px] px-6 pt-14 lg:px-10 lg:pt-16"
				style={{ paddingBottom: "clamp(176px, 30vw, 320px)" }}
			>
				<div className="grid grid-cols-3 gap-x-4 gap-y-9 md:flex md:flex-row md:justify-between md:gap-x-8 md:gap-y-0">
					{FOOTER_COLUMNS.map((col) => (
						<div key={col.heading}>
							<div className="text-[12.5px] font-medium uppercase tracking-[0.14em] text-white/70">
								{col.heading}
							</div>
							<ul className="mt-4 space-y-3.5">
								{col.items.map((it) => {
									const Icon = it.icon;
									return (
										<li key={`${col.heading}-${it.title}`}>
											<Link
												href={`${APP}${it.href}`}
												className="group inline-flex items-center gap-2.5 transition-colors"
											>
												<Icon className="hidden h-[15px] w-[15px] shrink-0 text-white/70 transition-colors group-hover:text-white md:block" />
												<span className="text-[13px] font-medium text-white transition-colors group-hover:text-white md:text-[14px]">
													{it.title}
												</span>
											</Link>
										</li>
									);
								})}
							</ul>
						</div>
					))}
				</div>
				<div
					aria-hidden
					className="mt-10 border-t border-white/[0.08] md:hidden"
				/>
			</div>
		</section>
	);
}

function MessageBubbleCTA() {
	return (
		<section className="relative pt-12 pb-20 lg:pt-16 lg:pb-28">
			<div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 lg:px-10">
				<div className="relative mx-auto max-w-[1100px]">
					<div className="relative ml-auto w-fit max-w-[440px]">
						<div className="relative z-[1] rounded-[36px] rounded-br-[10px] bg-white px-8 py-5 text-[#141413]">
							<p className="font-sans text-[26px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[30px] lg:text-[34px]">
								Ready to scale?
							</p>
							<span
								aria-hidden
								className="absolute bottom-0 right-[-6px] z-0 h-[18px] w-[18px] rounded-bl-[16px] bg-white"
							/>
							<span
								aria-hidden
								className="absolute bottom-0 right-[-11px] z-[1] h-[18px] w-[11px] rounded-bl-[12px] bg-[#141413]"
							/>
						</div>
					</div>

					<div className="relative mr-auto mt-10 w-fit max-w-[920px] lg:mt-14 lg:w-[860px]">
						<div className="relative z-[1] flex flex-wrap items-center gap-6 rounded-[36px] rounded-bl-[10px] bg-[#262522] px-8 py-5 text-white sm:flex-nowrap">
							<p className="min-w-[240px] flex-1 font-sans text-[22px] leading-[1.18] tracking-[-0.02em] sm:text-[26px] lg:text-[30px]">
								<span className="font-semibold text-white">
									Delegate 70% of the GTM work to Ultron
								</span>
								<span className="hidden lg:inline">
									<br />
								</span>
								<span className="lg:hidden"> </span>
								<span className="font-medium text-white/55">
									within 6 weeks.
								</span>
							</p>
							<Link
								href="/projects"
								className="inline-flex shrink-0 items-center rounded-full bg-white px-5 py-2.5 text-[14px] font-semibold text-black transition-colors hover:bg-white/90"
							>
								Try for free
							</Link>
							<span
								aria-hidden
								className="absolute bottom-0 left-[-6px] z-0 h-[18px] w-[18px] rounded-br-[16px] bg-[#262522]"
							/>
							<span
								aria-hidden
								className="absolute bottom-0 left-[-11px] z-[1] h-[18px] w-[11px] rounded-br-[12px] bg-[#141413]"
							/>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

export function Footer() {
	const pageBg = "#141413";
	return (
		<div
			className="relative overflow-hidden"
			style={{ backgroundColor: pageBg }}
		>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[64%]"
				style={{
					background:
						"radial-gradient(ellipse 80% 108% at 50% 100%, rgba(116,140,238,0.42) 0%, rgba(82,100,190,0.19) 40%, rgba(0,0,0,0) 78%)",
				}}
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 bottom-0 z-0 overflow-hidden"
			>
				<div
					className="mx-auto w-full max-w-[1200px] px-6 lg:px-10"
					style={{ containerType: "inline-size" }}
				>
					<div
						className="relative w-full text-center"
						style={{ transform: "translateY(12%)" }}
					>
						<span
							className="block w-full select-none whitespace-nowrap font-sans font-black leading-none tracking-[0.02em] text-transparent"
							style={{
								fontSize: "34cqw",
								fontFamily:
									"ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
								WebkitTextStroke: "1.6px rgba(255,255,255,0.32)",
								WebkitMaskImage:
									"linear-gradient(to bottom, #000 0%, #000 58%, transparent 80%)",
								maskImage:
									"linear-gradient(to bottom, #000 0%, #000 58%, transparent 80%)",
							}}
						>
							ultron
						</span>
						<span
							className="absolute inset-0 block w-full select-none whitespace-nowrap font-sans font-black leading-none tracking-[0.02em] text-transparent"
							style={{
								fontSize: "34cqw",
								fontFamily:
									"ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
								WebkitTextStroke: "1.6px rgba(255,255,255,0.32)",
								filter: "blur(7px)",
								WebkitMaskImage:
									"linear-gradient(to bottom, transparent 50%, #000 72%, transparent 88%)",
								maskImage:
									"linear-gradient(to bottom, transparent 50%, #000 72%, transparent 88%)",
							}}
						>
							ultron
						</span>
					</div>
				</div>
			</div>
			<div className="relative z-10">
				<MessageBubbleCTA />
				<FooterNavGrid />
			</div>
		</div>
	);
}
