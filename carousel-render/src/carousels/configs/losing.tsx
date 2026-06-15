/** Deck: "0 to 10k a month with one AI automation" (agency playbook) — CTW brand. 8 slides. */
import React from 'react';
import { AHFrame, Disp, Mono, CTAPill, ah } from '../ah-blocks';
import { carouselTheme as T } from '../theme';
import { Kick, Callout, CI, DISP, AH_ORANGE, brandBadge } from '../wipf-kit';

const MONO = T.monoFont;
const Bullet: React.FC<{ children: React.ReactNode; dark?: boolean }> = ({ children, dark }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}><span style={{ width: 11, height: 11, borderRadius: '50%', background: AH_ORANGE, flex: '0 0 auto' }} /><span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 31, color: dark ? '#e7e3da' : '#2a2724' }}>{children}</span></div>
);
const FlowMock: React.FC = () => {
  const steps = ['lead in', 'AI qualifies', 'AI writes follow-up', 'sends', 'no reply, waits 3d', 'reply, books call'];
  return (
    <div style={{ background: '#0e0e10', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: 24, boxShadow: '0 26px 60px rgba(0,0,0,0.35)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>{['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />)}<span style={{ marginLeft: 8, fontFamily: MONO, fontSize: 17, color: '#8a8a92' }}>claude workflow · active</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#17171a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 18px' }}>
            <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 24, color: AH_ORANGE, width: 30 }}>{i + 1}</span>
            <span style={{ fontFamily: MONO, fontSize: 22, color: '#d6d6dc' }}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
type Line = { name: string; price: string; desc: string };
const ToolLine: React.FC<{ l: Line }> = ({ l }) => (
  <div><div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 34, color: CI, flex: '0 0 auto' }}>{l.name}</span>
    <span style={{ flex: 1, borderBottom: '2px dotted rgba(20,16,12,0.25)', transform: 'translateY(-8px)' }} />
    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 32, color: AH_ORANGE, flex: '0 0 auto' }}>{l.price}</span>
  </div><div style={{ fontFamily: MONO, fontStyle: 'italic', fontSize: 22, color: '#6b6660', marginTop: 4 }}>{l.desc}</div></div>
);

const slides: React.ReactNode[] = [
  <AHFrame variant="dark" justify="center">
    <Kick label="THE AI AUTOMATION AGENCY" />
    <Disp size={150}>0 to <span style={ah.oi}>10k</span></Disp>
    <Disp size={92}>a month.</Disp>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 32, color: '#cfcabf', marginTop: 12 }}>with one AI automation. here is the exact workflow.</div>
  </AHFrame>,
  <AHFrame variant="cream" justify="center">
    <Disp size={96}><span style={ah.o}>1.</span> the problem.</Disp>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 34, color: '#2a2724' }}>most businesses are drowning in repetitive work.</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Bullet>following up with leads manually</Bullet>
      <Bullet>writing the same emails every day</Bullet>
      <Bullet>copying data between tools</Bullet>
      <Bullet>building reports nobody reads</Bullet>
    </div>
    <Callout>they know it is a problem. they do not know AI can fix it in a day. that is your opportunity.</Callout>
  </AHFrame>,
  <AHFrame variant="cream" justify="center">
    <Disp size={96}><span style={ah.o}>2.</span> the workflow.</Disp>
    <FlowMock />
    <Callout>one workflow. zero manual work. runs 24/7 while you sleep.</Callout>
  </AHFrame>,
  <AHFrame variant="cream" justify="center">
    <Disp size={96}><span style={ah.o}>3.</span> the stack.</Disp>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <ToolLine l={{ name: 'Claude', price: 'free-20', desc: 'writes every message. sounds human, converts.' }} />
      <ToolLine l={{ name: 'Make.com', price: 'free-9', desc: 'connects everything together.' }} />
      <ToolLine l={{ name: 'Notion / Airtable', price: 'free', desc: 'your lead database.' }} />
    </div>
    <Callout>total cost ~30 a month. what you charge: 1,500 to 3,500 a month.</Callout>
  </AHFrame>,
  <AHFrame variant="dark" justify="center">
    <Disp size={96}><span style={ah.o}>4.</span> the math.</Disp>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[['build once', '3-5 hours with AI'], ['charge', '2,500 setup'], ['retainer', '500-1,000 a month'], ['3 clients', '7,500 setup + 1,500 a month'], ['5 clients', '12,500 setup + 2,500 a month']].map(([k, v]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}><span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: AH_ORANGE, width: 200, flex: '0 0 auto' }}>{k}</span><span style={{ fontFamily: MONO, fontSize: 29, color: '#e7e3da' }}>{v}</span></div>
      ))}
    </div>
    <Callout dark>you do not need 100 clients. you need 5 good ones.</Callout>
  </AHFrame>,
  <AHFrame variant="cream" justify="center">
    <Disp size={90}><span style={ah.o}>5.</span> how to find them.</Disp>
    <div style={{ display: 'flex', gap: 20 }}>
      <div style={{ flex: 1, background: '#ffffff', border: '1.5px solid rgba(20,16,12,0.12)', borderRadius: 18, padding: '24px 24px', boxShadow: '0 14px 34px rgba(20,16,12,0.06)' }}>
        <Mono size={18} color={AH_ORANGE}>WHO NEEDS IT</Mono>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>{['real estate agents', 'recruitment agencies', 'mortgage brokers', 'marketing agencies', 'B2B SaaS'].map((t) => <span key={t} style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 26, color: '#2a2724' }}>{t}</span>)}</div>
      </div>
      <div style={{ flex: 1, background: 'rgba(232,84,43,0.10)', border: `2px solid ${AH_ORANGE}`, borderRadius: 18, padding: '24px 24px' }}>
        <Mono size={18} color={AH_ORANGE}>WHERE TO FIND</Mono>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>{['cold DMs on LinkedIn', 'local Facebook groups', 'Upwork and Contra', 'your existing network'].map((t) => <span key={t} style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 26, color: '#2a2724' }}>{t}</span>)}</div>
      </div>
    </div>
    <Callout>one client pays for 3 months of tools.</Callout>
  </AHFrame>,
  <AHFrame variant="dark" justify="center">
    <Disp size={88}><span style={ah.o}>6.</span> the timeline.</Disp>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[['week 1', 'build the automation with AI'], ['week 2', 'land your first client'], ['week 3', 'deliver, get a testimonial'], ['week 4', 'use it to close 2 more'], ['month 3', '10k a month is just math']].map(([k, v]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}><span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, color: AH_ORANGE, width: 160, flex: '0 0 auto' }}>{k}</span><span style={{ fontFamily: MONO, fontSize: 27, color: '#e7e3da' }}>{v}</span></div>
      ))}
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}><CTAPill pre="COMMENT" word="AI" /></div>
  </AHFrame>,
];
export const losingDeck = { id: 'Losing', title: '0 to 10k a month with one AI automation', slides };
