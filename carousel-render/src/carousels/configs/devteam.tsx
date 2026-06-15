/** Deck: "6 apps you need to build SaaS in 2026" — CTW brand. 8 slides. */
import React from 'react';
import { AHFrame, Disp, ah } from '../ah-blocks';
import { carouselTheme as T } from '../theme';
import { Kick, Callout, DISP, AH_ORANGE, brandBadge } from '../wipf-kit';

type App = { n: string; brand: string; name: string; desc: React.ReactNode; use: string };
const O: React.FC<{ children: React.ReactNode }> = ({ children }) => <span style={{ color: AH_ORANGE, fontWeight: 700 }}>{children}</span>;
const APPS: App[] = [
  { n: '1', brand: 'claude', name: 'Claude', use: 'the brain behind everything', desc: <>from writing the <O>PRD</O> to planning the <O>architecture</O> to shipping the actual code, Claude handles the whole build.</> },
  { n: '2', brand: 'antigravity', name: 'Antigravity', use: 'a second pair of hands', desc: <>Google AI inside an IDE. strong on <O>design-heavy</O> work and a great second model when you want another angle.</> },
  { n: '3', brand: 'conductor', name: 'Conductor', use: 'run a team of agents', desc: <>a Mac app that runs a team of <O>Claude Code agents</O> at once. each works in its own isolated copy of the repo, so nothing ever clashes.</> },
  { n: '4', brand: 'vercel', name: 'Vercel', use: 'ship it live', desc: <>push to git and it is <O>live</O>. zero config, preview URLs on every branch, and it scales automatically.</> },
  { n: '5', brand: 'posthog', name: 'PostHog', use: 'see what users do', desc: <>analytics, session replays, feature flags, and <O>error tracking</O>. you see exactly how people use what you built.</> },
  { n: '6', brand: 'tella', name: 'Tella', use: 'demos in one click', desc: <>record clean product demos and launch videos in <O>one click</O>. no editing, ship the same day you record.</> },
];

const AppSlide = (a: App): React.ReactNode => (
  <AHFrame variant="dark" justify="center">
    <div style={{ display: 'flex', justifyContent: 'center' }}>{brandBadge(a.brand, 150)}</div>
    <div style={{ textAlign: 'center' }}>
      <Disp size={104}><span style={ah.o}>{a.n}.</span> {a.name}</Disp>
    </div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontStyle: 'italic', fontSize: 36, color: '#f3efe6', textAlign: 'center', lineHeight: 1.4 }}>{a.desc}</div>
    <Callout dark>use it for: {a.use}.</Callout>
  </AHFrame>
);

const slides: React.ReactNode[] = [
  <AHFrame variant="dark" justify="center">
    <Kick label="THE 2026 SAAS STACK" />
    <Disp size={108} style={{ marginTop: 14 }}>6 apps you need to build <span style={ah.oi}>SaaS in 2026.</span></Disp>
    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 16 }}>{APPS.map((a) => <span key={a.brand}>{brandBadge(a.brand, 84)}</span>)}</div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 32, color: '#cfcabf', textAlign: 'center' }}>you do not need a 10 person dev team anymore.</div>
  </AHFrame>,
  ...APPS.map(AppSlide),
  <AHFrame variant="dark" justify="center">
    <div style={{ textAlign: 'center' }}>
      <Disp size={100}>one person.</Disp>
      <Disp size={100} style={ah.oi}>the whole stack.</Disp>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>{APPS.map((a) => <span key={a.brand}>{brandBadge(a.brand, 76)}</span>)}</div>
    <Callout dark>you do not need a 10 person dev team. you need these 6 apps. save this and build.</Callout>
  </AHFrame>,
];
export const devteamDeck = { id: 'DevTeam', title: '6 apps you need to build SaaS in 2026', slides };
