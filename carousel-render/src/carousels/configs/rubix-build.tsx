/** Deck: "6 paid tools you can build yourself with AI" — CTW brand. 8 slides. */
import React from 'react';
import { AHFrame, Disp, Mono, CTAPill, ah } from '../ah-blocks';
import { carouselTheme as T } from '../theme';
import { Kick, Callout, CI, DISP, AH_ORANGE, BrowserMock } from '../wipf-kit';
import { Mail, LayoutTemplate, CalendarClock, Mic, Receipt, PenTool, Zap } from 'lucide-react';

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
type Tool = { n: string; Icon: LucideIcon; name: string; tail: string; replaces: string; price: string; diy: string; desc: string; app: string; stats: [string, string][]; prompt: string; dark: boolean };
const TOOLS: Tool[] = [
  { n: '01', Icon: Mail, name: 'bulk email', tail: 'warmup & sender.', replaces: 'Instantly', price: '97/mo', diy: 'Email Sender', dark: true,
    desc: 'rotate SMTP inboxes, warm up domains automatically, track deliverability, and send cold emails at scale.', app: 'mailforge.app',
    stats: [['SENT', '1,247'], ['INBOX', '98.2%'], ['BOUNCE', '0.3%']],
    prompt: 'Build an email warmup system with SMTP rotation, automated warmup schedules, deliverability scoring, inbox health, and a throttled send queue.' },
  { n: '02', Icon: LayoutTemplate, name: 'AI landing', tail: 'page builder.', replaces: 'Unbounce', price: '99/mo', diy: 'Page Builder', dark: false,
    desc: 'generate responsive landing pages from a text prompt, drag and drop the sections, and A/B test variants with conversion scoring.', app: 'pagecraft.ai',
    stats: [['PAGES', '12'], ['VARIANTS', '3'], ['CONV', '87%']],
    prompt: 'Build an AI landing page builder that generates responsive pages from text, with a section editor, A/B testing, form capture, and one-click publish.' },
  { n: '03', Icon: CalendarClock, name: 'social media', tail: 'scheduler.', replaces: 'Buffer', price: '15/mo', diy: 'Scheduler', dark: true,
    desc: 'AI caption generation, multi-platform posting to Instagram, TikTok, and LinkedIn, and a calendar view with analytics.', app: 'socialflow.app',
    stats: [['POSTS', '14'], ['PLATS', '3'], ['REACH', '9.2k']],
    prompt: 'Build a social scheduler with AI caption generation, multi-platform posting, a drag-and-drop calendar, and an analytics dashboard.' },
  { n: '04', Icon: Mic, name: 'meeting', tail: 'notes.', replaces: 'Otter', price: '17/mo', diy: 'Meeting Notes', dark: false,
    desc: 'record and transcribe every call, then summarize the key points, decisions, and action items with speaker labels.', app: 'notetaker.app',
    stats: [['CALLS', '38'], ['HOURS', '52'], ['ACTIONS', '120']],
    prompt: 'Build a meeting notes tool that records and transcribes calls, then summarizes decisions and action items, with speaker labels and search.' },
  { n: '05', Icon: Receipt, name: 'invoice &', tail: 'expense tracker.', replaces: 'FreshBooks', price: '17/mo', diy: 'Invoicing', dark: true,
    desc: 'OCR receipt scanning, auto-categorized expenses, and professional invoices with Stripe payment links built in.', app: 'invoiceforge.app',
    stats: [['REVENUE', '12.4k'], ['INVOICES', '8'], ['CLIENTS', '5']],
    prompt: 'Build an invoice and expense tracker with OCR receipt scanning, auto-categorization, invoice generation with line items, and Stripe payments.' },
  { n: '06', Icon: PenTool, name: 'SEO', tail: 'writer.', replaces: 'Surfer', price: '19/mo', diy: 'SEO Writer', dark: false,
    desc: 'keyword research, AI outlines, long-form articles, and internal-link suggestions, optimized to actually rank.', app: 'rankwrite.app',
    stats: [['ARTICLES', '24'], ['KEYWORDS', '310'], ['SCORE', '94']],
    prompt: 'Build an SEO writer that runs keyword research, generates outlines, writes long-form articles, and suggests internal links and meta tags.' },
];

const ReplaceBadge: React.FC<{ t: Tool }> = ({ t }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: t.dark ? '#000' : '#161412', borderRadius: 999, padding: '10px 20px', alignSelf: 'flex-start' }}>
    <Zap size={18} color={AH_ORANGE} fill={AH_ORANGE} />
    <span style={{ fontFamily: T.bodyFont, fontWeight: 800, fontSize: 20, color: '#fff' }}>REPLACES {t.replaces}</span>
    <span style={{ fontFamily: T.bodyFont, fontWeight: 800, fontSize: 20, color: AH_ORANGE }}>{t.price}</span>
    <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 20, color: '#3ECF8E' }}>→ DIY {t.diy}</span>
  </div>
);

const ToolSlide = (t: Tool): React.ReactNode => {
  const sub = t.dark ? '#cfcabf' : '#3a3733';
  return (
    <AHFrame variant={t.dark ? 'dark' : 'cream'} justify="center">
      <div>
        <ReplaceBadge t={t} />
        <Disp size={86} style={{ marginTop: 16 }}>{t.name} <span style={ah.oi}>{t.tail}</span></Disp>
        <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 30, color: sub, lineHeight: 1.36, marginTop: 14 }}>{t.desc}</div>
      </div>
      <BrowserMock url={t.app} dark={t.dark}>
        <div style={{ display: 'flex', gap: 12 }}>
          {t.stats.map(([l, v]) => (
            <div key={l} style={{ flex: 1, background: t.dark ? '#141416' : '#f6f3ec', border: t.dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(20,16,12,0.08)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontFamily: T.monoFont, fontSize: 13, color: t.dark ? 'rgba(243,239,230,0.5)' : '#8a857c' }}>{l}</div>
              <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 36, color: t.dark ? '#f6f4ef' : CI, lineHeight: 1, marginTop: 6 }}>{v}</div>
            </div>
          ))}
        </div>
      </BrowserMock>
      <div style={{ background: t.dark ? 'rgba(232,84,43,0.12)' : '#f4ddd2', border: `2px solid ${AH_ORANGE}`, borderRadius: 14, padding: '18px 22px' }}>
        <Mono size={16} color={AH_ORANGE}>AI PROMPT</Mono>
        <div style={{ fontFamily: T.monoFont, fontSize: 21, color: t.dark ? '#e7e3da' : CI, lineHeight: 1.4, marginTop: 8 }}>{t.prompt}</div>
      </div>
    </AHFrame>
  );
};

const slides: React.ReactNode[] = [
  <AHFrame variant="cream" justify="center">
    <Kick label="STOP PAYING MONTHLY" />
    <Disp size={100} style={{ marginTop: 12 }}>6 paid tools you can <span style={ah.oi}>build yourself.</span></Disp>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 32, color: '#3a3733', lineHeight: 1.36 }}>replace 300+ a month in SaaS with tools you build in a weekend using AI.</div>
    <div style={{ background: 'rgba(232,84,43,0.10)', border: `2px solid ${AH_ORANGE}`, borderRadius: 14, padding: '20px 26px', textAlign: 'center' }}>
      <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 28, color: '#54504a' }}>total savings </span><span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 44, color: AH_ORANGE }}>3,600+ a year</span>
    </div>
  </AHFrame>,
  ...TOOLS.map(ToolSlide),
  <AHFrame variant="cream" justify="center">
    <div style={{ textAlign: 'center' }}>
      <Disp size={92}>want the full prompts</Disp>
      <Disp size={92} style={ah.oi}>to build these?</Disp>
    </div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 30, color: '#3a3733', textAlign: 'center', lineHeight: 1.4 }}>I will DM you all 6 complete prompts with tech stacks and step-by-step build guides.</div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}><CTAPill pre="COMMENT" word="BUILD" /></div>
  </AHFrame>,
];
export const rubixBuildDeck = { id: 'RubixBuild', title: '6 paid tools you can build yourself with AI', slides };
