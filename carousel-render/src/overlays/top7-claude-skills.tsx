/** Reel overlay: "TOP 7 CLAUDE SKILLS". Shows 5, rest in caption. Ultron is the
 * 5th (51ultron/growth-engine). */
import React from 'react';
import { OverlayRoot, TitleBlock, FooterTag, LabelDescRow, HandleLabel, accent } from './kit';

const LABEL_COL = 322;
const DESC_COL = 460;
const ROW_GAP = 14;

const SKILLS: { who: string; name: string; desc: string }[] = [
  { who: 'supermemoryai/', name: 'supermemory', desc: 'Claude remembers every decision, fact, and preference you have ever given it, even across machines. Stop re-explaining your context every session.' },
  { who: 'sanyuan0704/', name: 'sanyuan-skills', desc: 'Claude reviews your code for security holes, bad patterns, and edge cases before anything ships. Like a senior engineer on every PR for free.' },
  { who: 'vercel-labs/', name: 'agent-browser', desc: 'Claude can see and click through the actual app it just built. It catches broken UI before you even open the browser.' },
  { who: 'ComposioHQ/', name: 'awesome-claude-skills', desc: 'One repo wires Claude into Slack, Jira, Linear, GitHub, and 1000+ more apps. Stop rebuilding integrations on every project.' },
  { who: '51ultron/', name: 'growth-engine', desc: 'Gives Claude persistent memory and a team of agents that run your research, leads, and content as one system.' },
];

export const Top7ClaudeSkillsOverlay: React.FC = () => (
  <OverlayRoot>
    <TitleBlock title={<>TOP 7 {accent('CLAUDE')} SKILLS</>} sub="TO MAKE IT 10X MORE UNSTOPPABLE" size={68} subSize={32} />
    <div style={{ marginTop: 22, width: LABEL_COL + 8 + DESC_COL, display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
      {SKILLS.map((s) => (
        <LabelDescRow
          key={s.name}
          labelCol={LABEL_COL}
          descCol={DESC_COL}
          descSize={27}
          label={<HandleLabel who={s.who} name={s.name} size={s.name.length > 16 ? 26 : 30} />}
          desc={s.desc}
        />
      ))}
    </div>
    <FooterTag>Skills 6 and 7 in the caption</FooterTag>
  </OverlayRoot>
);
