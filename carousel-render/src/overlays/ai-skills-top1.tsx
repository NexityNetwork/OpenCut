/** Reel overlay: "5 AI SKILLS YOU NEED TO MAKE IT IN THE TOP 1%". Ultron is
 * woven into Skill #2. */
import React from 'react';
import { OverlayRoot, TitleBlock, LabelDescRow, KickerTitle, accent } from './kit';

const LABEL_COL = 300;
const DESC_COL = 474;
const ROW_GAP = 13;

const SKILLS: { n: number; title: string; desc: string }[] = [
  { n: 1, title: 'Prompt Engineering', desc: 'Master the art of speaking with AI. Bad input means bad output.' },
  { n: 2, title: 'Building AI Agents', desc: 'Agents handle multi-step tasks start to finish without you touching them. Ultron runs a team of them in the background: research, outreach, and follow-up while you do other work.' },
  { n: 3, title: 'AI Tool Stacking', desc: 'Connect your tools so the output of one feeds the next. Claude writes it, n8n sends it, your CRM logs it. Zero manual steps.' },
  { n: 4, title: 'AI Content Creation', desc: 'Automate the creation of ads, reels, carousels, and videos for clients instead of making each one by hand.' },
  { n: 5, title: 'Workflow Automation', desc: 'Replace manual tasks with a logic chain you build once and never touch again. Data entry, reporting, and follow-ups all gone.' },
];

export const AISkillsTop1Overlay: React.FC = () => (
  <OverlayRoot>
    <TitleBlock title={<>5 {accent('AI')} SKILLS</>} sub="TO MAKE IT IN THE TOP 1%" size={84} subSize={32} />
    <div style={{ marginTop: 22, width: LABEL_COL + 8 + DESC_COL, display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
      {SKILLS.map((s) => (
        <LabelDescRow
          key={s.n}
          labelCol={LABEL_COL}
          descCol={DESC_COL}
          label={<KickerTitle kicker={`SKILL #${s.n}`} title={s.title} />}
          desc={s.desc}
        />
      ))}
    </div>
  </OverlayRoot>
);
