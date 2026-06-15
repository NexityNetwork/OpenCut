/** Deck: "pov: you built a startup in a cave with a box of scraps" — CTW brand. 9 slides. */
import React from 'react';
import { AHFrame, Disp, Mono, ah } from '../ah-blocks';
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

const Section: React.FC<{ num: string; head: string; lines: Line[]; payoff?: string; logos: string[] }> = ({ num, head, lines, payoff, logos }) => (
  <AHFrame variant="cream" justify="center">
    <Disp size={98}><span style={ah.o}>{num}.</span> {head}</Disp>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>{lines.map((l) => <ToolLine key={l.name} l={l} />)}</div>
    {payoff && <Callout>{payoff}</Callout>}
    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 16 }}>{logos.map((b) => <span key={b}>{brandBadge(b, 82)}</span>)}</div>
  </AHFrame>
);

const slides: React.ReactNode[] = [
  // cover
  <AHFrame variant="dark" justify="center">
    <Kick label="THE WHOLE STACK" />
    <Disp size={104}>pov: you built a <span style={ah.oi}>startup</span></Disp>
    <Disp size={104}>in a cave</Disp>
    <Disp size={104}>with a <span style={ah.oi}>box of scraps.</span></Disp>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 32, color: '#cfcabf', marginTop: 8 }}>the entire stack, mostly free. swipe.</div>
  </AHFrame>,

  <Section num="1" head="the tech stack" logos={['supabase', 'convex', 'betterauth', 'typescript', 'nextjs', 'tailwind']}
    payoff="your entire foundation. free, at least to start." lines={[
      { name: 'Supabase / Convex', price: 'free', desc: 'your data and backend. scales with you, not against you.' },
      { name: 'Next.js + TS + Tailwind', price: 'free', desc: 'the frontend. fast, typed, looks good out of the box.' },
      { name: 'Better-Auth', price: 'free', desc: 'add auth in an afternoon. works with every provider.' },
    ]} />,

  <Section num="2" head="the deployment" logos={['render', 'railway', 'hetzner']} lines={[
    { name: 'Render', price: '7/mo', desc: 'zero-config, reliable. basically industry standard.' },
    { name: 'Railway', price: '5/mo', desc: 'also zero-config, best UX. can be less reliable.' },
    { name: 'Hetzner VPS', price: '5/mo', desc: 'total control, but the least abstraction.' },
    { name: 'Domain', price: '1-14/yr', desc: 'do you even SaaS if you do not have one?' },
  ]} />,

  <Section num="3" head="the money" logos={['stripe', 'polar']} payoff="you only pay when you get paid." lines={[
    { name: 'Stripe', price: '2.9% + 0.30', desc: 'payment processing. you handle tax and compliance.' },
    { name: 'Polar', price: '4.0% + 0.40', desc: 'merchant of record. they handle tax for you.' },
  ]} />,

  <Section num="4" head="the AI" logos={['cursor', 'antigravity', 'claude', 'perplexity']} payoff="a team that does not sleep or ask for equity. touch grass anyway." lines={[
    { name: 'Cursor', price: 'free', desc: 'your IDE, but it writes the code too.' },
    { name: 'Antigravity', price: 'free', desc: 'another IDE, Google AI this time. better at design.' },
    { name: 'Claude Code / Codex', price: '20/mo', desc: 'x5 your output. you will get the max plan eventually.' },
    { name: 'Perplexity', price: 'free', desc: 'fly through the internet with no distractions.' },
  ]} />,

  <Section num="5" head="the signals" logos={['resend', 'posthog', 'sentry']} payoff="see and talk to everyone using your product." lines={[
    { name: 'Resend', price: 'free', desc: 'transactional and marketing email. users always hear from you.' },
    { name: 'PostHog', price: 'free', desc: 'analytics, heatmaps, a/b testing, and error tracking.' },
    { name: 'Sentry', price: 'free', desc: 'when something breaks, it tells you where and how.' },
  ]} />,

  <Section num="6" head="the distribution" logos={['canva', 'sovian', 'tiktok', 'instagram', 'reddit', 'x']} payoff="the only thing between you and your first user." lines={[
    { name: 'Canva', price: 'free', desc: 'make it look like you have a design team.' },
    { name: 'Sovian', price: '50/mo', desc: 'go viral with a curated network of micro-creators.' },
    { name: 'TikTok / Instagram', price: 'free', desc: 'your first 1000 users live here. not on GitHub.' },
    { name: 'Reddit / X', price: 'free', desc: 'find the exact community that needs your product.' },
  ]} />,

  // total
  <AHFrame variant="cream" justify="center">
    <Disp size={86}><span style={ah.o}>7.</span> the total</Disp>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <ToolLine l={{ name: 'to build', price: '~26/mo', desc: 'everything that runs the product.' }} />
      <ToolLine l={{ name: 'to distribute', price: '50/mo', desc: 'everything that gets you users.' }} />
    </div>
    <div style={{ background: 'rgba(232,84,43,0.10)', border: `2px solid ${AH_ORANGE}`, borderRadius: 18, padding: '30px 32px', textAlign: 'center' }}>
      <Mono size={19} color={AH_ORANGE}>TOTAL</Mono>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 96, color: CI, lineHeight: 1, marginTop: 10 }}>~76 a month</div>
    </div>
  </AHFrame>,

  // CTA
  <AHFrame variant="dark" justify="center">
    <div style={{ textAlign: 'center' }}>
      <Disp size={96}>the whole startup</Disp>
      <Disp size={96} style={ah.oi}>for ~76 a month.</Disp>
    </div>
    <Callout dark>no excuses left. the box of scraps is fully stocked. save this and build.</Callout>
  </AHFrame>,
];

export const caveStackDeck = { id: 'CaveStack', title: 'pov you built a startup in a cave with a box of scraps', slides };
