/** Deck: "Someone just built an App Store for Claude Code" — CTW brand. 3 slides. */
import React from 'react';
import { AHFrame, Disp, Mono, CTAPill, ah, AH_ORANGE } from '../ah-blocks';
import { IconBadge, LogoBadge } from '../deck-icons';
import { carouselTheme as T } from '../theme';
import { SiClaude } from '@icons-pack/react-simple-icons';
import { Globe, BarChart3, GitBranch, Boxes, FileCheck2, Database, Star, Bot, Terminal, Webhook, Settings, Plug, GitPullRequest, Search, Sparkles } from 'lucide-react';

const CI = '#161412';
const DISP = T.displayFont;
const GREEN = '#3ECF8E';
type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const Kick: React.FC<{ label: string }> = ({ label }) => <Mono size={23} color={AH_ORANGE}>{label}</Mono>;

const StoreTile: React.FC<{ Icon: LucideIcon; name: string; desc: string }> = ({ Icon, name, desc }) => (
  <div style={{ flex: 1, background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 16px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <IconBadge Icon={Icon} dark box={52} />
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 25, color: '#f6f4ef', lineHeight: 1.05 }}>{name}</div>
    </div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 500, fontSize: 17, color: '#9a958c', lineHeight: 1.3, marginTop: 10 }}>{desc}</div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10 }}>
      {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={13} color={AH_ORANGE} fill={AH_ORANGE} />)}
      <span style={{ fontFamily: T.monoFont, fontSize: 14, color: '#6f6a62', marginLeft: 4 }}>free</span>
    </div>
  </div>
);

const AppStoreMock: React.FC = () => (
  <div style={{ background: '#0e0e10', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 22, padding: 22, boxShadow: '0 30px 70px rgba(0,0,0,0.4)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
      <LogoBadge Icon={SiClaude} color={AH_ORANGE} chip="#faf7f0" box={56} />
      <div>
        <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 28, color: '#f6f4ef', lineHeight: 1 }}>Claude Code</div>
        <div style={{ fontFamily: T.monoFont, fontSize: 16, color: '#8a8a92' }}>app store</div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: '#17171a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 999, padding: '8px 16px' }}>
        <Search size={16} color="#6f6a62" /><span style={{ fontFamily: T.monoFont, fontSize: 15, color: '#6f6a62' }}>search components</span>
      </div>
    </div>
    <div style={{ display: 'flex', gap: 12 }}>
      <StoreTile Icon={Globe} name="Web Scraper" desc="multi-strategy scraping, stealth + API detection" />
      <StoreTile Icon={BarChart3} name="Data Analyzer" desc="analyse and visualise your data instantly" />
      <StoreTile Icon={GitBranch} name="Git Assistant" desc="supercharge your git workflow" />
    </div>
    <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
      <StoreTile Icon={Boxes} name="API Builder" desc="build and ship real APIs in minutes" />
      <StoreTile Icon={FileCheck2} name="Code Reviewer" desc="get AI-powered code reviews" />
      <StoreTile Icon={Database} name="Database Toolkit" desc="manage, query, and optimise databases" />
    </div>
  </div>
);

const Feature: React.FC<{ Icon: LucideIcon; text: string }> = ({ Icon, text }) => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 16, background: '#ffffff', border: '1.5px solid rgba(20,16,12,0.12)', borderRadius: 14, padding: '18px 20px', boxShadow: '0 12px 30px rgba(20,16,12,0.06)' }}>
    <IconBadge Icon={Icon} box={56} />
    <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 27, letterSpacing: '-0.01em', color: CI, lineHeight: 1.05 }}>{text}</span>
  </div>
);

const Stat: React.FC<{ n: string; label: string }> = ({ n, label }) => (
  <div style={{ flex: 1, background: 'rgba(232,84,43,0.10)', border: `2px solid ${AH_ORANGE}`, borderRadius: 16, padding: '20px 18px', textAlign: 'center' }}>
    <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 54, color: AH_ORANGE, lineHeight: 1 }}>{n}</div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 21, color: '#54504a', marginTop: 8 }}>{label}</div>
  </div>
);

const slides: React.ReactNode[] = [
  // 1 — cover
  <AHFrame variant="dark" justify="center">
    <div>
      <Kick label="OPEN SOURCE DROP" />
      <Disp size={86} style={{ marginTop: 14 }}>someone just built an <span style={ah.oi}>app store</span> for Claude Code.</Disp>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 32, color: GREEN, marginTop: 16 }}>and it is 100% free and open source.</div>
    </div>
    <AppStoreMock />
  </AHFrame>,

  // 2 — what's inside
  <AHFrame variant="cream" justify="center">
    <div>
      <Kick label="WHAT IS INSIDE" />
      <Disp size={96} style={{ marginTop: 12 }}>a whole <span style={ah.oi}>library.</span></Disp>
    </div>
    <div style={{ display: 'flex', gap: 16 }}>
      <Feature Icon={Bot} text="1,000+ AI agents" />
      <Feature Icon={Sparkles} text="ready-to-use skills" />
    </div>
    <div style={{ display: 'flex', gap: 16 }}>
      <Feature Icon={Terminal} text="custom commands" />
      <Feature Icon={Webhook} text="hooks that auto-fire" />
    </div>
    <div style={{ display: 'flex', gap: 16 }}>
      <Feature Icon={Settings} text="settings + guardrails" />
      <Feature Icon={Plug} text="MCP integrations" />
    </div>
    <div style={{ display: 'flex', gap: 16 }}>
      <Stat n="845" label="skills" />
      <Stat n="421" label="agents" />
      <Stat n="261" label="commands" />
      <Stat n="86" label="MCPs" />
    </div>
  </AHFrame>,

  // 3 — CTA
  <AHFrame variant="dark" justify="center">
    <div style={{ display: 'flex', justifyContent: 'center' }}><IconBadge Icon={GitPullRequest} solid box={132} size={66} /></div>
    <div style={{ textAlign: 'center' }}>
      <Disp size={92}>install your whole setup</Disp>
      <Disp size={92} style={ah.oi}>with one command.</Disp>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}><CTAPill pre="COMMENT" word="CLAUDE" /></div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 30, color: '#cfcabf', textAlign: 'center', marginTop: 26, lineHeight: 1.4 }}>comment Claude and I will send you the link to the free, open-source library.</div>
  </AHFrame>,
];

export const appStoreClaudeDeck = { id: 'AppStoreClaude', title: 'Someone just built an app store for Claude Code', slides };
