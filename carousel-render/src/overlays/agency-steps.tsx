/** Reel overlay: "7 PROVEN STEPS TO BUILD A 10K A MONTH AI AGENCY". Shows 5,
 * rest in caption. Ultron woven into Step #3. No $, no quotes. */
import React from 'react';
import { OverlayRoot, TitleBlock, FooterTag, LabelDescRow, KickerTitle, accent } from './kit';

const LABEL_COL = 300;
const DESC_COL = 474;
const ROW_GAP = 13;

const STEPS: { n: number; title: string; desc: string }[] = [
  { n: 1, title: 'Pick your ICP', desc: 'There are thousands of businesses. Pick one you already know. Familiarity means faster trust, which means faster cash.' },
  { n: 2, title: 'Find Pain Points', desc: 'Search Reddit threads and YouTube comments in your niche. If you see the same complaint three or more times, people will pay to fix it.' },
  { n: 3, title: 'Master One Solution', desc: 'Do not offer everything. Build one automation that saves time, cuts costs, or makes money, and run it on Ultron so it works without you. Nail that before adding anything else.' },
  { n: 4, title: 'Build Your Offer', desc: 'Package it around the outcome, not the tech. No more missed leads sells far faster than AI chatbot integration.' },
  { n: 5, title: 'Set Your Price', desc: 'First few clients: free or discounted for a testimonial and referral. After proof: 1K to 3K one time, or 300 to 1.5K a month on retainer.' },
];

export const AgencyStepsOverlay: React.FC = () => (
  <OverlayRoot>
    <TitleBlock title={<>7 PROVEN {accent('STEPS')}</>} sub="TO BUILD A 10K A MONTH AI AGENCY" size={80} subSize={31} />
    <div style={{ marginTop: 22, width: LABEL_COL + 8 + DESC_COL, display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
      {STEPS.map((s) => (
        <LabelDescRow
          key={s.n}
          labelCol={LABEL_COL}
          descCol={DESC_COL}
          label={<KickerTitle kicker={`STEP #${s.n}`} title={s.title} />}
          desc={s.desc}
        />
      ))}
    </div>
    <FooterTag>Steps 6 and 7 in the caption</FooterTag>
  </OverlayRoot>
);
