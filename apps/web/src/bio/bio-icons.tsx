"use client";

// Curated icon set for bio links. Icons are stored as "lucide:<key>" in
// BioLink.icon; anything else renders as literal text (emoji).

import {
	Play,
	Mail,
	Link as LinkIcon,
	Music,
	ShoppingBag,
	Calendar,
	BookOpen,
	Download,
	Star,
	Heart,
	Globe,
	Mic,
	Camera,
	Gift,
	FileText,
	Sparkles,
	Coffee,
	Phone,
	MapPin,
	Zap,
	Rocket,
	Newspaper,
	GraduationCap,
	Headphones,
} from "lucide-react";

export const BIO_LINK_ICONS = {
	play: Play,
	mail: Mail,
	link: LinkIcon,
	music: Music,
	shop: ShoppingBag,
	calendar: Calendar,
	book: BookOpen,
	download: Download,
	star: Star,
	heart: Heart,
	globe: Globe,
	mic: Mic,
	camera: Camera,
	gift: Gift,
	file: FileText,
	sparkles: Sparkles,
	coffee: Coffee,
	phone: Phone,
	map: MapPin,
	zap: Zap,
	rocket: Rocket,
	news: Newspaper,
	course: GraduationCap,
	podcast: Headphones,
} as const;

export type BioIconKey = keyof typeof BIO_LINK_ICONS;

export function BioLinkIcon({
	icon,
	className = "size-4",
}: {
	icon?: string;
	className?: string;
}) {
	if (!icon) return null;
	if (icon.startsWith("lucide:")) {
		const key = icon.slice(7) as BioIconKey;
		const Cmp = BIO_LINK_ICONS[key];
		return Cmp ? <Cmp className={className} /> : null;
	}
	return <span className="text-base leading-none">{icon}</span>;
}
