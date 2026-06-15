/** Deck: "I built a 28,967 a month content team for 200 a month" — CTW brand. 8 slides. */
import React from 'react';
import { AHFrame, Disp, Mono, CTAPill, ah } from '../ah-blocks';
import { IconBadge } from '../deck-icons';
import { carouselTheme as T } from '../theme';
import { Kick, Callout, CI, DISP, AH_ORANGE } from '../wipf-kit';
import { BarChart3, CalendarRange, Lightbulb, FileText, Send, ClipboardCheck } from 'lucide-react';

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
type Role = { name: string; role: string; Icon: LucideIcon; bullets: string[]; hands: string };

const ROLES: Role[] = [
  { name: 'Marcus', role: 'Data Analyst', Icon: BarChart3, bullets: ['pulls daily metrics from every platform', 'finds which hooks are winning right now', 'tracks your top competitors content', 'flags posts to kill or to repeat'], hands: 'a weekly brief of what is working.' },
  { name: 'Vance', role: 'Content Strategist', Icon: CalendarRange, bullets: ['reads the weekly brief', 'sets the content mix: reels, carousels, YouTube', 'chooses the winning CTAs', 'builds the weekly strategy'], hands: 'a clear plan for the week.' },
  { name: 'Riley', role: 'Ideator', Icon: Lightbulb, bullets: ['picks up the strategy', 'brainstorms 30+ topic ideas', 'turns trends into content angles', 'locks 7 winning ideas per week'], hands: '7 ideas, ready to script.' },
  { name: 'Owen', role: 'Scripter', Icon: FileText, bullets: ['takes the best ideas', 'writes the full script', 'uses proven hook formats', 'hands over filming-ready scripts'], hands: 'scripts you can shoot today.' },
  { name: 'Hayes', role: 'Publishing Manager', Icon: Send, bullets: ['queues your approved content', 'schedules across every channel', 'monitors that posts went live', 'audits the DM funnels weekly'], hands: 'everything live, on time.' },
  { name: 'Sasha', role: 'Head of Content', Icon: ClipboardCheck, bullets: ['runs the weekly content pipeline', 'oversees every team workflow', 'combines all reporting into one brief', 'makes sure content ships on time'], hands: 'the whole machine, on autopilot.' },
];

const RoleSlide = (r: Role): React.ReactNode => (
  <AHFrame variant="dark" justify="center">
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <IconBadge Icon={r.Icon} dark solid box={120} size={58} />
      <div>
        <Disp size={64}>{r.name} is your</Disp>
        <Disp size={64} style={ah.oi}>{r.role}.</Disp>
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {r.bullets.map((b) => (
        <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 18, background: '#17140f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 26px' }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: AH_ORANGE, flex: '0 0 auto' }} />
          <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 31, color: '#e7e3da', lineHeight: 1.28 }}>{b}</span>
        </div>
      ))}
    </div>
    <Callout dark>hands off: {r.hands}</Callout>
  </AHFrame>
);

const slides: React.ReactNode[] = [
  // cover
  <AHFrame variant="dark" justify="center">
    <div>
      <Kick label="THE 200 A MONTH TEAM" />
      <Disp size={92} style={{ marginTop: 14 }}>I built a <span style={ah.oi}>28,967 a month</span></Disp>
      <Disp size={92}>content team</Disp>
      <Disp size={92}>for <span style={ah.oi}>200 a month.</span></Disp>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 32, color: '#cfcabf', marginTop: 16 }}>meet the team.</div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
      {ROLES.map((r) => (
        <div key={r.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <IconBadge Icon={r.Icon} dark box={84} />
          <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 20, color: '#cfcabf' }}>{r.name}</span>
        </div>
      ))}
    </div>
  </AHFrame>,
  ...ROLES.map(RoleSlide),
  // CTA
  <AHFrame variant="dark" justify="center">
    <div style={{ textAlign: 'center' }}>
      <Disp size={100}>want to build</Disp>
      <Disp size={100} style={ah.oi}>your own?</Disp>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}><CTAPill pre="COMMENT" word="GIFT" /></div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 31, color: '#cfcabf', textAlign: 'center', marginTop: 26, lineHeight: 1.42 }}>comment GIFT and I will send you the full training to build the team yourself.</div>
  </AHFrame>,
];

export const team200Deck = { id: 'Team200', title: 'I built a content team for 200 a month, meet the team', slides };
