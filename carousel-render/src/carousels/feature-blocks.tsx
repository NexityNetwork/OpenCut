/**
 * Blocks for the "N features nobody uses" listicle format.
 *
 * For a CLI like Claude Code, the per-feature "screenshot" is an editor-style
 * CodeCard showing the real config/command (what devs actually screenshot),
 * with light syntax coloring. Plus the big faded corner number, the feature
 * slide, the logo+mini-card cover, and a white book for the mid-deck CTA.
 */
import React from 'react';
import { CardShell, Headline, Rich, Stack, ClaudeBurst } from './blocks';
import { carouselTheme as T } from './theme';

/* ── light syntax coloring (comments / keys / strings / glyphs) ───────────*/
function tokenize(line: string): React.ReactNode {
  if (line.trim() === '') return ' ';
  const t = line.trimStart();
  if (t.startsWith('//') || t.startsWith('#') || t.startsWith('---')) {
    return <span style={{ color: '#6b6b72' }}>{line}</span>;
  }
  // diff lines
  if (t.startsWith('+ ') || t === '+') return <span style={{ color: '#7ddf8e' }}>{line}</span>;
  if (t.startsWith('- ')) return <span style={{ color: '#e8857a' }}>{line}</span>;
  const nodes: React.ReactNode[] = [];
  let tail = line;
  const km = line.match(/^(\s*)("?[\w$.\-]+"?)(\s*:)(.*)$/);
  if (km) {
    nodes.push(km[1]);
    nodes.push(
      <span key="k" style={{ color: T.accent }}>
        {km[2]}
      </span>,
    );
    nodes.push(km[3]);
    tail = km[4];
  }
  tail.split(/("(?:[^"\\]|\\.)*")/g).forEach((p, i) => {
    if (p.startsWith('"')) {
      nodes.push(
        <span key={'s' + i} style={{ color: '#9ece9e' }}>
          {p}
        </span>,
      );
    } else {
      const sub = p.split(/(✓|✔|⎿|>|\$)/g).map((q, j) => {
        if (/[✓✔]/.test(q)) return <span key={j} style={{ color: '#7ddf8e' }}>{q}</span>;
        if (/[⎿>$]/.test(q)) return <span key={j} style={{ color: T.accent }}>{q}</span>;
        return <React.Fragment key={j}>{q}</React.Fragment>;
      });
      nodes.push(<React.Fragment key={'t' + i}>{sub}</React.Fragment>);
    }
  });
  return nodes;
}

/** Dark editor/terminal card with a real config snippet.
 * Width is clamped to the 810px text-safe column and the font auto-fits the
 * longest line, so code never overflows the reel safe zone. */
export const CodeCard: React.FC<{ title: string; lines: string[]; width?: number; fontSize?: number; grow?: boolean }> = ({
  title,
  lines,
  width = 810,
  fontSize = 30,
  grow = false,
}) => {
  const w = Math.min(width, 800);
  const inner = w - 56; // horizontal padding
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const fs = Math.max(15, Math.min(fontSize, Math.floor(inner / (longest * 0.6))));
  return (
  <div
    style={{
      width: w,
      ...(grow ? { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 } : {}),
      background: '#0e0e10',
      borderRadius: 18,
      overflow: 'hidden',
      boxShadow: '0 30px 70px rgba(0,0,0,0.22)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}
  >
    <div
      style={{
        height: 48,
        background: '#161618',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 18px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
        <span key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
      ))}
      <span style={{ marginLeft: 8, color: '#8a8a92', fontSize: 22, fontFamily: T.bodyFont }}>{title}</span>
    </div>
    <div
      style={{
        ...(grow ? { flex: 1 } : {}),
        padding: '24px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: grow ? 10 : 7,
        fontFamily: T.monoFont,
        fontSize: fs,
        lineHeight: 1.4,
        textAlign: 'left',
      }}
    >
      {lines.map((l, i) => (
        <div key={i} style={{ whiteSpace: 'pre', color: '#d6d6dc' }}>
          {tokenize(l)}
        </div>
      ))}
      {grow && (
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, paddingTop: 18 }}>
          <span style={{ color: T.accent }}>{'>'}</span>
          <span style={{ width: Math.round(fs * 0.55), height: fs, background: '#d6d6dc', opacity: 0.85, display: 'inline-block' }} />
        </div>
      )}
    </div>
  </div>
  );
};

/** Big faded number in the top-right corner. */
export const BigNumber: React.FC<{ n: number }> = ({ n }) => (
  <div
    style={{
      position: 'absolute',
      right: 56,
      top: 150,
      fontFamily: T.displayFont,
      fontWeight: 800,
      fontSize: 300,
      lineHeight: 1,
      color: 'rgba(0,0,0,0.06)',
    }}
  >
    {n}
  </div>
);

/** One numbered feature slide: name + 2–3 line desc + code card. */
export const FeatureSlide: React.FC<{
  n: number;
  name: string;
  desc: string;
  code: { title: string; lines: string[] };
}> = ({ n, name, desc, code }) => (
  <CardShell background={<BigNumber n={n} />}>
    <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        style={{
          fontFamily: T.displayFont,
          fontWeight: 800,
          fontSize: 84,
          letterSpacing: '-0.03em',
          color: T.ink,
          lineHeight: 1.0,
        }}
      >
        {name}
      </div>
      <div style={{ marginTop: 16 }}>
        <Rich text={desc} size={34} maxWidth={820} lineHeight={1.36} />
      </div>
      <div style={{ flex: 1, display: 'flex', marginTop: 28, minHeight: 0 }}>
        <CodeCard grow title={code.title} lines={code.lines} />
      </div>
    </div>
  </CardShell>
);

/* ── cover mini-cards ─────────────────────────────────────────────────────*/
const MiniCard: React.FC<{ children: React.ReactNode; rot?: number; style?: React.CSSProperties }> = ({
  children,
  rot = 0,
  style,
}) => (
  <div
    style={{
      position: 'absolute',
      background: '#fff',
      borderRadius: 16,
      boxShadow: '0 16px 40px rgba(0,0,0,0.14)',
      border: '1px solid rgba(0,0,0,0.05)',
      padding: 14,
      transform: `rotate(${rot}deg)`,
      ...style,
    }}
  >
    {children}
  </div>
);

const BarsMini: React.FC = () => (
  <svg width="92" height="64" viewBox="0 0 92 64">
    {[28, 46, 20, 56].map((h, i) => (
      <rect key={i} x={6 + i * 22} y={62 - h} width="14" height={h} rx="3" fill={i === 3 ? T.accent : '#1a1a1e'} />
    ))}
  </svg>
);
const LineMini: React.FC = () => (
  <svg width="120" height="64" viewBox="0 0 120 64">
    <polyline points="4,52 30,44 58,30 86,34 116,8" fill="none" stroke="#2f6df0" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <text x="4" y="16" fontFamily="Inter Variable, sans-serif" fontSize="16" fontWeight="800" fill="#2f6df0">
      +200%
    </text>
  </svg>
);
const DonutMini: React.FC = () => (
  <svg width="74" height="74" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="14" fill="none" stroke="#eee" strokeWidth="5" />
    <circle cx="18" cy="18" r="14" fill="none" stroke={T.accent} strokeWidth="5" strokeDasharray="35 88" strokeLinecap="round" transform="rotate(-90 18 18)" />
    <text x="18" y="21" textAnchor="middle" fontFamily="Inter Variable, sans-serif" fontSize="9" fontWeight="800" fill="#1a1a1e">
      40%
    </text>
  </svg>
);

/** Cover: logo + floating mini cards, headline below. */
export const FeatureCover: React.FC<{ titleLines: string[] }> = ({ titleLines }) => (
  <CardShell center swipe="→">
    <Stack gap={44} style={{ alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 470, height: 320 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 78, display: 'flex', justifyContent: 'center' }}>
          <ClaudeBurst size={184} color={T.accent} opacity={1} />
        </div>
        <MiniCard rot={-8} style={{ left: 18, top: 128 }}>
          <BarsMini />
        </MiniCard>
        <MiniCard rot={7} style={{ right: 6, top: 18 }}>
          <LineMini />
        </MiniCard>
        <MiniCard rot={10} style={{ right: 30, top: 188 }}>
          <DonutMini />
        </MiniCard>
      </div>
      <Headline lines={titleLines} size={64} />
    </Stack>
  </CardShell>
);

/** White book mock for the mid-deck CTA. */
export const WhiteBook: React.FC<{ lines: string[]; footer?: string }> = ({ lines, footer = 'made by Ultron' }) => (
  <div
    style={{
      width: 300,
      height: 418,
      background: 'linear-gradient(135deg,#ffffff,#ececed)',
      borderRadius: '6px 16px 16px 6px',
      boxShadow: '0 40px 84px rgba(0,0,0,0.22)',
      transform: 'rotate(-6deg)',
      border: '1px solid #e2e2e6',
      padding: '38px 30px',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    <ClaudeBurst size={56} color={T.ink} opacity={1} />
    <div style={{ marginTop: 'auto' }}>
      {lines.map((l, i) => (
        <div
          key={i}
          style={{ fontFamily: T.displayFont, fontWeight: 800, fontSize: 46, color: T.ink, lineHeight: 1.04, letterSpacing: '-0.01em' }}
        >
          {l}
        </div>
      ))}
    </div>
    <div style={{ marginTop: 16, fontFamily: T.bodyFont, fontSize: 18, color: T.inkMuted }}>{footer}</div>
  </div>
);
