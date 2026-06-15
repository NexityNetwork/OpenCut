/** Deck: "you are building a startup with AI instead of investors" — CTW brand. 6 slides. */
import React from 'react';
import { AHFrame, Disp, Mono, CTAPill, ah } from '../ah-blocks';
import { carouselTheme as T } from '../theme';
import { Kick, Callout, CI, DISP, AH_ORANGE, brandBadge } from '../wipf-kit';

const MONO = T.monoFont;
type Line = { name: string; price: string; desc: string };
const ToolLine: React.FC<{ l: Line }> = ({ l }) => (
  <div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 38, color: CI, flex: '0 0 auto' }}>{l.name}</span>
      <span style={{ flex: 1, borderBottom: '2px dotted rgba(20,16,12,0.25)', transform: 'translateY(-9px)' }} />
      <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 36, color: AH_ORANGE, flex: '0 0 auto' }}>{l.price}</span>
    </div>
    <div style={{ fontFamily: MONO, fontStyle: 'italic', fontSize: 24, color: '#6b6660', marginTop: 6 }}>{l.desc}</div>
  </div>
);
const Section: React.FC<{ num: string; head: string; lines: Line[]; payoff: string; logos: string[] }> = ({ num, head, lines, payoff, logos }) => (
  <AHFrame variant="cream" justify="center">
    <Disp size={96}><span style={ah.o}>{num}.</span> {head}</Disp>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>{lines.map((l) => <ToolLine key={l.name} l={l} />)}</div>
    <Callout>{payoff}</Callout>
    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 16 }}>{logos.map((b) => <span key={b}>{brandBadge(b, 82)}</span>)}</div>
  </AHFrame>
);

const slides: React.ReactNode[] = [
  <AHFrame variant="dark" justify="center">
    <Kick label="THE NEW PLAYBOOK" />
    <Disp size={104}>you are building a <span style={ah.oi}>startup</span></Disp>
    <Disp size={104}>with AI</Disp>
    <Disp size={104}>instead of <span style={ah.oi}>investors.</span></Disp>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 32, color: '#cfcabf', marginTop: 8 }}>the whole stack, almost free. swipe.</div>
  </AHFrame>,
  <Section num="1" head="the AI" payoff="you just hired a team. it does not sleep, complain, or ask for equity." logos={['claude', 'cursor', 'perplexity']} lines={[
    { name: 'Claude Code', price: '20/mo', desc: 'your entire engineering team in a terminal.' },
    { name: 'Cursor', price: 'free', desc: 'your IDE, but it writes the code too.' },
    { name: 'Perplexity', price: 'free', desc: 'research without the rabbit holes.' },
  ]} />,
  <Section num="2" head="the stack" payoff="your entire infrastructure. free." logos={['nextjs', 'supabase', 'vercel', 'tailwind']} lines={[
    { name: 'Next.js + Tailwind', price: 'free', desc: 'the frontend. fast, clean, ships in hours.' },
    { name: 'Supabase', price: 'free', desc: 'your database and auth. scales without DevOps.' },
    { name: 'Vercel', price: 'free', desc: 'deployed in two minutes. zero config.' },
  ]} />,
  <Section num="3" head="the money" payoff="you only pay when you get paid. the only fee worth paying." logos={['stripe', 'polar']} lines={[
    { name: 'Stripe', price: '2.9% + 0.30', desc: 'payment processing. you handle tax and compliance.' },
    { name: 'Polar', price: '4.0% + 0.40', desc: 'merchant of record. they handle tax for you.' },
  ]} />,
  <AHFrame variant="cream" justify="center">
    <Disp size={96}><span style={ah.o}>4.</span> the total</Disp>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
      <ToolLine l={{ name: 'funded startup', price: '500k+', desc: 'a team, an office, a board, and a runway clock.' }} />
      <ToolLine l={{ name: 'your startup', price: '~20/mo', desc: 'you, AI, and a problem worth solving.' }} />
    </div>
    <div style={{ background: 'rgba(232,84,43,0.10)', border: `2px solid ${AH_ORANGE}`, borderRadius: 18, padding: '30px 32px', textAlign: 'center' }}>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 80, color: CI, lineHeight: 1 }}>your excuse: gone.</div>
    </div>
  </AHFrame>,
  <AHFrame variant="dark" justify="center">
    <div style={{ textAlign: 'center' }}>
      <Disp size={104}>you are welcome.</Disp>
      <Disp size={104} style={ah.oi}>now build.</Disp>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}><CTAPill pre="COMMENT" word="START" /></div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 30, color: '#cfcabf', textAlign: 'center', marginTop: 22 }}>comment START for the full guide.</div>
  </AHFrame>,
];
export const unfairDeck = { id: 'Unfair', title: 'building a startup with AI instead of investors', slides };
