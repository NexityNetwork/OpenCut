/** Deck: "You need a content dashboard" — CTW brand. 9 slides (sidebar mock + prompts). */
import React from 'react';
import { AHFrame, Disp, Mono, CTAPill, ah, AH_ORANGE } from '../ah-blocks';
import { CodeCard } from '../feature-blocks';
import { carouselTheme as T } from '../theme';
import { LayoutGrid, Anchor, BarChart3, Target, CalendarClock, Calendar, TrendingUp } from 'lucide-react';

const CI = '#161412';
const DISP = T.displayFont;
const GREEN = '#3a9d6b';
type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const Kick: React.FC<{ label: string }> = ({ label }) => <Mono size={22} color={AH_ORANGE}>{label}</Mono>;
const Title: React.FC<{ kick: string; lead: string; tail: string }> = ({ kick, lead, tail }) => (
  <div><Kick label={kick} /><Disp size={82} style={{ marginTop: 10 }}>{lead} <span style={ah.oi}>{tail}</span></Disp></div>
);

const NAV: [string, LucideIcon][] = [
  ['Overview', LayoutGrid], ['Hook Vault', Anchor], ['Analytics', BarChart3], ['Competitor', Target],
  ['Scheduler', CalendarClock], ['Calendar', Calendar], ['Trending', TrendingUp],
];

/** The dashboard chrome: sidebar (active item highlighted) + content area. */
const Mock: React.FC<{ active: number; children: React.ReactNode }> = ({ active, children }) => (
  <div style={{ background: '#fbf8f1', border: '1px solid rgba(20,16,12,0.12)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 26px 60px rgba(20,16,12,0.12)', display: 'flex', minHeight: 0 }}>
    <div style={{ width: 232, flex: '0 0 auto', background: '#f0ebe0', borderRight: '1px solid rgba(20,16,12,0.08)', padding: '20px 16px' }}>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 21, color: CI }}>@ctwformat</div>
      <div style={{ fontFamily: T.monoFont, fontSize: 14, color: '#8a857c', marginTop: 2, marginBottom: 18 }}>287.4K · 30D</div>
      {NAV.map(([label, Icon], i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, marginBottom: 3, background: i === active ? 'rgba(232,84,43,0.14)' : 'transparent' }}>
          <Icon size={17} color={i === active ? AH_ORANGE : '#8a857c'} strokeWidth={2.2} />
          <span style={{ fontFamily: T.bodyFont, fontWeight: i === active ? 800 : 600, fontSize: 17, color: i === active ? AH_ORANGE : '#54504a' }}>{label}</span>
        </div>
      ))}
    </div>
    <div style={{ flex: 1, minWidth: 0, padding: '22px 24px' }}>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 26, color: CI }}>good morning, Marc</div>
      <div style={{ fontFamily: T.monoFont, fontSize: 14, color: '#8a857c', marginTop: 3, marginBottom: 18 }}>3 reels queued · 2 hooks heating</div>
      {children}
    </div>
  </div>
);

const StatTile: React.FC<{ label: string; value: string; delta: string }> = ({ label, value, delta }) => (
  <div style={{ flex: 1, background: '#fffdf8', border: '1px solid rgba(20,16,12,0.1)', borderRadius: 12, padding: '14px 16px' }}>
    <div style={{ fontFamily: T.monoFont, fontSize: 13, color: '#8a857c', letterSpacing: '0.04em' }}>{label}</div>
    <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 38, color: CI, lineHeight: 1, marginTop: 6 }}>{value}</div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 16, color: GREEN, marginTop: 6 }}>{delta}</div>
  </div>
);
const Row: React.FC<{ left: string; right: string; tag?: string }> = ({ left, right, tag }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid rgba(20,16,12,0.07)' }}>
    <span style={{ fontFamily: T.monoFont, fontSize: 16, color: '#3a3733', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{left}</span>
    <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 17, color: AH_ORANGE }}>{right}</span>
    {tag && <span style={{ fontFamily: T.monoFont, fontSize: 12, color: '#a8472f', background: 'rgba(232,84,43,0.12)', borderRadius: 5, padding: '3px 8px' }}>{tag}</span>}
  </div>
);
const Panel: React.FC<{ title: string; right?: string; children: React.ReactNode }> = ({ title, right, children }) => (
  <div style={{ background: '#fffdf8', border: '1px solid rgba(20,16,12,0.1)', borderRadius: 12, padding: '14px 18px', marginTop: 14 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
      <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 19, color: CI }}>{title}</span>
      {right && <span style={{ fontFamily: T.monoFont, fontSize: 13, color: '#a8472f', background: 'rgba(232,84,43,0.12)', borderRadius: 5, padding: '3px 9px' }}>{right}</span>}
    </div>
    {children}
  </div>
);

const slides: React.ReactNode[] = [
  // 1 — cover (overview)
  <AHFrame variant="cream" justify="center">
    <div>
      <Kick label="THE CONTENT OS" />
      <Disp size={84} style={{ marginTop: 10 }}>you need a <span style={ah.oi}>content dashboard.</span></Disp>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 31, color: '#3a3733', marginTop: 14 }}>here is everything you need to build yours.</div>
    </div>
    <Mock active={0}>
      <div style={{ display: 'flex', gap: 12 }}>
        <StatTile label="IG VIEWS · 7D" value="287.4K" delta="▲ 162%" />
        <StatTile label="STRIPE · 30D" value="48.2K" delta="▲ 39%" />
        <StatTile label="DMS FILTERED" value="1,204" delta="▲ 88%" />
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <Panel title="Hook Vault"><div style={{ fontFamily: T.monoFont, fontSize: 14, color: '#8a857c' }}>482 hooks · 17 new this week</div></Panel>
        <Panel title="Competitor Tracker"><div style={{ fontFamily: T.monoFont, fontSize: 14, color: '#8a857c' }}>8 creators · scraped 6am Sun</div></Panel>
      </div>
    </Mock>
  </AHFrame>,

  // 2 — getting started (prompt)
  <AHFrame variant="cream" justify="center">
    <Title kick="STEP 01 · GETTING STARTED" lead="here is the first prompt to" tail="get started." />
    <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 30, color: '#3a3733', lineHeight: 1.4 }}>open Claude Code, start a new session, paste this. Claude builds the rest.</div>
    <CodeCard title="paste into claude code" width={800} lines={[
      'Build me a content dashboard with six pages:',
      '  Hook Vault    every viral hook I save, templatized',
      '  Analytics     IG views, saves, follows, weekly heaters',
      '  Competitor    top reels from creators I track',
      '  Scheduler     one-click multi-platform posting',
      '  Calendar      auto-filled by /script',
      '  Trending      AI news from 12 sources, tagged',
      '',
      'Next.js + Tailwind + shadcn. dark mode, terracotta accent.',
      'Add a CLAUDE.md documenting the stack + decisions.',
    ]} />
  </AHFrame>,

  // 3 — hook vault
  <AHFrame variant="cream" justify="center">
    <Title kick="PAGE 01 · HOOK VAULT" lead="create a" tail="hook vault." />
    <Mock active={1}>
      <Panel title="482 hooks" right="+17 THIS WEEK">
        <Row left="Stop doing X. Start doing Y." right="38x" tag="SWAP" />
        <Row left="I built [product] in [timeframe]." right="24x" tag="BUILD" />
        <Row left="You need a [tool]. Here is why." right="19x" tag="CLAIM" />
        <Row left="N things I wish I knew before X." right="15x" tag="LIST" />
      </Panel>
    </Mock>
    <CodeCard title="prompt for the hook vault" width={800} lines={[
      'Build the Hook Vault page.',
      'Every hook I save gets transcribed and templatized.',
      'Searchable by niche, hook type, and view count.',
      'Show original creator, views, and a use-this button',
      'that drops the hook straight into /script.',
    ]} />
  </AHFrame>,

  // 4 — analytics
  <AHFrame variant="cream" justify="center">
    <Title kick="PAGE 02 · ANALYTICS" lead="build your" tail="analytics page." />
    <Mock active={2}>
      <div style={{ display: 'flex', gap: 12 }}>
        <StatTile label="IG VIEWS · 7D" value="287.4K" delta="▲ 162%" />
        <StatTile label="SAVES · 7D" value="4,812" delta="▲ 71%" />
        <StatTile label="PROFILE" value="12.6K" delta="▲ 44%" />
      </div>
      <Panel title="Top heaters · 7d">
        <Row left="You need a content dashboard..." right="187K" tag="+312%" />
        <Row left="Stop using Notion for content" right="94K" tag="+201%" />
        <Row left="How I built a /script command" right="52K" tag="+148%" />
      </Panel>
    </Mock>
    <CodeCard title="prompt for the analytics page" width={800} lines={[
      'Build the Analytics page.',
      'Pull IG views, saves, follows, DM volume.',
      'Sparkline per metric over 7 / 30 / 90 days.',
      'Flag any reel that beats my 30-day median by 2x',
      'as a heater. Show the top 5, sorted by views.',
    ]} />
  </AHFrame>,

  // 5 — competitor tracker
  <AHFrame variant="cream" justify="center">
    <Title kick="PAGE 03 · COMPETITOR TRACKER" lead="track your" tail="competitors." />
    <Mock active={3}>
      <Panel title="8 creators tracked" right="SUN 6AM · AUTO">
        <Row left="@dan_koe" right="1.2M" tag="8 new" />
        <Row left="@levelsio" right="478K" tag="6 new" />
        <Row left="@iamevanlong" right="210K" tag="15 new" />
        <Row left="@itstylergermain" right="355K" tag="12 new" />
      </Panel>
    </Mock>
    <CodeCard title="prompt for the competitor tracker" width={800} lines={[
      'Build the Competitor Tracker page.',
      'Every Sunday at 6am, scrape the top 5 reels from',
      'the 8 accounts I follow. Transcribe the audio.',
      'Pull the hook and on-screen text. Sort by views',
      'with a save-to-Hook-Vault button on each.',
    ]} />
  </AHFrame>,

  // 6 — scheduler
  <AHFrame variant="cream" justify="center">
    <Title kick="PAGE 04 · SCHEDULER" lead="build a" tail="scheduler." />
    <Mock active={4}>
      <Panel title="Schedule this reel" right="SCHEDULE ALL">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '6px 0 10px' }}>
          {['Instagram', 'TikTok', 'YT Shorts', 'LinkedIn'].map((p, i) => (
            <span key={p} style={{ fontFamily: T.monoFont, fontSize: 14, color: i < 3 ? '#a8472f' : '#8a857c', background: i < 3 ? 'rgba(232,84,43,0.12)' : 'rgba(20,16,12,0.05)', borderRadius: 6, padding: '5px 11px' }}>{p}</span>
          ))}
        </div>
        <Row left="Mon · May 26 · 7:30 AM ET" right="AUTO" tag="CAPTION" />
        <div style={{ fontFamily: T.monoFont, fontSize: 15, color: '#54504a', marginTop: 10, lineHeight: 1.4 }}>"I built a full content OS in a week with Claude Code..."</div>
      </Panel>
    </Mock>
    <CodeCard title="prompt for the scheduler" width={800} lines={[
      'Build the Scheduler page.',
      'One click and Claude schedules my reel to the',
      'platforms I pick: Instagram, TikTok, YT Shorts.',
      'Auto-generate a caption from hook + angle + CTA.',
      'Use an MCP to handle the actual posting.',
    ]} />
  </AHFrame>,

  // 7 — content calendar
  <AHFrame variant="cream" justify="center">
    <Title kick="PAGE 05 · CONTENT CALENDAR" lead="make a" tail="content calendar." />
    <Mock active={5}>
      <Panel title="May 2026 · everything scheduled" right="8 ITEMS">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginTop: 4 }}>
          {Array.from({ length: 21 }).map((_, i) => {
            const ev: Record<number, [string, string]> = { 2: ['REEL', '#f4d4c8'], 4: ['CAROUSEL', '#cfe6d6'], 7: ['REEL', '#f4d4c8'], 9: ['REEL', '#f4d4c8'], 11: ['CAROUSEL', '#cfe6d6'], 14: ['REEL', '#f4d4c8'], 16: ['REEL', '#f4d4c8'], 18: ['CAROUSEL', '#cfe6d6'] };
            const e = ev[i];
            return <div key={i} style={{ height: 40, borderRadius: 6, border: '1px solid rgba(20,16,12,0.08)', background: e ? e[1] : '#fffdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T.monoFont, fontSize: 10, color: '#54504a' }}>{e ? e[0] : i + 1}</div>;
          })}
        </div>
      </Panel>
    </Mock>
    <CodeCard title="prompt for the content calendar" width={800} lines={[
      'Build the Content Calendar page.',
      'Monthly grid of everything scheduled. Each slot',
      'shows the exact date, time, platform, and hook.',
      'Click any slot to see the full script and caption',
      'in a side panel.',
    ]} />
  </AHFrame>,

  // 8 — what's trending
  <AHFrame variant="cream" justify="center">
    <Title kick="PAGE 06 · WHAT IS TRENDING" lead="surface" tail="what is trending." />
    <Mock active={6}>
      <Panel title="Today's feed · 12 sources" right="5 HOOK-WORTHY">
        <Row left="Claude ships a 1M context window" right="" tag="HOOK" />
        <Row left="Sora 2 leaked benchmarks vs Veo 3" right="" tag="HOOK" />
        <Row left="OpenAI releases new image API tier" right="" tag="EXPLAIN" />
        <Row left="Vercel cuts pricing on AI gateway" right="" tag="EXPLAIN" />
      </Panel>
    </Mock>
    <CodeCard title="prompt for the trending page" width={800} lines={[
      'Build the What is Trending page.',
      'Pull from 12 sources daily: Anthropic, OpenAI,',
      'X lists, niche RSS feeds. Auto-tag each item:',
      'hook potential, explainer, or skip. Surface the',
      'top 5 hook-worthy items, sorted by recency.',
    ]} />
  </AHFrame>,

  // 9 — CTA
  <AHFrame variant="cream" justify="center">
    <div style={{ textAlign: 'center' }}>
      <Disp size={88}>want every prompt I used</Disp>
      <Disp size={88} style={ah.oi}>to build my dashboard?</Disp>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}><CTAPill pre="COMMENT" word="GUIDE" /></div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 31, color: '#3a3733', textAlign: 'center', marginTop: 26, lineHeight: 1.42 }}>comment guide and I will send you every prompt, every module, every screenshot. free.</div>
  </AHFrame>,
];

export const contentDashboardDeck = { id: 'ContentDashboard', title: 'You need a content dashboard, here is how to build it', slides };
