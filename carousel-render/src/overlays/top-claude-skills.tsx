/** Reel overlay: "TOP 5 CLAUDE SKILLS". Handle + paragraph rows on a
 * transparent canvas. The 5th skill is Ultron. */
import React from 'react';
import { OverlayRoot, TitleBlock, AH_ORANGE, T, CREAM, INK, SHADOW, DISP, accent } from './kit';

const LABEL_COL = 312;
const DESC_COL = 470;
const SEAM = 8;
const ROW_GAP = 15;

type Skill = { who: string; name: string; desc: string };
const SKILLS: Skill[] = [
  { who: 'hardikpandya/', name: 'stop-slop', desc: 'Strips out robotic phrasing and AI tells so every output reads like a human wrote it.' },
  { who: 'yusufkaraaslan/', name: 'Skill_Seekers', desc: 'Turns any site, doc, or video into a reusable skill. Claude becomes a specialist in any field instantly.' },
  { who: 'JuliusBrussee/', name: 'caveman', desc: 'Cuts your Claude token use by up to 75 percent. Same output, far fewer limit hits.' },
  { who: 'nextlevelbuilder/', name: 'ui-ux-pro-max', desc: 'Builds full websites and landing pages from one prompt. Saves thousands in design and dev.' },
  { who: '51ultron/', name: 'growth-engine', desc: 'Gives Claude persistent memory and a team of agents. Runs research, leads, and content as one system.' },
];

const Row: React.FC<{ s: Skill }> = ({ s }) => (
  <div style={{ display: 'flex', gap: SEAM, alignItems: 'flex-start' }}>
    <div style={{ width: LABEL_COL, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ background: AH_ORANGE, borderRadius: 12, padding: '11px 16px', boxShadow: SHADOW, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, maxWidth: LABEL_COL }}>
        <span style={{ fontFamily: DISP, fontWeight: 600, fontSize: 23, color: 'rgba(255,255,255,0.82)', letterSpacing: -0.2, textAlign: 'right' }}>{s.who}</span>
        <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 31, color: '#fff', textAlign: 'right', lineHeight: 1.06, letterSpacing: -0.4 }}>{s.name}</span>
      </div>
    </div>
    <div style={{ width: DESC_COL }}>
      <div style={{ background: CREAM, borderRadius: 12, padding: '12px 18px', boxShadow: SHADOW }}>
        <span style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 28, color: INK, lineHeight: 1.32, letterSpacing: -0.2 }}>{s.desc}</span>
      </div>
    </div>
  </div>
);

export const TopClaudeSkillsOverlay: React.FC = () => (
  <OverlayRoot>
    <TitleBlock title={<>TOP 5 {accent('CLAUDE')} SKILLS</>} sub="TO MAKE IT 10X MORE UNSTOPPABLE" size={70} subSize={32} />
    <div style={{ marginTop: 24, width: LABEL_COL + SEAM + DESC_COL, display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
      {SKILLS.map((s) => (
        <Row key={s.name} s={s} />
      ))}
    </div>
  </OverlayRoot>
);
