/**
 * Shared "adam.hafner" chrome + content blocks for the operator-style decks.
 * Cream OR near-black frames, vivid orange accent, heavy grotesk display
 * (Inter Tight), a Caveat script accent, and a mono label font. Top bar
 * (eyebrow · page counter) + bottom bar (handle · SWIPE). Wordmark → "ultron".
 */
import React, { PropsWithChildren, createContext, useContext, useEffect, useRef, useState } from 'react';
import { AbsoluteFill, delayRender, continueRender } from 'remotion';
import { carouselTheme as T } from './theme';

/** Target aspect. 9:16 = Instagram reel frames (default). 4:5 = LinkedIn
 *  document pages (1080x1350). Root provides this per composition. */
export type CarouselFormat = '9:16' | '4:5';
export const FormatContext = createContext<CarouselFormat>('9:16');

/** LinkedIn 4:5 body: no reel clipping, so a tight full-frame inset. The decks
 *  were composed for the taller 9:16 band, so auto-scale the content down to
 *  fit the shorter 1350px canvas when it would overflow, keeping it centered. */
const FitBand: React.FC<PropsWithChildren<{ jc: string; side: number }>> = ({ jc, side, children }) => {
  const colW = 1080 - 2 * side; // the deck's design column width (810 or 952)
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [handle] = useState(() => delayRender('fit-4x5'));
  useEffect(() => {
    const el = ref.current;
    if (el) {
      const availW = 1080 - 2 * 44; // grow toward full width
      const availH = 1350 - 2 * 64; // grow toward full height
      const ch = el.scrollHeight;
      // scale to fill the 4:5 frame (up or down), capped by whichever bounds first
      const s = Math.min(availW / colW, availH / ch);
      setScale(Math.max(0.55, Math.min(1.45, s)));
    }
    continueRender(handle);
  }, [handle]);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      <div ref={ref} style={{ width: colW, transform: `scale(${scale})`, transformOrigin: 'center', display: 'flex', flexDirection: 'column', justifyContent: jc, gap: 22 }}>
        {children}
      </div>
    </div>
  );
};

export const AH_ORANGE = '#e8542b';
const CREAM = '#f0ece1';
const DARK = '#100f0e';
const DISP = T.displayFont;
const MONO = T.monoFont;
// (Removed the Caveat handwriting face — taglines render in clean Inter now.)
export const SCRIPT = T.bodyFont;

export const ah = {
  orange: AH_ORANGE,
  o: { color: AH_ORANGE } as React.CSSProperties,
  oi: { color: AH_ORANGE, fontStyle: 'italic' as const },
};

/** Big grotesk display text (compose <span> accents inside). */
export const Disp: React.FC<PropsWithChildren<{ size?: number; color?: string; style?: React.CSSProperties }>> = ({
  size = 64,
  color,
  style,
  children,
}) => (
  <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: size, lineHeight: 1.0, letterSpacing: '-0.025em', color, ...style }}>
    {children}
  </div>
);

/** Tagline / hook accent line — clean Inter (no handwriting font). */
export const Script: React.FC<PropsWithChildren<{ size?: number; color?: string }>> = ({ size = 40, color = AH_ORANGE, children }) => (
  <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: Math.round(size * 0.86), color, lineHeight: 1.32, letterSpacing: '-0.01em' }}>{children}</div>
);

/**
 * Small label (kickers, stat captions). Clean uppercase sans — NOT monospace.
 * Monospace belongs only inside the terminal/code cards (CodeCard); using it
 * for labels read as a "weird font" in the frames, so labels are Inter now.
 */
export const Mono: React.FC<PropsWithChildren<{ size?: number; color?: string; style?: React.CSSProperties }>> = ({
  size = 22,
  color,
  style,
  children,
}) => (
  <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: size, letterSpacing: '0.12em', textTransform: 'uppercase', color, ...style }}>{children}</div>
);

/**
 * The frame: bg variant + a centered/top-aligned content band.
 *
 * NOTE: these decks are used as static frames stitched into reels, so the top
 * and bottom strips fall inside the reel's safe-zone cutoffs. The old chrome
 * (eyebrow · page counter · @handle · SWIPE) lived there and got clipped, so
 * it's been removed entirely — content only, inset into the safe middle band.
 * `eyebrow`/`page`/`swipe`/`handle` are still accepted so the deck call sites
 * compile unchanged; they're intentionally not rendered.
 */
export const AHFrame: React.FC<
  PropsWithChildren<{
    variant?: 'cream' | 'dark';
    /** vertical distribution of content inside the safe band */
    justify?: 'center' | 'between' | 'around' | 'start';
    /** clamp content to the 810px text-safe column (sides 135) — reel safe zone. On by default. */
    narrow?: boolean;
    eyebrow?: string;
    page?: string;
    swipe?: string;
    handle?: string;
    center?: boolean;
    /** full-bleed background layer rendered BEHIND the safe band (glow,
     *  watermark, texture). Background graphics may bleed past the safe zone;
     *  text/logos stay inside the band. Absolutely-positioned nodes expected. */
    decor?: React.ReactNode;
  }>
> = ({ variant = 'dark', justify = 'center', narrow = true, decor, children }) => {
  const dark = variant === 'dark';
  const bg = dark ? DARK : CREAM;
  const ink = dark ? '#f3efe6' : '#161412';
  const jc = justify === 'between' ? 'space-between' : justify === 'around' ? 'space-around' : justify === 'start' ? 'flex-start' : 'center';
  const side = narrow ? 135 : 64;
  const fmt = useContext(FormatContext);
  if (fmt === '4:5') {
    return (
      <AbsoluteFill style={{ background: bg, color: ink, fontFamily: T.bodyFont, overflow: 'hidden' }}>
        {decor}
        <FitBand jc={jc} side={side}>{children}</FitBand>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ background: bg, color: ink, fontFamily: T.bodyFont, overflow: 'hidden' }}>
      {decor}
      {/* Reel safe zone (from the template): top 220 / bottom 320 danger margins,
          810px text-safe column (sides 135) when narrow. We inset a touch more
          (top 230 / bottom 330) so nothing kisses the danger line. `justify`
          controls vertical fill. */}
      <div style={{ position: 'absolute', left: side, right: side, top: 230, bottom: 330, display: 'flex', flexDirection: 'column', justifyContent: jc, gap: 22, minHeight: 0 }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

/* ── content blocks ───────────────────────────────────────────────────────*/

const Tag: React.FC<{ text: string; dark: boolean }> = ({ text, dark }) => (
  <span style={{ fontFamily: MONO, fontSize: 17, color: dark ? '#e9b59f' : '#a85a3c', background: dark ? 'rgba(232,84,43,0.16)' : 'rgba(232,84,43,0.1)', borderRadius: 6, padding: '4px 10px' }}>
    {text}
  </span>
);

/** Role card (a "Lead Gen." style automated-function card). */
export const RoleCard: React.FC<{
  titleA: string;
  titleB: string;
  desc: string;
  tags: string[];
  replaces: string;
  tone: 'dark' | 'light';
}> = ({ titleA, titleB, desc, tags, replaces, tone }) => {
  const dark = tone === 'dark';
  const ink = dark ? '#f3efe6' : '#161412';
  return (
    <div style={{ flex: 1, background: dark ? '#17140f' : '#ffffff', borderRadius: 20, padding: '26px 28px', border: dark ? '1px solid rgba(255,255,255,0.06)' : '1.5px solid rgba(20,16,12,0.12)', boxShadow: dark ? 'none' : '0 16px 38px rgba(20,16,12,0.1)' }}>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 40, letterSpacing: '-0.02em', color: ink }}>
        {titleA}<span style={{ color: AH_ORANGE }}> {titleB}</span>
      </div>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 22, lineHeight: 1.34, color: dark ? '#d7d2c6' : '#3a3733', marginTop: 12 }}>{desc}</div>
      <div style={{ height: 1, background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', margin: '18px 0 14px' }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{tags.map((t) => <Tag key={t} text={t} dark={dark} />)}</div>
      <Mono size={17} color={dark ? 'rgba(243,239,230,0.4)' : 'rgba(20,19,18,0.4)'} style={{ marginTop: 14 }}>REPLACES: {replaces}</Mono>
    </div>
  );
};

/** Orange "WIRED TOGETHER" payoff bar. */
export const WiredBar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ background: '#1a1714', borderRadius: 14, padding: '20px 26px', display: 'flex', gap: 20, alignItems: 'center' }}>
    <Mono size={19} color={AH_ORANGE} style={{ flex: '0 0 auto', fontWeight: 700 }}>WIRED TOGETHER</Mono>
    <div style={{ width: 2, height: 42, background: 'rgba(232,84,43,0.4)' }} />
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 24, lineHeight: 1.3, color: '#f3efe6' }}>{children}</div>
  </div>
);

/** A two-role "automated" slide (used 4×, alternating tone). */
export const RolePair: React.FC<{
  side: string; // "Revenue side."
  titles: string; // "Lead Gen. Sales."
  left: React.ComponentProps<typeof RoleCard>;
  right: React.ComponentProps<typeof RoleCard>;
  wired: React.ReactNode;
}> = ({ side, titles, left, right, wired }) => (
  <>
    <div>
      <Disp size={58}>
        {side} <span style={ah.oi}>automated.</span>
      </Disp>
      <Disp size={70}>{titles}</Disp>
    </div>
    <div style={{ display: 'flex', gap: 22, marginTop: 8 }}>
      <RoleCard {...left} />
      <RoleCard {...right} />
    </div>
    <WiredBar>{wired}</WiredBar>
  </>
);

/** Small stat card (e.g., "$80K / full-time hire"). */
export const StatCard: React.FC<{ label: string; big: string; sub: string; solid?: boolean; tone?: 'cream' | 'dark' }> = ({
  label,
  big,
  sub,
  solid,
  tone = 'cream',
}) => {
  const onDark = tone === 'dark';
  const cardBg = solid ? 'rgba(232,84,43,0.14)' : onDark ? '#1a1714' : '#ffffff';
  const cardBorder = solid ? `2px solid ${AH_ORANGE}` : onDark ? '1px solid rgba(255,255,255,0.06)' : '1.5px solid rgba(20,16,12,0.12)';
  const ink = onDark ? '#f3efe6' : '#161412';
  return (
    <div style={{ flex: 1, background: cardBg, border: cardBorder, boxShadow: onDark || solid ? 'none' : '0 16px 38px rgba(20,16,12,0.1)', borderRadius: 16, padding: '22px 24px' }}>
      <Mono size={17} color={AH_ORANGE}>{label}</Mono>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 56, color: solid ? AH_ORANGE : ink, lineHeight: 1, marginTop: 6 }}>{big}</div>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 19, color: solid ? '#a85a3c' : onDark ? '#cfcabf' : '#54504a', marginTop: 8, lineHeight: 1.3 }}>{sub}</div>
    </div>
  );
};

/** Agent grid card (slide "Meet the team"). */
export const AgentCard: React.FC<{ n: string; nameA: string; nameB: string; desc: string }> = ({ n, nameA, nameB, desc }) => (
  <div style={{ background: '#17140f', borderRadius: 14, padding: '18px 20px', display: 'flex', gap: 14 }}>
    <div style={{ fontFamily: DISP, fontWeight: 800, color: AH_ORANGE, fontSize: 30, flex: '0 0 auto', lineHeight: 1 }}>✳</div>
    <div>
      <Mono size={14} color="rgba(243,239,230,0.4)">{n}</Mono>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 26, color: '#f3efe6', lineHeight: 1.05, marginTop: 2 }}>
        {nameA}<span style={{ color: AH_ORANGE }}> {nameB}</span>
      </div>
      <div style={{ fontFamily: T.bodyFont, fontSize: 17, color: '#b6b1a6', lineHeight: 1.3, marginTop: 4 }}>{desc}</div>
    </div>
  </div>
);

/** Layered "how it works" card. */
export const LayerCard: React.FC<{ n: string; titleA: string; titleB: string; desc: string; comments: string[] }> = ({ n, titleA, titleB, desc, comments }) => (
  <div style={{ background: '#17140f', borderRadius: 16, padding: '22px 26px', display: 'flex', alignItems: 'center', gap: 24 }}>
    <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 56, color: AH_ORANGE, flex: '0 0 auto', lineHeight: 1 }}>{n}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 34, color: '#f3efe6' }}>
        <span style={{ color: AH_ORANGE }}>{titleA}</span> {titleB}
      </div>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 19, color: '#cfcabf', lineHeight: 1.3, marginTop: 4 }}>{desc}</div>
    </div>
    <div style={{ flex: '0 0 auto', textAlign: 'left' }}>
      {comments.map((c, i) => <div key={i} style={{ fontFamily: MONO, fontSize: 16, color: 'rgba(243,239,230,0.4)' }}>{c}</div>)}
    </div>
  </div>
);

/** Big orange CTA pill (closer). */
export const CTAPill: React.FC<{ pre: string; word: string }> = ({ pre, word }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 18, background: '#1a1714', border: `2px solid ${AH_ORANGE}`, borderRadius: 999, padding: '18px 32px' }}>
    <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 46, color: '#f3efe6', letterSpacing: '-0.01em' }}>{pre}</span>
    <span style={{ color: AH_ORANGE, fontFamily: DISP, fontWeight: 800, fontSize: 46 }}>{word}</span>
  </div>
);
