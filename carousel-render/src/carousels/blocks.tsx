/**
 * Static building blocks for the white editorial carousel.
 *
 * Everything here is STATIC (no useCurrentFrame) — a slide renders fully at
 * any frame, which is exactly what we want for still export. Inline `**bold**`
 * markup is supported in body/bullet text; `\n` is a line break and a blank
 * line separates paragraphs.
 */
// Bundled offline — registers "Inter Variable" + "Inter Tight Variable" +
// "JetBrains Mono Variable" (code/labels). FontGate wraps every carousel
// composition, so importing here loads them for all decks.
import '@fontsource-variable/inter';
import '@fontsource-variable/inter-tight';
import '@fontsource-variable/jetbrains-mono';
import React, { PropsWithChildren, useEffect, useState } from 'react';
import { AbsoluteFill, delayRender, continueRender } from 'remotion';
import { carouselTheme as T, CAROUSEL_SAFE as SAFE } from './theme';

/* ── Font gate ────────────────────────────────────────────────────────────
 * Holds the still until web fonts are actually loaded, so headlines never
 * capture in a fallback face. */
export const FontGate: React.FC<PropsWithChildren> = ({ children }) => {
  const [handle] = useState(() => delayRender('carousel-fonts'));
  useEffect(() => {
    let live = true;
    const done = () => {
      if (live) continueRender(handle);
    };
    const fonts = (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts;
    if (fonts?.ready) fonts.ready.then(done, done);
    else done();
    return () => {
      live = false;
    };
  }, [handle]);
  return <>{children}</>;
};

/* ── Inline rich text (**bold**) ──────────────────────────────────────────*/
function boldSpans(s: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push(
      <b key={m.index} style={{ fontWeight: 800, color: T.ink }}>
        {m[1]}
      </b>,
    );
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

/* ── Layout helpers ───────────────────────────────────────────────────────*/
export const Stack: React.FC<PropsWithChildren<{ gap?: number; fill?: boolean; style?: React.CSSProperties }>> = ({
  gap = 28,
  fill,
  style,
  children,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap, ...(fill ? { flex: 1, minHeight: 0, justifyContent: 'space-between' } : {}), ...style }}>{children}</div>
);

/**
 * The white frame + safe-zone content band.
 * `background` is rendered behind the band (for bleeding glyphs / device cards).
 * `center` switches to centered, vertically-middle composition.
 *
 * NOTE: the "Swipe →" footer was removed — these frames are stitched into
 * reels and the footer fell inside the reel's bottom safe-zone cutoff. `swipe`
 * is still accepted for call-site compatibility but is no longer rendered.
 */
export const CardShell: React.FC<
  PropsWithChildren<{
    swipe?: boolean | string;
    center?: boolean;
    background?: React.ReactNode;
  }>
> = ({ children, center = false, background }) => (
  <AbsoluteFill style={{ background: T.bg, fontFamily: T.bodyFont, overflow: 'hidden' }}>
    {background && (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{background}</div>
    )}
    <div
      style={{
        position: 'absolute',
        left: SAFE.left,
        right: SAFE.right,
        top: SAFE.top,
        bottom: SAFE.bottom,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: center ? 'center' : 'flex-start',
        textAlign: center ? 'center' : 'left',
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);

/* ── Text blocks ──────────────────────────────────────────────────────────*/
export const Headline: React.FC<{
  lines: Array<string | React.ReactNode>;
  size?: number;
  color?: string;
  weight?: number;
}> = ({ lines, size = 90, color = T.ink, weight = 800 }) => (
  <div
    style={{
      fontFamily: T.displayFont,
      fontWeight: weight,
      fontSize: size,
      lineHeight: 1.0,
      letterSpacing: '-0.03em',
      color,
    }}
  >
    {lines.map((l, i) => (
      <div key={i}>{l}</div>
    ))}
  </div>
);

export const Rich: React.FC<{
  text: string;
  size?: number;
  color?: string;
  weight?: number;
  lineHeight?: number;
  maxWidth?: number;
}> = ({ text, size = 38, color = T.inkBody, weight = 450, lineHeight = 1.34, maxWidth = 880 }) => {
  const paras = text.split('\n\n');
  return (
    <div
      style={{
        fontFamily: T.bodyFont,
        fontWeight: weight,
        fontSize: size,
        lineHeight,
        color,
        maxWidth,
        letterSpacing: '-0.005em',
        display: 'flex',
        flexDirection: 'column',
        gap: Math.round(size * 0.7),
      }}
    >
      {paras.map((p, pi) => (
        <div key={pi}>
          {p.split('\n').map((ln, li) => (
            <React.Fragment key={li}>
              {li > 0 && <br />}
              {boldSpans(ln)}
            </React.Fragment>
          ))}
        </div>
      ))}
    </div>
  );
};

export const Bullets: React.FC<{
  items: string[];
  size?: number;
  color?: string;
  gap?: number;
}> = ({ items, size = 38, color = T.inkBody, gap = 18 }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      gap,
      fontFamily: T.bodyFont,
      fontWeight: 450,
      fontSize: size,
      color,
      letterSpacing: '-0.005em',
    }}
  >
    {items.map((it, i) => (
      <div key={i} style={{ display: 'flex', gap: 18, alignItems: 'baseline' }}>
        <span style={{ flex: '0 0 auto', color: T.ink, fontSize: Math.round(size * 0.5) }}>●</span>
        <span>{boldSpans(it)}</span>
      </div>
    ))}
  </div>
);

/* ── Device cards ─────────────────────────────────────────────────────────*/
export const MetricCard: React.FC<{ label: string; value: string; width?: number }> = ({
  label,
  value,
  width = 540,
}) => (
  <div
    style={{
      width,
      background: T.cardDark,
      borderRadius: 28,
      padding: '30px 38px',
      boxShadow: '0 28px 64px rgba(0,0,0,0.22)',
      color: T.cardDarkInk,
      fontFamily: T.bodyFont,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#b9b9c0', fontSize: 30, fontWeight: 500 }}>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: T.accent, display: 'inline-block' }} />
      {label}
    </div>
    <div
      style={{
        marginTop: 12,
        fontFamily: T.displayFont,
        fontWeight: 800,
        fontSize: 84,
        letterSpacing: '-0.02em',
        color: '#fff',
      }}
    >
      {value}
    </div>
  </div>
);

/** Tilted dark "revenue" card with deterministic spiky bars. */
export const ChartCard: React.FC<{
  width?: number;
  height?: number;
  rotate?: number;
  leftLabel?: string;
  rightLabel?: string;
}> = ({ width = 560, height = 300, rotate = -9, leftLabel = '$0', rightLabel = 'Jun 2026' }) => {
  const n = 54;
  const bars = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const spike = Math.pow(Math.abs(Math.sin(i * 1.93) * Math.sin(i * 0.7 + 1)), 1.3);
    return Math.max(0.05, spike * (0.25 + t * 0.65));
  });
  const pad = 8;
  const bw = (100 - pad * 2) / n;
  return (
    <div
      style={{
        width,
        height,
        background: '#0e0e10',
        borderRadius: 22,
        padding: 18,
        boxShadow: '0 30px 72px rgba(0,0,0,0.32)',
        transform: `rotate(${rotate}deg)`,
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <svg style={{ flex: '1 1 auto', width: '100%' }} viewBox="0 0 100 60" preserveAspectRatio="none">
        {bars.map((h, i) => (
          <rect
            key={i}
            x={pad + i * bw}
            y={52 - h * 44}
            width={bw * 0.6}
            height={h * 44}
            rx={0.5}
            fill={T.accent}
            opacity={0.5 + h * 0.5}
          />
        ))}
        <line x1={pad} y1={52} x2={100 - pad} y2={52} stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} />
      </svg>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
          color: 'rgba(255,255,255,0.42)',
          fontFamily: T.bodyFont,
          fontSize: 18,
        }}
      >
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
};

/** A push-notification toast (Gumroad-style sale ping). */
export const Toast: React.FC<{
  app?: string;
  title: string;
  subtitle: string;
  time?: string;
  width?: number;
}> = ({ app = 'G', title, subtitle, time = '2 min ago', width = 600 }) => (
  <div
    style={{
      width,
      background: T.toastBg,
      borderRadius: 26,
      padding: '22px 26px',
      display: 'flex',
      gap: 18,
      alignItems: 'center',
      boxShadow: '0 18px 44px rgba(0,0,0,0.12)',
    }}
  >
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${T.accent}, #b85c3e)`,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: T.displayFont,
        fontWeight: 800,
        fontSize: 34,
        flex: '0 0 auto',
      }}
    >
      {app}
    </div>
    <div style={{ flex: '1 1 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 30, color: '#1a1a1e' }}>{title}</span>
        <span style={{ fontSize: 24, color: '#8a8a92' }}>{time}</span>
      </div>
      <div style={{ marginTop: 4, fontSize: 28, color: '#3a3a40' }}>{subtitle}</div>
    </div>
  </div>
);

/** "Comment KEYWORD and I'll send it over" block for the CTA frame. */
export const CommentPill: React.FC<{ keyword: string; tail?: string }> = ({
  keyword,
  tail = "and I'll send it over.",
}) => (
  <div
    style={{
      background: T.toastBg,
      borderRadius: 30,
      padding: '32px 42px',
      display: 'inline-block',
      boxShadow: '0 18px 44px rgba(0,0,0,0.10)',
    }}
  >
    <div style={{ fontFamily: T.bodyFont, fontSize: 34, color: '#3a3a40', fontWeight: 500 }}>Comment</div>
    <div
      style={{
        fontFamily: T.displayFont,
        fontWeight: 800,
        fontSize: 100,
        letterSpacing: '-0.02em',
        color: T.ink,
        lineHeight: 1.0,
        margin: '6px 0',
      }}
    >
      “{keyword}”
    </div>
    <div style={{ fontFamily: T.bodyFont, fontSize: 34, color: '#3a3a40', fontWeight: 500 }}>{tail}</div>
  </div>
);

/** iPhone lock screen with stacked sale notifications (bleeds off-frame). */
export const PhoneStack: React.FC = () => {
  const notifs = [
    'New sale: AI Tool — $197',
    'New sale: Agent Pack — $149',
    'New sale: AI Tool — $197',
    'New sale: Prompt Kit — $79',
  ];
  return (
    <div
      style={{
        width: 560,
        height: 1000,
        borderRadius: 76,
        background: 'linear-gradient(165deg, #2a160e 0%, #d96a3f 52%, #1c0f0a 100%)',
        padding: 24,
        boxShadow: '0 50px 120px rgba(0,0,0,0.45)',
        border: '10px solid #0a0a0c',
        overflow: 'hidden',
        fontFamily: T.bodyFont,
        color: '#fff',
      }}
    >
      <div style={{ width: 150, height: 30, background: '#0a0a0c', borderRadius: 20, margin: '0 auto 40px' }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 30, opacity: 0.9, fontWeight: 500 }}>Monday, June 9</div>
        <div style={{ fontFamily: T.displayFont, fontWeight: 700, fontSize: 150, lineHeight: 1.0, letterSpacing: '-0.02em' }}>
          9:41
        </div>
      </div>
      <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {notifs.map((t, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              background: 'rgba(255,255,255,0.17)',
              borderRadius: 24,
              padding: '18px 20px',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: '#fff',
                color: T.accent,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: T.displayFont,
                fontWeight: 800,
                fontSize: 34,
                flex: '0 0 auto',
              }}
            >
              G
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 26 }}>Gumroad</span>
                <span style={{ fontSize: 22, opacity: 0.8 }}>now</span>
              </div>
              <div style={{ fontSize: 24, opacity: 0.95 }}>{t}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Big faded Claude "burst" glyph used as a background motif. */
export const ClaudeBurst: React.FC<{ size?: number; color?: string; opacity?: number }> = ({
  size = 760,
  color = '#0b0b0c',
  opacity = 0.05,
}) => {
  const spokes = 12;
  const w = 5.5;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ opacity }}>
      {Array.from({ length: spokes }).map((_, i) => {
        const ang = i * (360 / spokes);
        const h = i % 2 === 0 ? 40 : 27;
        return (
          <rect
            key={i}
            x={50 - w / 2}
            y={50 - h}
            width={w}
            height={h}
            rx={w / 2}
            fill={color}
            transform={`rotate(${ang} 50 50)`}
          />
        );
      })}
    </svg>
  );
};
