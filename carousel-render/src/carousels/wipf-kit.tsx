/** Shared building blocks for the Next WIPF carousels (batch decks). */
import React from 'react';
import { Disp, Mono, ah, AH_ORANGE } from './ah-blocks';
import { LogoBadge } from './deck-icons';
import { carouselTheme as T } from './theme';
import {
  SiClaude, SiN8n, SiZapier, SiSupabase, SiConvex, SiTypescript, SiNextdotjs, SiTailwindcss,
  SiRender, SiRailway, SiStripe, SiCursor, SiPerplexity, SiResend, SiPosthog, SiSentry,
  SiReddit, SiX, SiGmail, SiGooglegemini, SiVercel, SiNetlify, SiMeta, SiTiktok, SiInstagram, SiNotion, SiGithub,
} from '@icons-pack/react-simple-icons';

export const CI = '#161412';
export const DISP = T.displayFont;
export { AH_ORANGE, ah, T };

export const Kick: React.FC<{ label: string }> = ({ label }) => <Mono size={23} color={AH_ORANGE}>{label}</Mono>;

export const Callout: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <div style={{ background: dark ? 'rgba(232,84,43,0.13)' : '#f4ddd2', borderRadius: 14, padding: '24px 28px', fontFamily: T.bodyFont, fontWeight: 700, fontSize: 31, lineHeight: 1.34, color: dark ? '#f3efe6' : CI }}>{children}</div>
);

export const Head: React.FC<{ kick: string; lead: string; tail: string; sub?: string; dark: boolean; size?: number }> = ({ kick, lead, tail, sub, dark, size = 90 }) => (
  <div>
    <Kick label={kick} />
    <Disp size={size} style={{ marginTop: 14 }}>{lead} <span style={ah.oi}>{tail}</span></Disp>
    {sub && <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 32, color: dark ? '#cfcabf' : '#3a3733', lineHeight: 1.4, marginTop: 16 }}>{sub}</div>}
  </div>
);

/* brand resolver: real Si logo where available, else a lettermark tile */
type AnyIcon = React.ComponentType<{ size?: number; color?: string }>;
const BRANDS: Record<string, [AnyIcon, string]> = {
  claude: [SiClaude, '#D97757'], n8n: [SiN8n, '#EA4B71'], zapier: [SiZapier, '#FF4F00'],
  supabase: [SiSupabase, '#3ECF8E'], convex: [SiConvex, '#EE342F'], typescript: [SiTypescript, '#3178C6'],
  nextjs: [SiNextdotjs, '#0A0A0A'], tailwind: [SiTailwindcss, '#06B6D4'], render: [SiRender, '#0A0A0A'],
  railway: [SiRailway, '#0B0D0E'], stripe: [SiStripe, '#635BFF'], cursor: [SiCursor, '#0A0A0A'],
  perplexity: [SiPerplexity, '#1FB8CD'], resend: [SiResend, '#0A0A0A'], posthog: [SiPosthog, '#1D4AFF'],
  sentry: [SiSentry, '#362D59'], reddit: [SiReddit, '#FF4500'], x: [SiX, '#0A0A0A'], gmail: [SiGmail, '#EA4335'],
  gemini: [SiGooglegemini, '#886FBF'], vercel: [SiVercel, '#0A0A0A'], netlify: [SiNetlify, '#00C7B7'],
  meta: [SiMeta, '#0467DF'], tiktok: [SiTiktok, '#0A0A0A'], instagram: [SiInstagram, '#E4405F'], notion: [SiNotion, '#0A0A0A'],
  github: [SiGithub, '#0A0A0A'],
};
const LETTERS: Record<string, [string, string]> = {
  polar: ['P', '#1F2937'], canva: ['C', '#00C4CC'], heroku: ['H', '#430098'], firecrawl: ['F', '#E8542B'],
  apify: ['A', '#FF9012'], hetzner: ['H', '#D50C2D'], betterauth: ['B', '#0A0A0A'], sovian: ['S', '#E8542B'],
  gumloop: ['G', '#111111'], make: ['M', '#6D00CC'], codex: ['C', '#0A0A0A'], antigravity: ['A', '#4285F4'],
};

const LetterTile: React.FC<{ ch: string; color: string; box: number; chip: string }> = ({ ch, color, box, chip }) => (
  <div style={{ width: box, height: box, borderRadius: Math.round(box * 0.26), background: chip, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 32px rgba(0,0,0,0.22)', flex: '0 0 auto' }}>
    <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: Math.round(box * 0.5), color, lineHeight: 1 }}>{ch}</span>
  </div>
);

export const brandBadge = (name: string, box = 86, chip = '#faf7f0'): React.ReactNode => {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (BRANDS[key]) return <LogoBadge Icon={BRANDS[key][0]} color={BRANDS[key][1]} chip={chip} box={box} />;
  if (LETTERS[key]) return <LetterTile ch={LETTERS[key][0]} color={LETTERS[key][1]} box={box} chip={chip} />;
  return <LetterTile ch={name[0].toUpperCase()} color="#0A0A0A" box={box} chip={chip} />;
};

/** A clean browser-frame card (repo/site mock). */
export const BrowserMock: React.FC<{ url: string; stars?: string; children: React.ReactNode; dark?: boolean }> = ({ url, stars, children, dark = true }) => (
  <div style={{ background: dark ? '#0e0e10' : '#ffffff', border: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(20,16,12,0.12)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 26px 60px rgba(20,16,12,0.18)' }}>
    <div style={{ height: 54, background: dark ? '#161618' : '#f0ebe0', display: 'flex', alignItems: 'center', gap: 9, padding: '0 20px', borderBottom: dark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(20,16,12,0.08)' }}>
      {['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />)}
      <span style={{ marginLeft: 10, fontFamily: T.monoFont, fontSize: 17, color: dark ? '#8a8a92' : '#8a857c' }}>{url}</span>
      {stars && <span style={{ marginLeft: 'auto', fontFamily: T.monoFont, fontSize: 16, color: AH_ORANGE }}>★ {stars}</span>}
    </div>
    <div style={{ padding: '34px 30px' }}>{children}</div>
  </div>
);
