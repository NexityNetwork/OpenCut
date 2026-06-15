/** Deck: "the first 1M business run by AI agents" — CTW brand. 8 slides. */
import React from 'react';
import { AHFrame, Disp, Mono, CTAPill, ah } from '../ah-blocks';
import { carouselTheme as T } from '../theme';
import { Kick, Callout, CI, DISP, AH_ORANGE, brandBadge } from '../wipf-kit';

const MONO = T.monoFont;

const Compare: React.FC<{ label: string; items: string[]; accent?: boolean }> = ({ label, items, accent }) => (
  <div style={{ flex: 1, background: accent ? 'rgba(232,84,43,0.10)' : '#17140f', border: accent ? `2px solid ${AH_ORANGE}` : '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '26px 26px' }}>
    <Mono size={19} color={accent ? AH_ORANGE : 'rgba(243,239,230,0.45)'}>{label}</Mono>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 18 }}>
      {items.map((i) => <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: accent ? AH_ORANGE : 'rgba(243,239,230,0.4)', flex: '0 0 auto' }} /><span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 29, color: accent ? '#f3efe6' : '#cfcabf' }}>{i}</span></div>)}
    </div>
  </div>
);
const AgentRow: React.FC<{ name: string; desc: string }> = ({ name, desc }) => (
  <div style={{ background: '#17140f', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 24px' }}>
    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: AH_ORANGE }}>{name}</span>
    <span style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 27, color: '#cfcabf' }}>  {desc}</span>
  </div>
);
const TLine: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: AH_ORANGE, width: 200, flex: '0 0 auto' }}>{k}</span>
    <span style={{ fontFamily: MONO, fontSize: 30, color: '#3a3733' }}>{v}</span>
  </div>
);

const slides: React.ReactNode[] = [
  <AHFrame variant="dark" justify="center">
    <Kick label="THE 2026 BLUEPRINT" />
    <Disp size={132}>1M.</Disp>
    <Disp size={72}>no team. no office. <span style={ah.oi}>just AI agents.</span></Disp>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 32, color: '#cfcabf', marginTop: 12 }}>here is the blueprint.</div>
  </AHFrame>,
  <AHFrame variant="dark" justify="center">
    <Disp size={94}><span style={ah.o}>1.</span> the shift.</Disp>
    <div style={{ display: 'flex', gap: 20 }}>
      <Compare label="A BUSINESS USED TO NEED" items={['a founder', 'a team', 'an office', 'investors']} />
      <Compare accent label="IN 2026 IT NEEDS" items={['a founder', 'the right AI agents', '50 a month']} />
    </div>
    <Callout dark>the team has changed. not the goal.</Callout>
  </AHFrame>,
  <AHFrame variant="dark" justify="center">
    <Disp size={94}><span style={ah.o}>2.</span> the AI team.</Disp>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <AgentRow name="Marketing" desc="writes, posts, grows your content in one prompt." />
      <AgentRow name="Sales" desc="follows up, closes, never misses a lead." />
      <AgentRow name="Support" desc="replies, resolves, retains. 24/7 at zero cost." />
      <AgentRow name="Build" desc="codes, ships, fixes. a senior engineer in a terminal." />
    </div>
  </AHFrame>,
  <AHFrame variant="cream" justify="center">
    <Disp size={94}><span style={ah.o}>3.</span> the stack.</Disp>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {[['claude', 'Claude Code', 'builds the product'], ['cursor', 'Cursor', 'writes the code'], ['supabase', 'Supabase', 'runs the backend'], ['vercel', 'Vercel', 'deploys in minutes'], ['stripe', 'Stripe', 'collects the money']].map(([b, n, d]) => (
        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>{brandBadge(b, 64, '#ffffff')}<span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 32, color: CI }}>{n}</span><span style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 27, color: '#54504a' }}>{d}</span></div>
      ))}
    </div>
    <Callout>monthly cost ~50. what it replaces: a 500k+ team.</Callout>
  </AHFrame>,
  <AHFrame variant="dark" justify="center">
    <Disp size={94}><span style={ah.o}>4.</span> how it makes 1M.</Disp>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {['find a painful problem', 'build a simple solution with AI', 'charge 49 a month', '1700 customers x 49 = 1M a year'].map((t, i) => (
        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 18 }}><span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 40, color: AH_ORANGE, width: 44 }}>{i + 1}</span><span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 31, color: '#e7e3da' }}>{t}</span></div>
      ))}
    </div>
    <Callout dark>you do not need a big idea. you need the right problem and the right agents.</Callout>
  </AHFrame>,
  <AHFrame variant="cream" justify="center">
    <Disp size={84}><span style={ah.o}>5.</span> how fast you move.</Disp>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <TLine k="week 1" v="validate the idea" />
      <TLine k="week 2" v="build the MVP with Claude Code" />
      <TLine k="week 3" v="get your first 10 users" />
      <TLine k="week 4" v="charge 49 a month" />
      <TLine k="month 6" v="automate with agents" />
      <TLine k="month 12" v="1M is not crazy anymore" />
    </div>
  </AHFrame>,
  <AHFrame variant="dark" justify="center">
    <div style={{ textAlign: 'center' }}>
      <Disp size={88}>the 1M business is</Disp>
      <Disp size={88} style={ah.oi}>already being built.</Disp>
    </div>
    <Callout dark>your competitor is waiting for funding. you have agents, 50 a month, and a problem worth solving. by someone like you. start.</Callout>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}><CTAPill pre="COMMENT" word="AI" /></div>
  </AHFrame>,
];
export const firstmilDeck = { id: 'FirstMil', title: 'the first 1M business run by AI agents', slides };
