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

const ROW_H = 54;
const GAP = 5;
const LABEL_COL = 360;
const TOOL_COL = 432;
const SEAM = 7;
const ICONSZ = 28;

const RowChip: React.FC<{ row: Row }> = ({ row }) => {
  const [label, tool, IconC] = row;
  return (
    <div style={{ display: 'flex', gap: SEAM, height: ROW_H }}>
      {/* label column: chip hugs its text + icon, right-aligned to the seam */}
      <div style={{ width: LABEL_COL, display: 'flex', justifyContent: 'flex-end' }}>
        <div
          style={{
            height: ROW_H,
            background: AH_ORANGE,
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 17px',
            boxShadow: SHADOW,
          }}
        >
          <span style={{ fontFamily: T.displayFont, fontWeight: 700, fontSize: 34, color: '#fff', letterSpacing: -0.4 }}>
            {label}
          </span>
          <IconC size={ICONSZ} color="#fff" strokeWidth={2.4} />
        </div>
      </div>
      {/* tool column: chip hugs its text, left-aligned from the seam */}
      <div style={{ width: TOOL_COL, display: 'flex', justifyContent: 'flex-start' }}>
        <div
          style={{
            height: ROW_H,
            background: CREAM,
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0 19px',
            boxShadow: SHADOW,
          }}
        >
          <span style={{ fontFamily: T.displayFont, fontWeight: 700, fontSize: 36, color: INK, letterSpacing: -0.5 }}>
            {tool}
          </span>
        </div>
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
      <div style={{ marginTop: 20, width: LABEL_COL + SEAM + TOOL_COL, display: 'flex', flexDirection: 'column', gap: GAP }}>
        {ROWS.map((r) => (
          <RowChip key={r[0]} row={r} />
        ))}
      </div>
    </div>
  </AbsoluteFill>
);
