/** Deck: "I run a 500K/year solo consulting business at 23 — the 9-tool stack" — CTW brand. 12 slides.
 *  Clean tool listicle for a short: brand mark, price pill, benefit panel per tool.
 *  Solid backgrounds, everything inside the safe band. No currency symbols (brand rule). */
import React from 'react';
import { AHFrame, Disp, Mono, CTAPill, ah, AH_ORANGE } from '../ah-blocks';
import { IconBadge, LogoBadge } from '../deck-icons';
import { carouselTheme as T } from '../theme';
import { SiClaude, SiNotion, SiCalendly, SiObsstudio } from '@icons-pack/react-simple-icons';
import { MessageCircle, Clapperboard, Video, Link2, CreditCard, ArrowRight, Users, Zap } from 'lucide-react';

const CI = '#161412';
const DISP = T.displayFont;
type AnyIcon = React.ComponentType<{ size?: number; color?: string }>;

const Kick: React.FC<{ label: string }> = ({ label }) => <Mono size={23} color={AH_ORANGE}>{label}</Mono>;

const PricePill: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', border: `2px solid ${AH_ORANGE}`, background: 'rgba(232,84,43,0.12)', borderRadius: 999, padding: '10px 24px', flex: '0 0 auto' }}>
    <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 34, color: AH_ORANGE, lineHeight: 1 }}>{text}</span>
  </div>
);

/** One tool slide. */
const ToolSlide: React.FC<{ n: number; badge: React.ReactNode; name: string; price: string; body: React.ReactNode; benefit: React.ReactNode; dark: boolean }> = ({ n, badge, name, price, body, benefit, dark }) => {
  const sub = dark ? '#cfcabf' : '#3a3733';
  return (
    <AHFrame variant={dark ? 'dark' : 'cream'} justify="center">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {badge}
          <Mono size={22} color={dark ? 'rgba(243,239,230,0.5)' : 'rgba(20,16,12,0.45)'}>{`TOOL ${String(n).padStart(2, '0')} / 09`}</Mono>
        </div>
        <PricePill text={price} />
      </div>
      <Disp size={128} style={ah.o}>{name}</Disp>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 33, color: sub, lineHeight: 1.4 }}>{body}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: dark ? 'rgba(232,84,43,0.12)' : '#f4ddd2', border: `2px solid ${AH_ORANGE}`, borderRadius: 16, padding: '24px 28px' }}>
        <IconBadge Icon={Zap} dark={dark} box={62} solid />
        <div style={{ fontFamily: T.bodyFont, fontWeight: 800, fontSize: 32, lineHeight: 1.26, color: dark ? '#f3efe6' : CI }}>{benefit}</div>
      </div>
    </AHFrame>
  );
};

const O: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ color: AH_ORANGE, fontWeight: 700 }}>{children}</span>;

const slides: React.ReactNode[] = [
  // 1 — cover
  <AHFrame variant="dark" justify="center">
    <div>
      <Kick label="THE SOLO STACK" />
      <Disp size={104} style={{ marginTop: 16 }}>I run a</Disp>
      <Disp size={150} style={ah.o}>500K / yr</Disp>
      <Disp size={104}>solo consulting business <span style={ah.oi}>at 23.</span></Disp>
    </div>
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, alignSelf: 'flex-start', background: '#17140f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 999, padding: '16px 26px' }}>
      <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 30, color: '#f3efe6' }}>here are the 9 tools I use to do it</span>
      <ArrowRight size={28} color={AH_ORANGE} />
    </div>
  </AHFrame>,

  // 2 — intro
  <AHFrame variant="cream" justify="center">
    <div>
      <Kick label="WHY A STACK" />
      <Disp size={86} style={{ marginTop: 14 }}>most creators scale by hiring. I built a <span style={ah.oi}>software stack instead.</span></Disp>
    </div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 33, color: '#3a3733', lineHeight: 1.42 }}>I would need four to five employees to do what these nine tools do for me.</div>
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 16 }}>
      <div style={{ flex: 1, background: 'rgba(232,84,43,0.10)', border: `2px solid ${AH_ORANGE}`, borderRadius: 18, padding: '26px 28px' }}>
        <Mono size={18} color={AH_ORANGE}>THE STACK COSTS</Mono>
        <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 72, color: AH_ORANGE, lineHeight: 1, marginTop: 12 }}>389 / mo</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}><IconBadge Icon={ArrowRight} box={56} /></div>
      <div style={{ flex: 1, background: '#ffffff', border: '1.5px solid rgba(20,16,12,0.12)', borderRadius: 18, padding: '26px 28px', boxShadow: '0 16px 38px rgba(20,16,12,0.08)' }}>
        <Mono size={18} color="rgba(20,16,12,0.45)">REPLACES SALARIES OF</Mono>
        <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 72, color: CI, lineHeight: 1, marginTop: 12 }}>15K / mo</div>
      </div>
    </div>
  </AHFrame>,

  // 3-11 — the nine tools
  <ToolSlide n={1} dark badge={<LogoBadge Icon={SiClaude} color="#D97757" chip="#faf7f0" box={92} />} name="Claude" price="250 / mo"
    body={<>my <O>AI brain.</O> it drafts scripts, analyses content, writes client strategy, and runs every prompt in my workspace.</>}
    benefit={<>like a senior strategist on call 24/7. saves 20+ hours every week.</>} />,
  <ToolSlide n={2} dark={false} badge={<LogoBadge Icon={MessageCircle as AnyIcon} color="#2C66F6" chip="#ffffff" box={92} />} name="ManyChat" price="45 / mo"
    body={<>automates every <O>CTA</O> on Instagram. comment a keyword and the lead magnet gets DM'd instantly for a name and email.</>}
    benefit={<>50+ conversations a day on autopilot. it grows the list while I sleep.</>} />,
  <ToolSlide n={3} dark badge={<LogoBadge Icon={Clapperboard as AnyIcon} color="#5B53FF" chip="#faf7f0" box={92} />} name="Frame.io" price="30 / mo"
    body={<>where I store all my footage and where editors pull from. <O>time-stamped comments,</O> version control, a B-roll library.</>}
    benefit={<>cuts editing turnaround in half. no more shared-folder chaos.</>} />,
  <ToolSlide n={4} dark={false} badge={<LogoBadge Icon={Video as AnyIcon} color="#7C5CFC" chip="#ffffff" box={92} />} name="Tella" price="26 / mo"
    body={<>makes screen recording <O>effortless.</O> YouTube videos, walkthroughs, async coaching, anything taught on camera.</>}
    benefit={<>studio-quality video in one click. ship the same day I record.</>} />,
  <ToolSlide n={5} dark badge={<LogoBadge Icon={SiNotion} color="#101010" chip="#faf7f0" box={92} />} name="Notion" price="14 / mo"
    body={<>hosts every client's brand dashboard. my <O>content pipeline,</O> lead tracker, and every video idea, linked to Frame.io.</>}
    benefit={<>replaces a project manager, a CRM, and an admin assistant.</>} />,
  <ToolSlide n={6} dark={false} badge={<LogoBadge Icon={Link2 as AnyIcon} color="#0EA5E9" chip="#ffffff" box={92} />} name="Taap.it" price="13 / mo"
    body={<>a <O>deep-link</O> generator. it sends followers from Instagram straight into the YouTube app to subscribe and like.</>}
    benefit={<>no more followers getting stuck in the in-app browser.</>} />,
  <ToolSlide n={7} dark badge={<LogoBadge Icon={SiCalendly} color="#006BFF" chip="#faf7f0" box={92} />} name="Calendly" price="11 / mo"
    body={<>books every call, with meeting types for <O>sales, check-ins, networking,</O> and discovery. my team sees who is booked.</>}
    benefit={<>replaces an assistant. every meeting without a single email.</>} />,
  <ToolSlide n={8} dark={false} badge={<LogoBadge Icon={CreditCard as AnyIcon} color="#16A34A" chip="#ffffff" box={92} />} name="Fanbasis" price="2.8% / txn"
    body={<>the payment processor I collect with. <O>lower fees than Stripe,</O> a dedicated rep, and easy payment-split options.</>}
    benefit={<>built for how coaches sell. money lands within 24 hours.</>} />,
  <ToolSlide n={9} dark badge={<LogoBadge Icon={SiObsstudio} color="#302E31" chip="#faf7f0" box={92} />} name="OBS" price="free"
    body={<>my <O>live streaming</O> and call setup. it connects my camera and pro mic so I show up sharp on every call.</>}
    benefit={<>calls feel premium. the best zero-cost line item in my business.</>} />,

  // 12 — CTA
  <AHFrame variant="dark" justify="center">
    <div style={{ textAlign: 'center' }}>
      <Disp size={104}>comment</Disp>
      <Disp size={104} style={ah.oi}>software</Disp>
    </div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 31, color: '#cfcabf', textAlign: 'center', lineHeight: 1.4 }}>and I will send you access to all nine tools and how I set them up.</div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}><CTAPill pre="COMMENT" word="SOFTWARE" /></div>
    <div style={{ textAlign: 'center', marginTop: 28 }}>
      <Mono size={19} color="rgba(243,239,230,0.5)">THE 389 / MO STACK</Mono>
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12, marginTop: 18 }}>
        {[[SiClaude, '#D97757'], [MessageCircle, '#2C66F6'], [Clapperboard, '#5B53FF'], [Video, '#7C5CFC'], [SiNotion, '#101010'], [Link2, '#0EA5E9'], [SiCalendly, '#006BFF'], [CreditCard, '#16A34A'], [SiObsstudio, '#302E31']].map(([Ic, c], i) => (
          <LogoBadge key={i} Icon={Ic as AnyIcon} color={c as string} chip="#faf7f0" box={58} />
        ))}
      </div>
    </div>
  </AHFrame>,
];

export const softwareStackDeck = { id: 'SoftwareStack', title: 'I run a 500K a year solo consulting business at 23, the 9 tool stack', slides };
