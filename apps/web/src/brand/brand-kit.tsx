"use client";

// Brand kit — colors, font, logo, tone. Stored per owner; consumed as
// defaults by Canvas/Bio and (next) the AI caption writer.

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { cn } from "@/utils/ui";
import { Button } from "@/components/ui/button";
import { uploadBlobToR2 } from "@/canvas-editor/publish-export";

export type BrandKit = {
	accent: string;
	palette: string[];
	font: string;
	logoUrl: string;
	tone: string;
};

const DEFAULT_KIT: BrandKit = {
	accent: "#d49a6a",
	palette: ["#1a1714", "#f1ebdc", "#d49a6a", "#8b8676"],
	font: "Inter",
	logoUrl: "",
	tone: "",
};

const FONTS = [
	"Inter",
	"Bebas Neue",
	"Montserrat",
	"Space Grotesk",
	"Playfair Display",
	"JetBrains Mono",
];

const LABEL =
	"mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--mono-ink-3)]";
const FIELD =
	"w-full rounded-xl border border-[var(--mono-line)] bg-[var(--mono-field)] px-3.5 py-2.5 text-sm text-[var(--mono-ink)] outline-none transition-colors placeholder:text-[var(--mono-ink-3)] focus:border-[var(--mono-strong)]";

export function BrandKitView({ owner }: { owner: string }) {
	const [kit, setKit] = useState<BrandKit | null>(null);
	const [busy, setBusy] = useState(false);
	const logoInput = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!owner) return;
		fetch(`/api/brand?owner=${encodeURIComponent(owner)}`)
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => setKit({ ...DEFAULT_KIT, ...(d?.kit ?? {}) }))
			.catch(() => setKit(DEFAULT_KIT));
	}, [owner]);

	const save = async () => {
		if (!kit || busy) return;
		setBusy(true);
		const tid = toast.loading("Saving brand kit…");
		try {
			const r = await fetch("/api/brand", {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ owner, data: kit }),
			});
			if (!r.ok) throw new Error("Save failed");
			toast.success("Brand kit saved", { id: tid });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Save failed", { id: tid });
		} finally {
			setBusy(false);
		}
	};

	if (!kit) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-[var(--mono-ink-3)]">
				Loading…
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-xl px-4 pt-16 pb-16 sm:px-8 lg:pt-10">
			<input
				ref={logoInput}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={async (e) => {
					const f = e.target.files?.[0];
					e.currentTarget.value = "";
					if (!f) return;
					const tid = toast.loading("Uploading logo…");
					try {
						const ext =
							f.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || "png";
						const key = await uploadBlobToR2({
							data: f,
							ext,
							contentType: f.type || "image/png",
						});
						setKit((k) =>
							k
								? {
										...k,
										logoUrl: `/api/import-from-url/file?key=${encodeURIComponent(key)}`,
									}
								: k,
						);
						toast.success("Logo uploaded", { id: tid });
					} catch (err) {
						toast.error(err instanceof Error ? err.message : "Upload failed", {
							id: tid,
						});
					}
				}}
			/>

			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">Brand kit</h1>
					<p className="mt-1 text-sm text-[var(--mono-ink-3)]">
						Your colors, font and voice — used as defaults across Monolith.
					</p>
				</div>
				<Button onClick={save} disabled={busy}>
					{busy ? "Saving…" : "Save"}
				</Button>
			</div>

			<div className="mt-8 space-y-7">
				<div className="flex items-center gap-5">
					<button
						type="button"
						onClick={() => logoInput.current?.click()}
						className="group relative size-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--mono-line)] bg-[var(--mono-hover)]"
						aria-label="Upload logo"
					>
						{kit.logoUrl ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={kit.logoUrl}
								alt="Logo"
								className="size-full object-contain p-2"
							/>
						) : (
							<span className="flex size-full items-center justify-center text-xs text-[var(--mono-ink-3)]">
								Logo
							</span>
						)}
						<span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
							<Upload className="size-4 text-white" />
						</span>
					</button>
					<div className="flex-1">
						<label className={LABEL}>Accent color</label>
						<div className="flex items-center gap-3">
							<input
								type="color"
								value={kit.accent}
								onChange={(e) => setKit({ ...kit, accent: e.target.value })}
								className="h-10 w-16 cursor-pointer rounded-lg border border-[var(--mono-line)] bg-transparent"
							/>
							<span className="font-mono text-sm text-[var(--mono-ink-2)]">
								{kit.accent}
							</span>
						</div>
					</div>
				</div>

				<div>
					<label className={LABEL}>Palette</label>
					<div className="flex gap-2">
						{kit.palette.map((c, i) => (
							<div key={`${i}-${c}`} className="flex flex-col items-center gap-1">
								<input
									type="color"
									value={c}
									onChange={(e) =>
										setKit({
											...kit,
											palette: kit.palette.map((x, j) =>
												j === i ? e.target.value : x,
											),
										})
									}
									className="h-12 w-14 cursor-pointer rounded-lg border border-[var(--mono-line)] bg-transparent"
								/>
								<span className="font-mono text-[10px] text-[var(--mono-ink-3)]">
									{c}
								</span>
							</div>
						))}
					</div>
				</div>

				<div>
					<label className={LABEL}>Font</label>
					<div className="flex flex-wrap gap-2">
						{FONTS.map((fnt) => (
							<button
								key={fnt}
								type="button"
								onClick={() => setKit({ ...kit, font: fnt })}
								className={cn(
									"rounded-lg border px-3.5 py-2 text-sm transition-colors",
									kit.font === fnt
										? "border-[var(--mono-strong)] bg-[var(--mono-active)] text-[var(--mono-ink)]"
										: "border-[var(--mono-line)] text-[var(--mono-ink-2)] hover:bg-[var(--mono-hover)]",
								)}
							>
								{fnt}
							</button>
						))}
					</div>
				</div>

				<div>
					<label className={LABEL}>Voice & tone</label>
					<textarea
						value={kit.tone}
						onChange={(e) => setKit({ ...kit, tone: e.target.value })}
						placeholder="e.g. Direct, confident, no fluff. Speaks to solo founders. Short sentences. No emojis."
						className={cn(FIELD, "min-h-28 resize-none leading-relaxed")}
					/>
					<p className="mt-1.5 text-xs text-[var(--mono-ink-3)]">
						The AI caption writer will follow this when it lands.
					</p>
				</div>
			</div>
		</div>
	);
}
