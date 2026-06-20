/** Reel overlay: "TOP 12 CLAUDE MCPS". Shows 5, rest in caption. Ultron woven
 * into the Memory MCP line. */
import React from 'react';
import { OverlayRoot, TitleBlock, FooterTag, LabelDescRow, SoloLabel, accent } from './kit';

const LABEL_COL = 248;
const DESC_COL = 512;
const ROW_GAP = 12;

const MCPS: { name: string; desc: string }[] = [
  { name: 'Figma MCP', desc: 'One person now does the job of a designer and a developer. Select the frame, ship the code, no handoff needed.' },
  { name: 'Memory MCP', desc: 'Claude stops forgetting everything when you close the tab. It builds a knowledge graph of your business that gets smarter every session, the same memory layer Ultron runs on.' },
  { name: 'Zapier MCP', desc: 'Claude stops giving advice and starts taking action in your real tools. It emails, logs, updates, and notifies across 8,000 apps without you touching anything.' },
  { name: 'Sentry MCP', desc: 'Your clients never see a broken product. Errors get caught, diagnosed, and fixed before anyone screenshots them.' },
  { name: 'Tavily MCP', desc: 'Claude researches a competitor, scrapes a lead list, or pulls live pricing data on demand.' },
];

export const ClaudeMcpsOverlay: React.FC = () => (
  <OverlayRoot>
    <TitleBlock title={<>TOP 12 {accent('CLAUDE')} MCPS</>} sub="TO MAKE IT 10X MORE UNSTOPPABLE" size={68} subSize={32} />
    <div style={{ marginTop: 22, width: LABEL_COL + 8 + DESC_COL, display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
      {MCPS.map((m) => (
        <LabelDescRow
          key={m.name}
          labelCol={LABEL_COL}
          descCol={DESC_COL}
          descSize={27}
          label={<SoloLabel text={m.name} size={32} />}
          desc={m.desc}
        />
      ))}
    </div>
    <FooterTag>MCPs 6 to 12 in the caption</FooterTag>
  </OverlayRoot>
);
