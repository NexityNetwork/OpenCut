/** Reel overlay: "15 HACKS TO NEVER HIT YOUR CLAUDE LIMIT". Label + paragraph
 * rows on a transparent canvas. Hack #5 is Ultron. */
import React from 'react';
import { OverlayRoot, TitleBlock, FooterTag, AH_ORANGE, T, CREAM, INK, SHADOW, DISP, accent } from './kit';

const LABEL_COL = 300;
const DESC_COL = 474;
const SEAM = 8;
const ROW_GAP = 13;

type Hack = { n: number; title: string; desc: string };
const HACKS: Hack[] = [
  { n: 1, title: 'One chat per task', desc: 'Start a new chat for every task. Mixing topics in one thread piles up context and burns tokens fast.' },
  { n: 2, title: 'Add no commentary', desc: 'Put it in every prompt. Claude returns output only and stops explaining itself. Roughly half the tokens.' },
  { n: 3, title: 'Use Projects for repeat work', desc: 'Stop re-uploading the same files. Store them once in a Project so every new chat starts with full context.' },
  { n: 4, title: 'Let it interview you', desc: 'Tell Claude to ask you questions before it starts. Better output the first time, far less wasted back and forth.' },
  { n: 5, title: 'Run it on Ultron', desc: 'Ultron holds your context in a memory layer and feeds Claude only what is relevant each turn, so you stop re-explaining and stop hitting the limit.' },
];

const Row: React.FC<{ h: Hack }> = ({ h }) => (
  <div style={{ display: 'flex', gap: SEAM, alignItems: 'flex-start' }}>
    <div style={{ width: LABEL_COL, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ background: AH_ORANGE, borderRadius: 12, padding: '11px 16px', boxShadow: SHADOW, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, maxWidth: LABEL_COL }}>
        <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 21, color: 'rgba(255,255,255,0.82)', letterSpacing: 2 }}>HACK #{h.n}</span>
        <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 31, color: '#fff', textAlign: 'right', lineHeight: 1.08, letterSpacing: -0.4 }}>{h.title}</span>
      </div>
    </div>
    <div style={{ width: DESC_COL }}>
      <div style={{ background: CREAM, borderRadius: 12, padding: '12px 18px', boxShadow: SHADOW }}>
        <span style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 28, color: INK, lineHeight: 1.32, letterSpacing: -0.2 }}>{h.desc}</span>
      </div>
    </div>
  </div>
);

export const ClaudeLimitHacksOverlay: React.FC = () => (
  <OverlayRoot>
    <TitleBlock title={<>15 {accent('HACKS')}</>} sub="TO NEVER HIT YOUR CLAUDE LIMIT" size={88} subSize={32} />
    <div style={{ marginTop: 22, width: LABEL_COL + SEAM + DESC_COL, display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
      {HACKS.map((h) => (
        <Row key={h.n} h={h} />
      ))}
    </div>
    <FooterTag>Hacks 6 to 15 in the caption</FooterTag>
  </OverlayRoot>
);
