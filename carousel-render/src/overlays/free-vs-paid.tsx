/** Reel overlay: "PAID VS FREE" AI tool swaps. Two content-hugging columns on a
 * transparent canvas, seam-aligned. Ultron in the footer. */
import React from 'react';
import { OverlayRoot, TitleBlock, FooterTag, CREAM, INK, RED, GREEN, SHADOW, DISP, accent } from './kit';

const PAID_COL = 330;
const FREE_COL = 380;
const SEAM = 7;
const ROW_H = 46;
const ROW_GAP = 5;
const FS = 30;

const PAIRS: [string, string][] = [
  ['Midjourney', 'Nano Banana Pro'],
  ['ElevenLabs', 'Kokoro TTS'],
  ['Runway', 'CapCut AI'],
  ['Notion AI', 'Obsidian'],
  ['Zapier', 'n8n'],
  ['Typeform', 'Tally'],
  ['Loom', 'Screenity'],
  ['Canva Pro', 'Adobe Express'],
  ['Jasper AI', 'ChatGPT Free'],
  ['OpusClip', 'Clippah'],
  ['Descript', 'Audacity + Whisper'],
  ['Calendly', 'Cal.com'],
  ['Grammarly', 'LanguageTool'],
  ['Dropbox', 'Google Drive'],
  ['Synthesia', 'HeyGen'],
];

const Chip: React.FC<{ text: string; bg: string; color: string }> = ({ text, bg, color }) => (
  <div style={{ height: ROW_H, background: bg, borderRadius: 11, display: 'inline-flex', alignItems: 'center', padding: '0 16px', boxShadow: SHADOW }}>
    <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: FS, color, letterSpacing: -0.3 }}>{text}</span>
  </div>
);

const Row: React.FC<{ paid: string; free: string }> = ({ paid, free }) => (
  <div style={{ display: 'flex', gap: SEAM, height: ROW_H }}>
    <div style={{ width: PAID_COL, display: 'flex', justifyContent: 'flex-end' }}>
      <Chip text={paid} bg={RED} color="#fff" />
    </div>
    <div style={{ width: FREE_COL, display: 'flex', justifyContent: 'flex-start' }}>
      <Chip text={free} bg={CREAM} color={INK} />
    </div>
  </div>
);

export const FreeVsPaidOverlay: React.FC = () => (
  <OverlayRoot>
    <TitleBlock title={<>PAID VS {accent('FREE')}</>} sub="Free swaps for the AI tools you pay for" size={78} subSize={31} />
    <div style={{ marginTop: 20, width: PAID_COL + SEAM + FREE_COL, display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
      <div style={{ display: 'flex', gap: SEAM, height: 52, marginBottom: 3 }}>
        <div style={{ width: PAID_COL, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ height: 52, background: RED, borderRadius: 12, display: 'inline-flex', alignItems: 'center', padding: '0 26px', boxShadow: SHADOW }}>
            <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 34, color: '#fff', letterSpacing: -0.5 }}>Paid</span>
          </div>
        </div>
        <div style={{ width: FREE_COL, display: 'flex', justifyContent: 'flex-start' }}>
          <div style={{ height: 52, background: GREEN, borderRadius: 12, display: 'inline-flex', alignItems: 'center', padding: '0 26px', boxShadow: SHADOW }}>
            <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 34, color: '#fff', letterSpacing: -0.5 }}>Free</span>
          </div>
        </div>
      </div>
      {PAIRS.map(([p, f]) => (
        <Row key={p} paid={p} free={f} />
      ))}
    </div>
    <FooterTag>Skip the stack. Run it all in Ultron.</FooterTag>
  </OverlayRoot>
);
