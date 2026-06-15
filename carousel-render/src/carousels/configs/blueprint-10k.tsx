/** Deck: "0 to 10K a month in 2026, the blueprint" — rebuilt in the CTW brand. 8 slides.
 *  Clean editorial frames for a short: solid backgrounds, real brand marks, clear
 *  lucide iconography, a step indicator and a data bar. No background gradients or
 *  watermarks. Everything readable stays inside the safe band. */
import React from 'react';
import { AHFrame, Disp, Script, Mono, CTAPill, ah, AH_ORANGE } from '../ah-blocks';
import { IconBadge, LogoBadge } from '../deck-icons';
import { carouselTheme as T } from '../theme';
import { SiClaude, SiZapier, SiN8n } from '@icons-pack/react-simple-icons';
import { Compass, Wrench, Workflow, Megaphone, Building2, User, Puzzle, ArrowRight, Sparkles, Lock, Rocket, Hourglass, Globe, Clapperboard, Flame, TrendingUp } from 'lucide-react';

const CI = '#161412';
const DISP = T.displayFont;
type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

/* ── brand marks not in the icon pack (drawn to match their real logos) ─────*/
const LovableMark: React.FC<{ size?: number; color?: string }> = ({ size = 44, color = '#F2542D' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);
const BoltMark: React.FC<{ size?: number; color?: string }> = ({ size = 44, color = '#1389FD' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
    <polygon points="13,1.5 3.5,13.6 11,13.6 9.6,22.5 20.5,9.6 13,9.6" />
  </svg>
);

/* ── small parts ───────────────────────────────────────────────────────────*/
const Dots: React.FC<{ active: number; dark: boolean }> = ({ active, dark }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    {[1, 2, 3, 4].map((i) => (
      <span key={i} style={{ width: i === active ? 30 : 11, height: 11, borderRadius: 6, background: i === active ? AH_ORANGE : dark ? 'rgba(255,255,255,0.2)' : 'rgba(20,16,12,0.18)' }} />
    ))}
  </div>
);

const Callout: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <div style={{ background: dark ? 'rgba(232,84,43,0.13)' : '#f4ddd2', borderRadius: 14, padding: '24px 28px', fontFamily: T.bodyFont, fontWeight: 700, fontSize: 31, lineHeight: 1.34, color: dark ? '#f3efe6' : CI }}>{children}</div>
);

const Kick: React.FC<{ step?: string; label: string }> = ({ step, label }) => (
  <Mono size={23} color={AH_ORANGE}>{step ? `${step} · ${label}` : label}</Mono>
);

/** Section header: kicker (+ optional step dots) + big two-tone title. */
const Head: React.FC<{ step?: string; kick: string; lead: string; tail: string; sub?: string; dark: boolean; dot?: number }> = ({ step, kick, lead, tail, sub, dark, dot }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <Kick step={step} label={kick} />
      {dot && <Dots active={dot} dark={dark} />}
    </div>
    <Disp size={94} style={{ marginTop: 14 }}>{lead} <span style={ah.oi}>{tail}</span></Disp>
    {sub && <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 34, color: dark ? '#cfcabf' : '#3a3733', lineHeight: 1.32, marginTop: 18 }}>{sub}</div>}
  </div>
);

/** Cover "table of contents" row. */
const TocRow: React.FC<{ n: string; Icon: LucideIcon; label: string }> = ({ n, Icon, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 24, background: '#17140f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px 24px' }}>
    <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 38, color: AH_ORANGE, opacity: 0.6, width: 52, flex: '0 0 auto' }}>{n}</span>
    <IconBadge Icon={Icon} dark box={66} />
    <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 46, letterSpacing: '-0.02em', color: '#f3efe6' }}>{label}</span>
  </div>
);

/** One "before / after" column (slide 2) with a header icon. */
const Col: React.FC<{ label: string; Icon: LucideIcon; items: [string, string][]; accent?: boolean; dark: boolean }> = ({ label, Icon, items, accent, dark }) => {
  const ink = dark ? '#f3efe6' : CI; const sub = dark ? '#cfcabf' : '#54504a';
  return (
    <div style={{ flex: 1, background: accent ? 'rgba(232,84,43,0.10)' : dark ? '#17140f' : '#ffffff', border: accent ? `2px solid ${AH_ORANGE}` : dark ? '1px solid rgba(255,255,255,0.07)' : '1.5px solid rgba(20,16,12,0.12)', borderRadius: 18, padding: '28px 28px', boxShadow: dark || accent ? 'none' : '0 16px 38px rgba(20,16,12,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <IconBadge Icon={Icon} box={54} solid={accent} />
        <Mono size={20} color={accent ? AH_ORANGE : dark ? 'rgba(243,239,230,0.45)' : 'rgba(20,16,12,0.42)'}>{label}</Mono>
      </div>
      <div style={{ height: 1, background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', margin: '22px 0' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
        {items.map(([head, note]) => (
          <div key={head}>
            <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 40, letterSpacing: '-0.02em', lineHeight: 1.05, color: accent ? AH_ORANGE : ink }}>{head}</div>
            <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 25, lineHeight: 1.28, color: sub, marginTop: 8 }}>{note}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/** A "tool: what it does" row (slides 5, 6) — badge is a real brand mark. */
const ToolRow: React.FC<{ badge: React.ReactNode; name: string; desc: string; dark: boolean }> = ({ badge, name, desc, dark }) => {
  const sub = dark ? '#cfcabf' : '#3a3733';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 26, background: dark ? '#17140f' : '#ffffff', border: dark ? '1px solid rgba(255,255,255,0.07)' : '1.5px solid rgba(20,16,12,0.12)', borderRadius: 18, padding: '24px 30px', boxShadow: dark ? 'none' : '0 14px 34px rgba(20,16,12,0.07)' }}>
      {badge}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 44, letterSpacing: '-0.02em', color: AH_ORANGE, lineHeight: 1 }}>{name}</div>
        <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 30, lineHeight: 1.3, color: sub, marginTop: 10 }}>{desc}</div>
      </div>
    </div>
  );
};

/** A niche "pick one" pillar (slide 4). */
const Pillar: React.FC<{ Icon: LucideIcon; word: string; sub: string; eg: string }> = ({ Icon, word, sub, eg }) => (
  <div style={{ flex: 1, background: '#ffffff', border: '1.5px solid rgba(20,16,12,0.12)', borderRadius: 18, padding: '36px 26px', boxShadow: '0 16px 38px rgba(20,16,12,0.08)', display: 'flex', flexDirection: 'column', gap: 20 }}>
    <IconBadge Icon={Icon} box={82} />
    <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 40, letterSpacing: '-0.02em', color: CI, lineHeight: 1.02 }}>{word}</div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 26, lineHeight: 1.32, color: '#54504a' }}>{sub}</div>
    <div style={{ marginTop: 'auto', paddingTop: 8 }}>
      <span style={{ display: 'inline-block', fontFamily: T.monoFont, fontWeight: 600, fontSize: 21, color: '#a8472f', background: 'rgba(232,84,43,0.10)', borderRadius: 8, padding: '8px 14px', lineHeight: 1.25 }}>{eg}</span>
    </div>
  </div>
);

/** Distribution principle card (slide 7) with a lucide icon. */
const PrinCard: React.FC<{ n: string; Icon: LucideIcon; lead: string; tail: string; sub: string }> = ({ n, Icon, lead, tail, sub }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 24, background: '#17140f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '22px 28px' }}>
    <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 56, color: AH_ORANGE, opacity: 0.5, flex: '0 0 auto', lineHeight: 1, width: 56, textAlign: 'center' }}>{n}</span>
    <IconBadge Icon={Icon} dark box={68} />
    <div style={{ flex: 1 }}>
      <Disp size={52}>{lead} <span style={ah.oi}>{tail}</span></Disp>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 25, color: '#cfcabf', lineHeight: 1.28, marginTop: 6 }}>{sub}</div>
    </div>
  </div>
);

/** Small labelled panel used in the 77% comparison (slide 3). */
const MiniPanel: React.FC<{ Icon: LucideIcon; label: string; big: string; accent?: boolean }> = ({ Icon, label, big, accent }) => (
  <div style={{ flex: 1, background: accent ? 'rgba(232,84,43,0.12)' : '#17140f', border: accent ? `2px solid ${AH_ORANGE}` : '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '24px 26px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <IconBadge Icon={Icon} dark box={48} solid={accent} />
      <Mono size={18} color={accent ? AH_ORANGE : 'rgba(243,239,230,0.45)'}>{label}</Mono>
    </div>
    <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 52, color: accent ? AH_ORANGE : '#cfcabf', lineHeight: 1.04, marginTop: 16 }}>{big}</div>
  </div>
);

const slides: React.ReactNode[] = [
  // 1 — cover (contents)
  <AHFrame variant="dark" justify="center">
    <div>
      <Kick label="THE 2026 BLUEPRINT" />
      <Disp size={150} style={{ marginTop: 18 }}>0 to <span style={ah.oi}>10K</span></Disp>
      <Disp size={150}>a month.</Disp>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 14 }}>
      <TocRow n="01" Icon={Compass} label="pick the niche" />
      <TocRow n="02" Icon={Wrench} label="build the thing" />
      <TocRow n="03" Icon={Workflow} label="automate it" />
      <TocRow n="04" Icon={Megaphone} label="distribute" />
    </div>
    <Script size={46} color="#cfcabf">if I started over with nothing, this is the exact path.</Script>
  </AHFrame>,

  // 2 — the wall is gone (before / after)
  <AHFrame variant="cream" justify="center">
    <Head dark={false} kick="WHY NOW" lead="the wall is" tail="gone." sub="the barrier to building a real business moved." />
    <div style={{ display: 'flex', gap: 22 }}>
      <Col dark={false} Icon={Lock} label="USED TO NEED" items={[
        ['years of coding', 'learn to build before you could earn'],
        ['a full dev team', 'payroll long before any revenue'],
        ['50K of runway', 'raise the money or never start'],
      ]} />
      <Col dark={false} accent Icon={Rocket} label="IN 2026 YOU NEED" items={[
        ['a clear niche', 'one buyer, one painful problem'],
        ['the right tools', 'ship the whole thing solo'],
        ['four to six weeks', 'live and selling this quarter'],
      ]} />
    </div>
    <Callout>the barrier shifted. it is not technical anymore.</Callout>
  </AHFrame>,

  // 3 — 77% stat (with data bar)
  <AHFrame variant="dark" justify="center">
    <div>
      <Kick label="WHY NOW" />
      <Disp size={224} style={{ ...ah.o, marginTop: 6 }}>77%</Disp>
      <div style={{ height: 26, borderRadius: 13, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', overflow: 'hidden', marginTop: 6 }}>
        <div style={{ width: '77%', height: '100%', background: AH_ORANGE, borderRadius: 13 }} />
      </div>
      <Disp size={66} style={{ marginTop: 22 }}>of solo AI founders hit profit in year one.</Disp>
    </div>
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 18 }}>
      <MiniPanel Icon={Hourglass} label="THE OLD TIMELINE" big="two to three years" />
      <div style={{ display: 'flex', alignItems: 'center' }}><IconBadge Icon={ArrowRight} dark box={62} /></div>
      <MiniPanel Icon={Rocket} accent label="NOW" big="year one" />
    </div>
    <Callout dark>the math changed. the tools changed. most people just have not updated their assumptions.</Callout>
  </AHFrame>,

  // 4 — the niche
  <AHFrame variant="cream" justify="center">
    <Head dark={false} step="STEP 01" kick="PICK THE NICHE" lead="the" tail="niche." sub="the narrower it feels, the faster the paying customers show up." dot={1} />
    <div style={{ display: 'flex', gap: 20 }}>
      <Pillar Icon={Building2} word="one industry" sub="not everyone. one room you already know." eg="e.g. dental clinics" />
      <Pillar Icon={User} word="one person" sub="a single buyer you can picture by name." eg="e.g. the clinic owner" />
      <Pillar Icon={Puzzle} word="one problem" sub="the one they already pay to make go away." eg="e.g. no show bookings" />
    </div>
    <Callout>niche down harder than feels comfortable.</Callout>
  </AHFrame>,

  // 5 — the build
  <AHFrame variant="dark" justify="center">
    <Head dark step="STEP 02" kick="BUILD THE THING" lead="the" tail="build." dot={2} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <ToolRow dark badge={<LogoBadge Icon={LovableMark} color="#F2542D" chip="#faf7f0" box={88} />} name="Lovable" desc="describe the app in plain words, it ships real deployed code." />
      <ToolRow dark badge={<LogoBadge Icon={BoltMark} color="#1389FD" chip="#faf7f0" box={88} />} name="Bolt" desc="see the code and iterate on it in plain English." />
      <ToolRow dark badge={<LogoBadge Icon={SiClaude} color="#D97757" chip="#faf7f0" box={88} />} name="Claude" desc="think through the product and write all the copy." />
    </div>
    <Callout dark>no dev. no agency. no waiting. ship the weekend you decide to start.</Callout>
  </AHFrame>,

  // 6 — the workflow
  <AHFrame variant="cream" justify="center">
    <Head dark={false} step="STEP 03" kick="AUTOMATE IT" lead="the" tail="workflow." dot={3} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <ToolRow dark={false} badge={<LogoBadge Icon={SiZapier} color="#FF4F00" chip="#ffffff" box={88} />} name="Zapier" desc="wire the tools you already use, no glue code." />
      <ToolRow dark={false} badge={<LogoBadge Icon={SiN8n} color="#EA4B71" chip="#ffffff" box={88} />} name="n8n" desc="open source, self hosted, zero monthly fees." />
    </div>
    <div style={{ background: 'rgba(232,84,43,0.10)', border: `2px solid ${AH_ORANGE}`, borderRadius: 18, padding: '30px 32px' }}>
      <Mono size={19} color={AH_ORANGE}>THE RESULT</Mono>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 50, letterSpacing: '-0.02em', color: CI, lineHeight: 1.08, marginTop: 14 }}>set it up once. it runs while you sleep.</div>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 30, color: '#3a3733', lineHeight: 1.34, marginTop: 14 }}>one person, doing the output of a whole team.</div>
    </div>
  </AHFrame>,

  // 7 — and distribution
  <AHFrame variant="dark" justify="center">
    <Head dark step="STEP 04" kick="DISTRIBUTE" lead="and" tail="distribution." dot={4} />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PrinCard n="01" Icon={Globe} lead="build in" tail="public." sub="share the messy middle, not just the wins." />
      <PrinCard n="02" Icon={Clapperboard} lead="post the" tail="process." sub="every build is a piece of content." />
      <PrinCard n="03" Icon={Flame} lead="be a little" tail="cringe." sub="the ones too scared to post stay invisible." />
    </div>
    <Callout dark>let the audience pull the customers in.</Callout>
  </AHFrame>,

  // 8 — CTA (with the stack)
  <AHFrame variant="dark" justify="center">
    <div style={{ display: 'flex', justifyContent: 'center' }}><IconBadge Icon={Sparkles} solid box={132} size={66} /></div>
    <div style={{ textAlign: 'center' }}>
      <Disp size={102}>want the full</Disp>
      <Disp size={102} style={ah.oi}>blueprint?</Disp>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 26 }}><CTAPill pre="COMMENT" word="BLUEPRINT" /></div>
    <div style={{ textAlign: 'center', marginTop: 30 }}>
      <Mono size={19} color="rgba(243,239,230,0.5)">THE NO CODE STACK</Mono>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 18 }}>
        <LogoBadge Icon={SiClaude} color="#D97757" chip="#faf7f0" box={66} />
        <LogoBadge Icon={LovableMark} color="#F2542D" chip="#faf7f0" box={66} />
        <LogoBadge Icon={BoltMark} color="#1389FD" chip="#faf7f0" box={66} />
        <LogoBadge Icon={SiZapier} color="#FF4F00" chip="#faf7f0" box={66} />
        <LogoBadge Icon={SiN8n} color="#EA4B71" chip="#faf7f0" box={66} />
      </div>
    </div>
  </AHFrame>,
];

export const blueprint10kDeck = { id: 'Blueprint10k', title: '0 to 10K a month in 2026, the blueprint', slides };
