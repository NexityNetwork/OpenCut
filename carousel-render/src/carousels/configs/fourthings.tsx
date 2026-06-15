/** Deck: "10k a month takes only 4 things" — CTW brand. 5 slides. */
import React from 'react';
import { AHFrame, Disp, Mono, CTAPill, ah } from '../ah-blocks';
import { IconBadge } from '../deck-icons';
import { carouselTheme as T } from '../theme';
import { Kick, Callout, CI, DISP, AH_ORANGE, brandBadge } from '../wipf-kit';
import { Workflow, Laptop, Brain, Wifi, HeartPulse, Landmark, ShieldCheck, Truck, House, ShoppingBag, UserCheck, MessageCircle, ConciergeBell, Send, Database } from 'lucide-react';

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const Tile: React.FC<{ Icon: LucideIcon; label: string }> = ({ Icon, label }) => (
  <div style={{ flex: 1, background: '#17140f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: '26px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
    <IconBadge Icon={Icon} dark box={84} />
    <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 24, color: '#f3efe6', textAlign: 'center', lineHeight: 1.2 }}>{label}</span>
  </div>
);

const NicheRow: React.FC<{ Icon: LucideIcon; label: string }> = ({ Icon, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
    <IconBadge Icon={Icon} box={48} />
    <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 27, color: '#2a2724' }}>{label}</span>
  </div>
);

const WorkflowMock: React.FC = () => (
  <div style={{ background: '#0e0e10', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 26, boxShadow: '0 26px 60px rgba(0,0,0,0.35)' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      {['example chat', 'AI agent', 'execute'].map((t, i) => (
        <React.Fragment key={t}>
          <div style={{ flex: 1, background: i === 1 ? 'rgba(232,84,43,0.16)' : '#17171a', border: i === 1 ? `1.5px solid ${AH_ORANGE}` : '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '18px 12px', textAlign: 'center', fontFamily: T.monoFont, fontSize: 19, color: i === 1 ? '#f3efe6' : '#cfcabf' }}>{t}</div>
          {i < 2 && <span style={{ color: AH_ORANGE, fontFamily: DISP, fontWeight: 800, fontSize: 28 }}>→</span>}
        </React.Fragment>
      ))}
    </div>
    <div style={{ height: 28, borderLeft: '2px dashed rgba(232,84,43,0.4)', margin: '8px 0 8px 50%' }} />
    <div style={{ display: 'flex', gap: 12 }}>
      {[['gemini', 'model'], ['', 'memory'], ['gmail', 'send']].map(([brand, label], i) => (
        <div key={label} style={{ flex: 1, background: '#17171a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {brand ? brandBadge(brand, 48) : <IconBadge Icon={Database} dark box={48} />}
          <span style={{ fontFamily: T.monoFont, fontSize: 15, color: '#8a857c' }}>{label}</span>
        </div>
      ))}
    </div>
  </div>
);

const slides: React.ReactNode[] = [
  // 1 — cover
  <AHFrame variant="dark" justify="center">
    <div>
      <Disp size={170}>10k <span style={ah.oi}>a month</span></Disp>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 64, color: '#f3efe6', marginTop: 6 }}>takes only 4 things.</div>
    </div>
    <div style={{ display: 'flex', gap: 16 }}>
      <Tile Icon={Workflow} label="a no-code tool" />
      <Tile Icon={Laptop} label="a laptop" />
      <Tile Icon={Brain} label="your brain" />
      <Tile Icon={Wifi} label="an internet connection" />
    </div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 32, color: '#cfcabf' }}>here is exactly how to use them.</div>
  </AHFrame>,

  // 2 — learn automations
  <AHFrame variant="cream" justify="center">
    <div>
      <Kick label="THING 01" />
      <Disp size={92} style={{ marginTop: 12 }}>learn to build <span style={ah.oi}>automations.</span></Disp>
    </div>
    <WorkflowMock />
    <Callout>automating workflows is a game changer for any business, and it is only going to grow. this is the one skill that sets you apart.</Callout>
  </AHFrame>,

  // 3 — pick a niche
  <AHFrame variant="dark" justify="center">
    <div>
      <Kick label="THING 02" />
      <Disp size={92} style={{ marginTop: 12 }}>pick a <span style={ah.oi}>niche.</span></Disp>
    </div>
    <div style={{ display: 'flex', gap: 20 }}>
      <div style={{ flex: 1, background: '#17140f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '26px 26px' }}>
        <Mono size={19} color={AH_ORANGE}>INDUSTRIES</Mono>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
          {[[HeartPulse, 'Healthcare'], [Landmark, 'Financial services'], [ShieldCheck, 'Insurance'], [Truck, 'Logistics'], [House, 'Home services'], [ShoppingBag, 'Retail']].map(([I, l]) => (
            <div key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 14 }}><IconBadge Icon={I as LucideIcon} dark box={46} /><span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 26, color: '#e7e3da' }}>{l as string}</span></div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, background: 'rgba(232,84,43,0.10)', border: `2px solid ${AH_ORANGE}`, borderRadius: 18, padding: '26px 26px' }}>
        <Mono size={19} color={AH_ORANGE}>USE CASES</Mono>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
          {[[UserCheck, 'Lead qualification'], [MessageCircle, 'Customer support'], [ConciergeBell, 'Receptionists'], [Send, 'Dispatch service']].map(([I, l]) => (
            <div key={l as string} style={{ display: 'flex', alignItems: 'center', gap: 14 }}><IconBadge Icon={I as LucideIcon} dark solid box={46} /><span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 26, color: '#f3efe6' }}>{l as string}</span></div>
          ))}
        </div>
      </div>
    </div>
    <Callout dark>some industries move much faster on AI than others. logistics will out-adopt pest control every time.</Callout>
  </AHFrame>,

  // 4 — start selling
  <AHFrame variant="cream" justify="center">
    <div>
      <Kick label="THING 03" />
      <Disp size={92} style={{ marginTop: 12 }}>start <span style={ah.oi}>selling.</span></Disp>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 33, color: '#3a3733', lineHeight: 1.4, marginTop: 16 }}>this is the hardest part. it is a numbers game: the more people you reach, the higher your odds. but relationships matter more.</div>
    </div>
    <div style={{ background: 'rgba(232,84,43,0.10)', border: `2px solid ${AH_ORANGE}`, borderRadius: 18, padding: '30px 32px' }}>
      <Mono size={19} color={AH_ORANGE}>WHY IT IS WORTH IT</Mono>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 54, color: CI, lineHeight: 1.06, marginTop: 14 }}>one client can be worth 5k+ over the long run.</div>
    </div>
  </AHFrame>,

  // 5 — CTA
  <AHFrame variant="dark" justify="center">
    <div style={{ textAlign: 'center' }}>
      <Disp size={92}>I made the full</Disp>
      <Disp size={92} style={ah.oi}>playbook.</Disp>
    </div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 30, color: '#cfcabf', textAlign: 'center', lineHeight: 1.4 }}>how to pick a niche, close a deal with a contract, and get your first client.</div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}><CTAPill pre="COMMENT" word="YES" /></div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 28, color: '#cfcabf', textAlign: 'center' }}>comment YES and I will send you the community link.</div>
  </AHFrame>,
];

export const fourthingsDeck = { id: 'FourThings', title: '10k a month takes only 4 things', slides };
