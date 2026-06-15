/** Deck: "find local businesses with bad sites, build them one with AI, get paid" — CTW brand. 9 slides. */
import React from 'react';
import { AHFrame, Disp, Mono, CTAPill, ah } from '../ah-blocks';
import { IconBadge } from '../deck-icons';
import { carouselTheme as T } from '../theme';
import { Kick, Callout, CI, DISP, AH_ORANGE, brandBadge } from '../wipf-kit';
import { Search, LayoutTemplate, Send, Banknote, MapPin, Heart, Rocket, X, Check } from 'lucide-react';

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
const Step: React.FC<{ Icon: LucideIcon; label: string }> = ({ Icon, label }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
    <IconBadge Icon={Icon} box={76} />
    <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 23, color: '#2a2724', textAlign: 'center' }}>{label}</span>
  </div>
);
const StepCard: React.FC<{ n: string; children: React.ReactNode; dark?: boolean }> = ({ n, children, dark }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 22, background: dark ? '#17140f' : '#ffffff', border: dark ? '1px solid rgba(255,255,255,0.07)' : '1.5px solid rgba(20,16,12,0.12)', borderRadius: 16, padding: '22px 26px', boxShadow: dark ? 'none' : '0 12px 30px rgba(20,16,12,0.06)' }}>
    <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 48, color: AH_ORANGE, opacity: 0.55, flex: '0 0 auto', width: 50, textAlign: 'center' }}>{n}</span>
    <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 29, color: dark ? '#e7e3da' : '#2a2724', lineHeight: 1.3 }}>{children}</span>
  </div>
);

const slides: React.ReactNode[] = [
  // 1 cover
  <AHFrame variant="dark" justify="center">
    <Kick label="THE VIBE AGENCY" />
    <Disp size={96} style={{ marginTop: 12 }}>I build websites for local businesses <span style={ah.oi}>with AI.</span></Disp>
    <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>{brandBadge('claude', 76)}<IconBadge Icon={MapPin} dark box={76} /><IconBadge Icon={Heart} dark box={76} /></div>
    <div style={{ background: 'rgba(232,84,43,0.12)', border: `2px solid ${AH_ORANGE}`, borderRadius: 14, padding: '18px 24px', alignSelf: 'flex-start' }}>
      <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 28, color: '#f3efe6' }}>one weekend = </span><span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 40, color: AH_ORANGE }}>4,200</span>
    </div>
  </AHFrame>,
  // 2 what this is
  <AHFrame variant="cream" justify="center">
    <Disp size={100}>what <span style={ah.oi}>this is.</span></Disp>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {['you find local businesses with bad websites', 'you build them a new one, free, upfront', 'you send it to them', 'they pay you to keep it'].map((t, i) => (
        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 16 }}><span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 36, color: AH_ORANGE, width: 44 }}>{i + 1}</span><span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 31, color: '#2a2724' }}>{t}</span></div>
      ))}
    </div>
    <div style={{ display: 'flex', gap: 12 }}><Step Icon={Search} label="find" /><Step Icon={LayoutTemplate} label="build" /><Step Icon={Send} label="deliver" /><Step Icon={Banknote} label="get paid" /></div>
  </AHFrame>,
  // 3 why it works
  <AHFrame variant="cream" justify="center">
    <Disp size={100}>why it <span style={ah.oi}>works.</span></Disp>
    <div style={{ display: 'flex', gap: 20 }}>
      <div style={{ flex: 1, background: '#ffffff', border: '1.5px solid rgba(20,16,12,0.12)', borderRadius: 18, padding: '24px 24px', boxShadow: '0 14px 34px rgba(20,16,12,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><X size={26} color="#c0392b" /><Mono size={18} color="#8a857c">OLD WAY</Mono></div>
        <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 27, color: '#54504a', lineHeight: 1.34, marginTop: 14 }}>want a new website? they have to imagine it. they say no.</div>
      </div>
      <div style={{ flex: 1, background: 'rgba(232,84,43,0.10)', border: `2px solid ${AH_ORANGE}`, borderRadius: 18, padding: '24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Check size={26} color="#3a9d6b" /><Mono size={18} color={AH_ORANGE}>NEW WAY</Mono></div>
        <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 27, color: '#2a2724', lineHeight: 1.34, marginTop: 14 }}>you show up with it already built. they just decide to keep it.</div>
      </div>
    </div>
    <Callout>no convincing. no proposals. just results.</Callout>
  </AHFrame>,
  // 4 the stack
  <AHFrame variant="dark" justify="center">
    <Disp size={100}>the <span style={ah.oi}>stack.</span></Disp>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[[brandBadge('claude', 72), 'Claude', 'plans the site and writes all the copy'], [<IconBadge key="m" Icon={MapPin} dark box={72} />, 'Google Maps', 'finds the businesses with bad sites'], [<IconBadge key="h" Icon={Heart} dark box={72} />, 'Lovable', 'builds the whole site from a prompt'], [<IconBadge key="r" Icon={Rocket} dark box={72} />, 'Vercel', 'hosts and ships it, free']].map(([badge, n, d], i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>{badge as React.ReactNode}<div><span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 36, color: AH_ORANGE }}>{n as string}</span><div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 26, color: '#cfcabf' }}>{d as string}</div></div></div>
      ))}
    </div>
  </AHFrame>,
  // 5 step 1 find
  <AHFrame variant="cream" justify="center">
    <Disp size={86}><span style={ah.o}>step 1:</span> find them.</Disp>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 32, color: '#2a2724' }}>roofers, plumbers, dentists, salons. anyone a bad site costs money.</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <StepCard n="1">open Google Maps, search narrow: roofers in one town</StepCard>
      <StepCard n="2">skip the top 3, look at businesses ranked 4 to 20</StepCard>
      <StepCard n="3">collect 35 leads with a site that looks like 2010</StepCard>
    </div>
  </AHFrame>,
  // 6 step 2 build
  <AHFrame variant="cream" justify="center">
    <Disp size={86}><span style={ah.o}>step 2:</span> build it.</Disp>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <StepCard n="1">describe their business to Claude, it writes the copy and structure</StepCard>
      <StepCard n="2">Lovable turns it into a real, responsive site</StepCard>
      <StepCard n="3">drop in their name, logo, services, and real photos</StepCard>
    </div>
    <Callout>free, upfront. you only build once you have picked the lead.</Callout>
  </AHFrame>,
  // 7 step 3 send
  <AHFrame variant="dark" justify="center">
    <Disp size={86}><span style={ah.o}>step 3:</span> send it.</Disp>
    <Callout dark>the rule: never say Claude, Lovable, or AI. owners are tired of AI pitches.</Callout>
    <div style={{ background: '#17140f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '22px 26px' }}>
      <Mono size={16} color={AH_ORANGE}>THE MESSAGE</Mono>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 26, color: '#e7e3da', lineHeight: 1.4, marginTop: 10 }}>hey [name], built you a quick site based on your Google profile. 10 second walkthrough plus a live preview. if you like it, happy to chat.</div>
    </div>
    <Callout dark>follow up twice, then stop. volume plus value is the game.</Callout>
  </AHFrame>,
  // 8 the math
  <AHFrame variant="cream" justify="center">
    <Disp size={100}>the <span style={ah.oi}>math.</span></Disp>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[['build', 'free, a weekend with AI'], ['setup fee', '1,500 to 3,000 to launch'], ['monthly', '100 to 300 a month to host + update'], ['5 clients', 'real recurring income']].map(([k, v]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}><span style={{ fontFamily: T.monoFont, fontWeight: 700, fontSize: 30, color: AH_ORANGE, width: 200, flex: '0 0 auto' }}>{k}</span><span style={{ fontFamily: T.monoFont, fontSize: 29, color: '#3a3733' }}>{v}</span></div>
      ))}
    </div>
    <Callout>find the problem. build the solution. deliver value. get paid every month.</Callout>
  </AHFrame>,
  // 9 CTA
  <AHFrame variant="dark" justify="center">
    <div style={{ textAlign: 'center' }}>
      <Disp size={104}>comment</Disp>
      <Disp size={104} style={ah.oi}>send.</Disp>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}><CTAPill pre="COMMENT" word="SEND" /></div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 30, color: '#cfcabf', textAlign: 'center', marginTop: 22 }}>and I will send you the full roadmap in the DM. save this for later.</div>
  </AHFrame>,
];
export const openclawDeck = { id: 'OpenClaw', title: 'build websites for local businesses with AI, the vibe agency', slides };
