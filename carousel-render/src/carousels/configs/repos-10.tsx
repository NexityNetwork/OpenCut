/** Deck: "10 GitHub repos that shouldn't be free" — CTW brand. 12 slides. */
import React from 'react';
import { AHFrame, Disp, Mono, CTAPill, ah } from '../ah-blocks';
import { carouselTheme as T } from '../theme';
import { Kick, Callout, CI, DISP, AH_ORANGE, BrowserMock } from '../wipf-kit';
import { SiGithub } from '@icons-pack/react-simple-icons';

const OrgBadge: React.FC<{ ch: string }> = ({ ch }) => (
  <div style={{ width: 46, height: 46, borderRadius: '50%', background: '#161412', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
    <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 24, color: '#fff' }}>{ch}</span>
  </div>
);
const Tag: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <span style={{ fontFamily: T.monoFont, fontSize: 19, color: '#54504a', background: 'rgba(20,16,12,0.05)', borderRadius: 8, padding: '8px 14px' }}>
    <span style={{ color: AH_ORANGE, fontWeight: 700 }}>{k}</span> {v}
  </span>
);

type Repo = { n: string; org: string; ch: string; title: React.ReactNode; desc: string; url: string; tagline: string; stars: string; label: string; value: string };
const REPOS: Repo[] = [
  { n: '01', org: 'browser-use/', ch: 'B', title: <>give your agent a <span style={ah.oi}>real browser.</span></>, desc: 'Claude, Codex, or Cursor stop pretending to browse and actually click, scroll, fill forms, and work through live sites.', url: 'browser-use.com', tagline: 'the way AI uses the web.', stars: '95k', label: 'KILLS', value: 'browser RPA SaaS' },
  { n: '02', org: 'OpenHands/', ch: 'O', title: <>an open coding <span style={ah.oi}>operator.</span></>, desc: 'A full AI-driven dev agent you can self-host instead of paying for another black-box coding seat with tighter limits.', url: 'github.com/OpenHands', tagline: 'AI-driven development.', stars: '75k', label: 'FEELS', value: 'copilot on steroids' },
  { n: '03', org: 'langgenius/', ch: 'D', title: <>build AI apps <span style={ah.oi}>without glue code.</span></>, desc: 'Dify gives you workflows, prompts, tools, retrieval, eval, and deployment in one repo. honestly should be a paid platform.', url: 'dify.ai', tagline: 'production-ready agentic workflow.', stars: '140k', label: 'REPLACES', value: '3 to 5 AI tools' },
  { n: '04', org: 'open-webui/', ch: 'W', title: <>a chatgpt-style UI, <span style={ah.oi}>yours forever.</span></>, desc: 'The team AI workspace people keep paying monthly for, even though this repo gives you the self-hosted version.', url: 'github.com/open-webui', tagline: 'a user-friendly AI interface.', stars: '139k', label: 'KILLS', value: 'hosted AI UI fees' },
  { n: '05', org: 'unclecode/', ch: 'C', title: <>make the web <span style={ah.oi}>LLM-ready.</span></>, desc: 'Crawl4AI is absurdly useful for agents, research, and RAG. it strips the web into something models can actually use.', url: 'crawl4ai.com', tagline: 'open-source, LLM-friendly crawler.', stars: '50k', label: 'KILLS', value: 'expensive extract APIs' },
  { n: '06', org: 'getmaxun/', ch: 'M', title: <>turn websites into <span style={ah.oi}>structured APIs.</span></>, desc: 'Maxun feels illegal: scraping, crawling, screenshots, and extraction in one no-code open-source system.', url: 'maxun.dev', tagline: 'websites into structured APIs.', stars: '15k', label: 'FEELS', value: 'too cheap to exist' },
  { n: '07', org: 'coollabsio/', ch: 'K', title: <>your own Vercel, <span style={ah.oi}>Heroku, Netlify.</span></>, desc: 'Coolify makes hosted deployment pricing look way less magical once you realize you can self-host the same layer.', url: 'coolify.io', tagline: 'self-host anything.', stars: '56k', label: 'KILLS', value: 'deploy lock-in' },
  { n: '08', org: 'supabase/', ch: 'S', title: <>backend, auth, <span style={ah.oi}>storage, realtime.</span></>, desc: 'The repo people use when they realize one paid backend product can quietly turn into five bills at once.', url: 'supabase.com', tagline: 'build in a weekend, scale to millions.', stars: '100k', label: 'REPLACES', value: 'half a backend stack' },
  { n: '09', org: 'Stirling-Tools/', ch: 'P', title: <>PDF superpowers. <span style={ah.oi}>no Adobe tax.</span></>, desc: 'Merge, split, OCR, convert, sign, compress. one of those repos that makes paid utility subscriptions feel silly.', url: 'stirling-pdf', tagline: '60+ PDF tools, self-hosted.', stars: '70k', label: 'KILLS', value: 'pdf subscription bloat' },
  { n: '10', org: 'langflow-ai/', ch: 'L', title: <>AI workflows, <span style={ah.oi}>APIs, and MCP.</span></>, desc: 'A visual AI stack with enough orchestration power to feel like a paid platform that leaked onto GitHub.', url: 'langflow.org', tagline: 'stop fighting your tools.', stars: '149k', label: 'FEELS', value: 'enterprise for free' },
];

const RepoSlide = (r: Repo): React.ReactNode => (
  <AHFrame variant="cream" justify="center">
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <span style={{ fontFamily: DISP, fontWeight: 800, fontStyle: 'italic', fontSize: 96, color: AH_ORANGE, lineHeight: 0.9 }}>{r.n}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <OrgBadge ch={r.ch} /><span style={{ fontFamily: T.monoFont, fontSize: 26, color: '#54504a' }}>{r.org}</span>
        </div>
      </div>
      <Disp size={78} style={{ marginTop: 2 }}>{r.title}</Disp>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 31, color: '#3a3733', lineHeight: 1.38, marginTop: 16 }}>{r.desc}</div>
    </div>
    <BrowserMock url={r.url} stars={r.stars}>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 46, color: '#f6f4ef', lineHeight: 1.1 }}>{r.tagline}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 22 }}>
        <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 22, color: '#fff', background: AH_ORANGE, borderRadius: 8, padding: '10px 22px' }}>Get Started</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: T.monoFont, fontSize: 18, color: '#8a8a92' }}><SiGithub size={20} color="#8a8a92" /> open source</span>
      </div>
    </BrowserMock>
    <div style={{ display: 'flex', gap: 12 }}><Tag k="REPO" v={`${r.stars}+ stars`} /><Tag k={r.label} v={r.value} /></div>
  </AHFrame>
);

const slides: React.ReactNode[] = [
  // cover
  <AHFrame variant="dark" justify="center">
    <div>
      <Kick label="THE OPEN SOURCE STACK" />
      <Disp size={104} style={{ marginTop: 14 }}>10 GitHub repos</Disp>
      <Disp size={104} style={ah.oi}>that should not be free.</Disp>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 32, color: '#cfcabf', marginTop: 18 }}>the open-source stack killing expensive subscriptions.</div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}><SiGithub size={120} color="#f3efe6" /></div>
  </AHFrame>,
  ...REPOS.map(RepoSlide),
  // CTA
  <AHFrame variant="cream" justify="center">
    <div style={{ textAlign: 'center' }}>
      <Disp size={104}>comment <span style={ah.oi}>unlock</span></Disp>
      <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 46, color: CI, marginTop: 6 }}>for the guide.</div>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}><CTAPill pre="COMMENT" word="UNLOCK" /></div>
    <Callout>I will send the install, setup, and usage guide for all 10 repos. free.</Callout>
  </AHFrame>,
];

export const repos10Deck = { id: 'Repos10', title: '10 GitHub repos that shouldnt be free, the open-source stack', slides };
