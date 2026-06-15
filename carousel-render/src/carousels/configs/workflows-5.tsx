/** Deck: "5 Claude Workflows that automate your marketing & content" — CTW brand. 7 slides. */
import React from 'react';
import { AHFrame, Disp, Mono, CTAPill, ah } from '../ah-blocks';
import { IconBadge } from '../deck-icons';
import { carouselTheme as T } from '../theme';
import { Kick, CI, DISP, AH_ORANGE, brandBadge } from '../wipf-kit';
import { PenLine, FileText, TrendingUp, Crosshair, Send, Megaphone } from 'lucide-react';

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
type WF = { n: string; Icon: LucideIcon; lead: string; tail: string; tools: string[]; steps: string[]; prompt: string; dark: boolean };

const WFS: WF[] = [
  { n: '01', Icon: FileText, lead: 'content', tail: 'creation.', tools: ['firecrawl', 'apify', 'claude'], dark: false,
    steps: ['connect Claude with Firecrawl and Apify', 'scrape top-performing content in your niche', 'Claude reverse-engineers why it worked and writes new content'],
    prompt: 'Analyze these content examples. Identify hooks, structure, and engagement triggers. Generate 30 content ideas with hook, caption, script, and CTA.' },
  { n: '02', Icon: TrendingUp, lead: 'viral analysis', tail: '& planning.', tools: ['apify', 'claude'], dark: true,
    steps: ['Apify scrapes trending posts', 'Claude identifies winning patterns and formats', 'you get a full content strategy based on what is working now'],
    prompt: 'Analyze these posts. Find recurring hooks, formats, and engagement drivers. Build a 30-day content calendar prioritized by viral potential.' },
  { n: '03', Icon: Crosshair, lead: 'competitor', tail: 'analysis.', tools: ['apify', 'claude'], dark: false,
    steps: ['Apify scrapes competitor sites, ads, and socials', 'Claude breaks down their strategy and gaps', 'you find exactly where to outperform them'],
    prompt: 'Analyze this competitor content, offers, and customer journey. Find weaknesses and missed opportunities. Give me ways to differentiate.' },
  { n: '04', Icon: Send, lead: 'automated', tail: 'outreach.', tools: ['gmail', 'claude'], dark: true,
    steps: ['connect Claude with the Gmail MCP', 'Claude researches prospects and writes personalized emails and DMs', 'every message feels custom written, not templated'],
    prompt: 'Research this prospect business and marketing. Identify one opportunity and write a personalized cold email with a natural tone and a soft CTA.' },
  { n: '05', Icon: Megaphone, lead: 'ads', tail: 'generation.', tools: ['claude', 'meta'], dark: false,
    steps: ['feed Claude your offer', 'Claude generates ad angles, copy, and creative concepts', 'saved via the Filesystem MCP, ready to launch'],
    prompt: 'Analyze my offer and audience. Create 5 ad angles based on different pain points. For each: headline, ad copy, CTA, and a video script for Meta Ads.' },
];

const WorkflowSlide = (w: WF): React.ReactNode => {
  const sub = w.dark ? '#cfcabf' : '#3a3733';
  return (
    <AHFrame variant={w.dark ? 'dark' : 'cream'} justify="center">
      <div>
        <Kick label={`WORKFLOW ${w.n}`} />
        <Disp size={88} style={{ marginTop: 12 }}>{w.lead} <span style={ah.oi}>{w.tail}</span></Disp>
        <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>{w.tools.map((t) => <span key={t}>{brandBadge(t, 64, w.dark ? '#faf7f0' : '#ffffff')}</span>)}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {w.steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 20, background: w.dark ? '#17140f' : '#ffffff', border: w.dark ? '1px solid rgba(255,255,255,0.07)' : '1.5px solid rgba(20,16,12,0.12)', borderRadius: 14, padding: '20px 24px', boxShadow: w.dark ? 'none' : '0 12px 30px rgba(20,16,12,0.06)' }}>
            <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 38, color: AH_ORANGE, opacity: 0.55, flex: '0 0 auto', width: 40, textAlign: 'center' }}>{i + 1}</span>
            <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 29, color: w.dark ? '#e7e3da' : '#2a2724', lineHeight: 1.28 }}>{s}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', background: w.dark ? 'rgba(232,84,43,0.12)' : '#f4ddd2', border: `2px solid ${AH_ORANGE}`, borderRadius: 16, padding: '22px 26px' }}>
        <IconBadge Icon={PenLine} dark={w.dark} box={56} solid />
        <div><Mono size={17} color={AH_ORANGE}>PROMPT</Mono>
          <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 26, color: w.dark ? '#f3efe6' : CI, lineHeight: 1.34, marginTop: 8 }}>{w.prompt}</div></div>
      </div>
    </AHFrame>
  );
};

const slides: React.ReactNode[] = [
  // cover
  <AHFrame variant="dark" justify="center">
    <div>
      <Disp size={150}>5 Claude</Disp>
      <Disp size={150} style={ah.oi}>workflows</Disp>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 56, color: '#f3efe6', marginTop: 8 }}>that automate your marketing.</div>
    </div>
    <div style={{ display: 'flex', gap: 14 }}>{['firecrawl', 'apify', 'claude', 'gmail', 'meta'].map((t) => <span key={t}>{brandBadge(t, 76)}</span>)}</div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 32, color: '#cfcabf', lineHeight: 1.36 }}>stop doing it manually. these run your marketing on autopilot, 24/7.</div>
  </AHFrame>,
  ...WFS.map(WorkflowSlide),
  // CTA
  <AHFrame variant="dark" justify="center">
    <div style={{ textAlign: 'center' }}>
      <Disp size={96}>I broke down every</Disp>
      <Disp size={96} style={ah.oi}>workflow in detail.</Disp>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {['content creation', 'viral analysis', 'competitor analysis', 'automated outreach', 'ads generation'].map((t, i) => (
        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 30, color: AH_ORANGE, width: 48 }}>{`0${i + 1}`}</span>
          <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 30, color: '#e7e3da' }}>{t}</span>
        </div>
      ))}
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}><CTAPill pre="COMMENT" word="ACCESS" /></div>
  </AHFrame>,
];

export const workflows5Deck = { id: 'Workflows5', title: '5 Claude workflows that automate your marketing and content', slides };
