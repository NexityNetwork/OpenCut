/** Deck: "I replaced my entire marketing agency with Claude Code + Meta" — CTW brand. 8 slides. */
import React from 'react';
import { AHFrame, Disp, Mono, CTAPill, ah } from '../ah-blocks';
import { IconBadge, LogoBadge } from '../deck-icons';
import { carouselTheme as T } from '../theme';
import { Kick, Callout, CI, DISP, AH_ORANGE } from '../wipf-kit';
import { SiClaude, SiMeta } from '@icons-pack/react-simple-icons';
import { Megaphone, BarChart3, SlidersHorizontal, Users, Terminal } from 'lucide-react';

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
type Cap = { n: string; Icon: LucideIcon; name: string; replaces: string; desc: string; points: [string, string][]; dark: boolean };
const CAPS: Cap[] = [
  { n: '01', Icon: Megaphone, name: 'Campaign Creation', replaces: 'your 5k a month media buyer', desc: 'full read/write to your Meta Ads account. spin up complete funnel campaigns from a Claude chat, no Ads Manager.', dark: true,
    points: [['full funnels in one prompt', 'TOFU, MOFU, BOFU wired in one thread'], ['every ad format', 'image, video, carousel. Claude writes the copy']] },
  { n: '02', Icon: BarChart3, name: 'Reporting & Insights', replaces: 'your analytics hire', desc: 'real-time metrics pulled straight into chat. spend, ROAS, CTR, and CPA without ever opening Ads Manager.', dark: false,
    points: [['ask in plain English', 'which ad set has the best ROAS this week?'], ['daily digest', 'the numbers that matter, summarised']] },
  { n: '03', Icon: SlidersHorizontal, name: 'Budget Control', replaces: 'your daily ops manager', desc: 'pause underperformers, scale winners, reallocate budget by name, by metric, by chat. real-time write access.', dark: true,
    points: [['pause losers automatically', 'pause anything below 1.5 ROAS, in one message'], ['scale winners on the fly', 'double budgets on top performers, no dashboard']] },
  { n: '04', Icon: Users, name: 'Audience Building', replaces: 'your audience strategist', desc: 'build custom and lookalike audiences from a single prompt, then save and reuse them across every campaign.', dark: false,
    points: [['describe the buyer', 'Claude builds the audience to match'], ['lookalikes on tap', 'seed it once, scale it everywhere']] },
  { n: '05', Icon: Terminal, name: 'Meta CLI', replaces: 'every tab you keep open', desc: 'terminal-native ad ops, right inside Claude Code. run, check, and adjust your whole account from the command line.', dark: true,
    points: [['ad ops as commands', 'launch, pause, and report without the UI'], ['scriptable', 'turn any routine into a one-liner']] },
];

const CapSlide = (c: Cap): React.ReactNode => {
  const sub = c.dark ? '#cfcabf' : '#3a3733';
  return (
    <AHFrame variant={c.dark ? 'dark' : 'cream'} justify="center">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <IconBadge Icon={c.Icon} dark={c.dark} solid box={84} />
          <Mono size={22} color={AH_ORANGE}>{`ITEM ${c.n} / 05`}</Mono>
        </div>
        <Disp size={76} style={{ marginTop: 14 }}>{c.name}</Disp>
        <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontStyle: 'italic', fontSize: 32, color: AH_ORANGE, marginTop: 8 }}>replaces {c.replaces}.</div>
      </div>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 31, color: sub, lineHeight: 1.38 }}>{c.desc}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {c.points.map(([h, d]) => (
          <div key={h} style={{ background: c.dark ? '#17140f' : '#ffffff', border: c.dark ? '1px solid rgba(255,255,255,0.07)' : '1.5px solid rgba(20,16,12,0.12)', borderRadius: 14, padding: '18px 24px', boxShadow: c.dark ? 'none' : '0 12px 30px rgba(20,16,12,0.06)' }}>
            <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 30, color: c.dark ? '#f3efe6' : CI }}>{h}</div>
            <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 24, color: sub, marginTop: 4 }}>{d}</div>
          </div>
        ))}
      </div>
    </AHFrame>
  );
};

const slides: React.ReactNode[] = [
  <AHFrame variant="dark" justify="center">
    <Kick label="CLAUDE x META · OFFICIAL MCP" />
    <Disp size={104}>I replaced my entire</Disp>
    <Disp size={104} style={ah.oi}>marketing agency.</Disp>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
      <LogoBadge Icon={SiClaude} color="#D97757" chip="#faf7f0" box={72} /><span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 44, color: '#f3efe6' }}>+</span><LogoBadge Icon={SiMeta} color="#0467DF" chip="#faf7f0" box={72} />
    </div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 30, color: '#cfcabf' }}>using Claude Code and Meta. swipe to see all 5, free.</div>
  </AHFrame>,
  <AHFrame variant="cream" justify="center">
    <div><Kick label="ONE INSTALL" /><Disp size={92} style={{ marginTop: 12 }}>replaces <span style={ah.oi}>10k a month.</span></Disp></div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[['01', 'Campaign Creation'], ['02', 'Reporting & Insights'], ['03', 'Budget Control'], ['04', 'Audience Building'], ['05', 'Meta CLI']].map(([n, t]) => (
        <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 18, borderBottom: '1.5px solid rgba(20,16,12,0.1)', paddingBottom: 14 }}>
          <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 34, color: AH_ORANGE, width: 56 }}>{n}</span>
          <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 38, color: CI, flex: 1 }}>{t}</span>
          <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 22, color: '#3a9d6b' }}>Live</span>
        </div>
      ))}
    </div>
  </AHFrame>,
  ...CAPS.map(CapSlide),
  <AHFrame variant="dark" justify="center">
    <div style={{ textAlign: 'center' }}>
      <Disp size={100}>want the full</Disp>
      <Disp size={100} style={ah.oi}>workflow?</Disp>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}><CTAPill pre="COMMENT" word="META" /></div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 30, color: '#cfcabf', textAlign: 'center', marginTop: 22 }}>comment META and I will send you the full setup.</div>
  </AHFrame>,
];
export const metaMcpDeck = { id: 'MetaMcp', title: 'I replaced my marketing agency with Claude Code and Meta', slides };
