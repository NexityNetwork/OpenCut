/** Deck: "Ship an AI agent in 10 minutes" — CTW brand. 9 slides. */
import React from 'react';
import { AHFrame, Disp, Script, Mono, CTAPill, ah, AH_ORANGE } from '../ah-blocks';
import { IconBadge, LogoBadge } from '../deck-icons';
import { carouselTheme as T } from '../theme';
import { SiN8n, SiZapier, SiMake } from '@icons-pack/react-simple-icons';
import { Brain, Cable, Zap, FlaskConical, FileText, Users, AlertTriangle, Check, ArrowRight } from 'lucide-react';

const CI = '#161412';
const DISP = T.displayFont;
type AnyIcon = React.ComponentType<{ size?: number; color?: string }>;

const Kick: React.FC<{ label: string }> = ({ label }) => <Mono size={23} color={AH_ORANGE}>{label}</Mono>;
const Callout: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <div style={{ background: dark ? 'rgba(232,84,43,0.13)' : '#f4ddd2', borderRadius: 14, padding: '24px 28px', fontFamily: T.bodyFont, fontWeight: 700, fontSize: 31, lineHeight: 1.34, color: dark ? '#f3efe6' : CI }}>{children}</div>
);
const Head: React.FC<{ kick: string; lead: string; tail: string; sub?: string; dark: boolean }> = ({ kick, lead, tail, sub, dark }) => (
  <div>
    <Kick label={kick} />
    <Disp size={90} style={{ marginTop: 14 }}>{lead} <span style={ah.oi}>{tail}</span></Disp>
    {sub && <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 33, color: dark ? '#cfcabf' : '#3a3733', lineHeight: 1.4, marginTop: 18 }}>{sub}</div>}
  </div>
);
const LetterBadge: React.FC<{ ch: string }> = ({ ch }) => (
  <div style={{ width: 84, height: 84, flex: '0 0 auto', borderRadius: 18, background: 'rgba(232,84,43,0.14)', border: `2px solid ${AH_ORANGE}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 44, color: AH_ORANGE }}>{ch}</span>
  </div>
);

/* clock for the cover */
const ClockGraphic: React.FC = () => (
  <div style={{ position: 'relative', width: 760, height: 560, margin: '0 auto' }}>
    <svg width="320" height="320" viewBox="0 0 200 200" style={{ position: 'absolute', left: 220, top: 120 }}>
      <circle cx="100" cy="100" r="94" fill="#17140f" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * Math.PI) / 6; const x1 = 100 + 80 * Math.sin(a), y1 = 100 - 80 * Math.cos(a), x2 = 100 + 88 * Math.sin(a), y2 = 100 - 88 * Math.cos(a);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(243,239,230,0.4)" strokeWidth="3" />;
      })}
      <line x1="100" y1="100" x2="100" y2="46" stroke="#f3efe6" strokeWidth="6" strokeLinecap="round" />
      <line x1="100" y1="100" x2="138" y2="118" stroke={AH_ORANGE} strokeWidth="6" strokeLinecap="round" />
      <circle cx="100" cy="100" r="8" fill={AH_ORANGE} />
    </svg>
    <div style={{ position: 'absolute', left: 300, top: 20 }}><LogoBadge Icon={SiN8n} color="#EA4B71" chip="#faf7f0" box={92} /></div>
    <div style={{ position: 'absolute', left: 560, top: 250 }}><LogoBadge Icon={SiMake} color="#6D00CC" chip="#faf7f0" box={92} /></div>
    <div style={{ position: 'absolute', left: 300, top: 470 }}><LogoBadge Icon={SiZapier} color="#FF4F00" chip="#faf7f0" box={92} /></div>
    <div style={{ position: 'absolute', left: 40, top: 250, width: 92, height: 92, borderRadius: 24, background: '#faf7f0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 32px rgba(0,0,0,0.22)' }}>
      <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 46, color: '#111' }}>G</span>
    </div>
  </div>
);

/* descending "pain" line */
const PainChart: React.FC = () => (
  <div style={{ position: 'relative', width: 810, height: 360 }}>
    <svg width="810" height="360" viewBox="0 0 810 360">
      <polyline points="40,70 250,120 470,200 620,180 770,300" fill="none" stroke="rgba(243,239,230,0.5)" strokeWidth="3" />
      {[[40, 70], [250, 120], [470, 200], [620, 180], [770, 300]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="8" fill="none" stroke="#f3efe6" strokeWidth="3" />)}
    </svg>
    {[['watched the tutorials', 60, 10], ['saved 30 reels', 200, 130], ['opened n8n, closed it', 410, 215], ['still nothing shipped', 520, 60], ['they teach the wrong part', 600, 300]].map(([t, x, y], i) => (
      <div key={i} style={{ position: 'absolute', left: x as number, top: y as number, fontFamily: T.bodyFont, fontWeight: 600, fontSize: 22, color: '#cfcabf', maxWidth: 220 }}>{t as string}</div>
    ))}
  </div>
);

/* radar skills map */
const Radar: React.FC = () => {
  const cx = 200, cy = 200, R = 150; const pts = [1, 0.7, 0.55, 0.85, 0.6, 0.45];
  const ring = (r: number) => Array.from({ length: 6 }).map((_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 3; return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`; }).join(' ');
  const poly = pts.map((p, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 3; return `${cx + R * p * Math.cos(a)},${cy + R * p * Math.sin(a)}`; }).join(' ');
  return (
    <svg width="400" height="400" viewBox="0 0 400 400" style={{ display: 'block', margin: '0 auto' }}>
      {[0.4, 0.7, 1].map((r) => <polygon key={r} points={ring(R * r)} fill="none" stroke="rgba(20,16,12,0.14)" strokeWidth="1.5" />)}
      <polygon points={poly} fill="rgba(232,84,43,0.28)" stroke={AH_ORANGE} strokeWidth="3" />
      {pts.map((p, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 3; return <circle key={i} cx={cx + R * p * Math.cos(a)} cy={cy + R * p * Math.sin(a)} r="6" fill={AH_ORANGE} />; })}
    </svg>
  );
};

const RiteeRow: React.FC<{ ch: string; name: string; desc: string }> = ({ ch, name, desc }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 22, background: '#17140f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '18px 24px' }}>
    <LetterBadge ch={ch} />
    <div>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 36, color: '#f3efe6', lineHeight: 1 }}>{name}</div>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 25, color: '#cfcabf', marginTop: 4 }}>{desc}</div>
    </div>
  </div>
);

const StepCard: React.FC<{ n: string; children: React.ReactNode }> = ({ n, children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 24, background: '#ffffff', border: '1.5px solid rgba(20,16,12,0.12)', borderRadius: 18, padding: '24px 28px', boxShadow: '0 14px 34px rgba(20,16,12,0.07)' }}>
    <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 56, color: AH_ORANGE, opacity: 0.55, flex: '0 0 auto', width: 56, textAlign: 'center' }}>{n}</span>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 31, color: '#2a2724', lineHeight: 1.3 }}>{children}</div>
  </div>
);

const BuildRow: React.FC<{ Icon: AnyIcon; name: string; desc: string }> = ({ Icon, name, desc }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 24, background: '#17140f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 26px' }}>
    <IconBadge Icon={Icon as any} dark box={72} />
    <div><span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 38, color: AH_ORANGE }}>{name}</span>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 27, color: '#cfcabf', marginTop: 4 }}>{desc}</div></div>
  </div>
);

const slides: React.ReactNode[] = [
  // 1 — cover
  <AHFrame variant="dark" justify="center">
    <div>
      <Kick label="THE 10 MINUTE BUILD" />
      <Disp size={96} style={{ marginTop: 14 }}>ship an AI agent in <span style={ah.oi}>10 minutes.</span></Disp>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 32, color: '#cfcabf', marginTop: 16 }}>no code. just a five line brief.</div>
    </div>
    <ClockGraphic />
  </AHFrame>,

  // 2 — the pain
  <AHFrame variant="dark" justify="center">
    <Head dark kick="THE PAIN" lead="it is not a you problem. it is a" tail="teaching problem." sub="everyone shows the tool. no one shows the brief." />
    <PainChart />
  </AHFrame>,

  // 3 — the reframe
  <AHFrame variant="cream" justify="center">
    <Head dark={false} kick="THE REFRAME" lead="they are not better engineers. they are better" tail="operators." sub="they write briefs so clear a stranger could do the job." />
    <Radar />
    <div style={{ textAlign: 'center', fontFamily: T.monoFont, fontWeight: 600, fontSize: 22, letterSpacing: '0.06em', color: '#8a857c' }}>skills map</div>
  </AHFrame>,

  // 4 — delegate
  <AHFrame variant="cream" justify="center">
    <Head dark={false} kick="I REALIZED THIS LATE" lead="if you can delegate to a human, you can delegate to" tail="AI." />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {['that handover doc before you go on leave', 'that 2am brief for a freelancer', 'that training plan for a new hire'].map((t) => (
        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#ffffff', border: '1.5px solid rgba(20,16,12,0.12)', borderRadius: 14, padding: '18px 24px', boxShadow: '0 12px 30px rgba(20,16,12,0.06)' }}>
          <ArrowRight size={26} color={AH_ORANGE} /><span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 30, color: '#2a2724' }}>{t}</span>
        </div>
      ))}
    </div>
    <Callout>that is 80% of the work. the tool is the last 10%. same skill, different worker.</Callout>
  </AHFrame>,

  // 5 — RITEE
  <AHFrame variant="dark" justify="center">
    <Head dark kick="THE FRAMEWORK" lead="every working agent has the same 5 parts:" tail="RITEE." />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <RiteeRow ch="R" name="Role" desc="the job in one sentence" />
      <RiteeRow ch="I" name="Inputs" desc="what comes in, and from where" />
      <RiteeRow ch="T" name="The work" desc="numbered steps, no guessing" />
      <RiteeRow ch="E" name="Edge cases" desc="what to skip, what breaks it" />
      <RiteeRow ch="E" name="Escalation" desc="exactly when to stop and ask you" />
    </div>
    <Callout dark>miss one, it breaks. nail all five, it ships.</Callout>
  </AHFrame>,

  // 6 — why it fails
  <AHFrame variant="cream" justify="center">
    <Head dark={false} kick="WHY IT FAILS" lead="most agent failures are not AI failures. they are" tail="brief failures." />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[['vague role', 'vague output'], ['no edge cases', 'wrong assumptions'], ['no escalation', 'silent failures']].map(([a, b]) => (
        <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 18, background: '#ffffff', border: '1.5px solid rgba(20,16,12,0.12)', borderRadius: 14, padding: '20px 26px', boxShadow: '0 12px 30px rgba(20,16,12,0.06)' }}>
          <AlertTriangle size={30} color={AH_ORANGE} style={{ flex: '0 0 auto' }} />
          <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 34, color: CI }}>{a} <span style={{ color: '#b3aea4' }}>=</span> <span style={ah.o}>{b}</span></div>
        </div>
      ))}
    </div>
    <Callout>fix the brief. fix the agent. every time.</Callout>
  </AHFrame>,

  // 7 — brief steps
  <AHFrame variant="cream" justify="center">
    <Head dark={false} kick="START HERE" lead="do not open n8n yet. open a" tail="doc." />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <StepCard n="01">pick the one task you explain three times a week.</StepCard>
      <StepCard n="02">write the RITEE brief for it, top to bottom.</StepCard>
      <StepCard n="03">hand it to a smart friend who does not do your job. if they get it, your agent will too.</StepCard>
    </div>
  </AHFrame>,

  // 8 — build it
  <AHFrame variant="dark" justify="center">
    <Head dark kick="ONCE THE BRIEF IS SOLID" lead="wire it up in" tail="four moves." />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <BuildRow Icon={Brain} name="Brain" desc="paste the brief into Claude instructions" />
      <BuildRow Icon={Cable} name="Hands" desc="connect Gmail, Sheets, Drive. built in, no code" />
      <BuildRow Icon={Zap} name="Trigger" desc="a chat, a schedule, or an inbox watch" />
      <BuildRow Icon={FlaskConical} name="Test" desc="run 3 real cases. fix the brief, not the tool" />
    </div>
  </AHFrame>,

  // 9 — CTA
  <AHFrame variant="dark" justify="center">
    <div style={{ textAlign: 'center' }}>
      <Disp size={92}>I wrote down everything</Disp>
      <Disp size={92} style={ah.oi}>that finally worked.</Disp>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {['the RITEE framework I actually use', 'the exact brief from a real production agent', 'the 10 minute setup, no fluff', 'the 5 mistakes that made me quit twice'].map((t) => (
        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Check size={26} color={AH_ORANGE} style={{ flex: '0 0 auto' }} /><span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 29, color: '#e7e3da' }}>{t}</span>
        </div>
      ))}
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}><CTAPill pre="COMMENT" word="AGENT" /></div>
  </AHFrame>,
];

export const agent10minDeck = { id: 'Agent10min', title: 'Ship an AI agent in 10 minutes, the brief is the build', slides };
