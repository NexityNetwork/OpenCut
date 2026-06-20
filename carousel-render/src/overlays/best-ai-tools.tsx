/**
 * Reel overlay: "BEST AI TOOLS" tool list, rendered on a TRANSPARENT canvas
 * (1080x1920, alpha). Text sits on solid chips so it stays legible over any
 * footage; everything around the chips is transparent so the reel shows through.
 * Real brand logos via brandBadge, clean lettermark tiles otherwise. No emojis.
 */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { brandBadge, AH_ORANGE, T } from '../carousels/wipf-kit';

const DARK = '#100f0e';
const CREAM = '#f4f1ea';
const INK = '#15130f';

type Row = [label: string, tool: string, key: string];
const ROWS: Row[] = [
  ['Writing', 'Claude', 'claude'],
  ['Automation', 'n8n', 'n8n'],
  ['Build agents', 'Relevance AI', 'relevance'],
  ['Research', 'Perplexity', 'perplexity'],
  ['Design', 'Canva', 'canva'],
  ['Build apps', 'Replit / Lovable', 'replit'],
  ['Voice agents', 'Retell AI', 'retell'],
  ['Outreach', 'Clay', 'clay'],
  ['Images', 'Nano Banana Pro', 'nanobanana'],
  ['Video ads', 'Arcads', 'arcads'],
  ['Lead gen', 'Leadme.Pro', 'leadme'],
  ['CRM + workflows', 'Go High Level', 'gohighlevel'],
  ['Meetings', 'Fathom', 'fathom'],
  ['Voice cloning', 'ElevenLabs', 'elevenlabs'],
  ['Note taking', 'Granola', 'granola'],
  ['Build websites', 'Framer', 'framer'],
  ['AI avatars', 'HeyGen', 'heygen'],
  ['Productivity', 'Notion', 'notion'],
];

const SHADOW = '0 10px 30px rgba(0,0,0,0.28)';
const ROW_H = 70;
const GAP = 9;
const LOGO = 44;
const LABEL_W = 372;

const RowChip: React.FC<{ row: Row }> = ({ row }) => {
  const [label, tool, key] = row;
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 9, height: ROW_H }}>
      <div
        style={{
          width: LABEL_W,
          background: AH_ORANGE,
          borderRadius: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 22px',
          boxShadow: SHADOW,
        }}
      >
        <span style={{ fontFamily: T.displayFont, fontWeight: 700, fontSize: 33, color: '#fff', letterSpacing: -0.4, textAlign: 'right' }}>
          {label}
        </span>
      </div>
      <div
        style={{
          flex: 1,
          background: CREAM,
          borderRadius: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '0 20px',
          boxShadow: SHADOW,
        }}
      >
        {brandBadge(key, LOGO, '#ffffff')}
        <span style={{ fontFamily: T.displayFont, fontWeight: 700, fontSize: 34, color: INK, letterSpacing: -0.5 }}>
          {tool}
        </span>
      </div>
    </div>
  );
};

export const BestAIToolsOverlay: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: T.displayFont }}>
    <div style={{ position: 'absolute', top: 70, left: 66, right: 66, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Title */}
      <div style={{ background: DARK, borderRadius: 18, padding: '16px 34px', boxShadow: SHADOW }}>
        <span style={{ fontFamily: T.displayFont, fontWeight: 800, fontSize: 96, color: '#fff', letterSpacing: -3, lineHeight: 1 }}>
          BEST <span style={{ color: AH_ORANGE }}>AI</span> TOOLS
        </span>
      </div>
      <div style={{ marginTop: 12, background: CREAM, borderRadius: 13, padding: '11px 26px', boxShadow: SHADOW }}>
        <span style={{ fontFamily: T.displayFont, fontWeight: 700, fontSize: 38, color: INK, letterSpacing: -0.8 }}>
          YOU NEED TO USE IN 2026
        </span>
      </div>

      {/* Rows */}
      <div style={{ marginTop: 26, width: '100%', display: 'flex', flexDirection: 'column', gap: GAP }}>
        {ROWS.map((r) => (
          <RowChip key={r[2]} row={r} />
        ))}
      </div>
    </div>
  </AbsoluteFill>
);
