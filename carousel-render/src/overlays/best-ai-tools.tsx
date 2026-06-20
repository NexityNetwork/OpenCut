/**
 * Reel overlay: "BEST AI TOOLS" tool list on a TRANSPARENT canvas (1080x1920,
 * alpha). Clean line icon per action (no brand logos, no emojis). Compact rows
 * centered vertically so the block stays tight in the middle with clear space
 * top and bottom (no spilling into reel safe zones). Text sits on solid chips
 * for legibility; everything else is transparent so the footage shows through.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AH_ORANGE, T } from '../carousels/wipf-kit';
import {
  PenLine, Zap, Bot, Search, Palette, Smartphone, PhoneCall, Send,
  Image as ImageIcon, Film, Target, GitBranch, Video, Mic, FileText,
  Globe, UserRound, ListChecks,
} from 'lucide-react';

const DARK = '#100f0e';
const CREAM = '#f4f1ea';
const INK = '#15130f';
const SHADOW = '0 8px 24px rgba(0,0,0,0.30)';

type Icon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
type Row = [label: string, tool: string, Icon: Icon];

const ROWS: Row[] = [
  ['Writing', 'Claude', PenLine],
  ['Automation', 'n8n', Zap],
  ['Build agents', 'Ultron', Bot],
  ['Research', 'Perplexity', Search],
  ['Design', 'Canva', Palette],
  ['Build apps', 'Replit / Lovable', Smartphone],
  ['Voice agents', 'Retell AI', PhoneCall],
  ['Outreach', 'Clay', Send],
  ['Images', 'Nano Banana Pro', ImageIcon],
  ['Video ads', 'Arcads', Film],
  ['Lead gen', 'Leadme.Pro', Target],
  ['CRM + workflows', 'Go High Level', GitBranch],
  ['Meetings', 'Fathom', Video],
  ['Voice cloning', 'ElevenLabs', Mic],
  ['Note taking', 'Granola', FileText],
  ['Build websites', 'Framer', Globe],
  ['AI avatars', 'HeyGen', UserRound],
  ['Productivity', 'Notion', ListChecks],
];

const ROW_H = 52;
const GAP = 5;
const LABEL_W = 384;
const ICONSZ = 25;

const RowChip: React.FC<{ row: Row }> = ({ row }) => {
  const [label, tool, IconC] = row;
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: GAP, height: ROW_H }}>
      <div
        style={{
          width: LABEL_W,
          background: AH_ORANGE,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 11,
          padding: '0 18px',
          boxShadow: SHADOW,
        }}
      >
        <span style={{ fontFamily: T.displayFont, fontWeight: 700, fontSize: 31, color: '#fff', letterSpacing: -0.4 }}>
          {label}
        </span>
        <IconC size={ICONSZ} color="#fff" strokeWidth={2.25} />
      </div>
      <div
        style={{
          flex: 1,
          background: CREAM,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          boxShadow: SHADOW,
        }}
      >
        <span style={{ fontFamily: T.displayFont, fontWeight: 700, fontSize: 33, color: INK, letterSpacing: -0.5 }}>
          {tool}
        </span>
      </div>
    </div>
  );
};

export const BestAIToolsOverlay: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: T.displayFont }}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        left: 66,
        right: 66,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ background: DARK, borderRadius: 16, padding: '14px 30px', boxShadow: SHADOW }}>
        <span style={{ fontFamily: T.displayFont, fontWeight: 800, fontSize: 80, color: '#fff', letterSpacing: -2.5, lineHeight: 1 }}>
          BEST <span style={{ color: AH_ORANGE }}>AI</span> TOOLS
        </span>
      </div>
      <div style={{ marginTop: 10, background: CREAM, borderRadius: 12, padding: '8px 22px', boxShadow: SHADOW }}>
        <span style={{ fontFamily: T.displayFont, fontWeight: 700, fontSize: 33, color: INK, letterSpacing: -0.7 }}>
          YOU NEED TO USE IN 2026
        </span>
      </div>
      <div style={{ marginTop: 20, width: '100%', display: 'flex', flexDirection: 'column', gap: GAP }}>
        {ROWS.map((r) => (
          <RowChip key={r[0]} row={r} />
        ))}
      </div>
    </div>
  </AbsoluteFill>
);
