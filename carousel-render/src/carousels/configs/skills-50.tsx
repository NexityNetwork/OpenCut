/** Deck: "50+ Claude Skills" — CTW brand. 7 slides (cover + 6 catalog grids of 8). */
import React from 'react';
import { AHFrame, Disp, Script, Mono, ah, AH_ORANGE } from '../ah-blocks';
import { LogoBadge } from '../deck-icons';
import { carouselTheme as T } from '../theme';
import { SiClaude } from '@icons-pack/react-simple-icons';

const CI = '#161412';
const DISP = T.displayFont;
const PALETTE = ['#ef4444', '#a855f7', '#22c55e', '#3b82f6', '#f59e0b', '#14b8a6', '#06b6d4', '#6b7280'];

type Skill = [name: string, cat: string, desc: string];

const SkillCard: React.FC<{ s: Skill; color: string }> = ({ s, color }) => (
  <div style={{ flex: 1, minWidth: 0, minHeight: 246, background: '#ffffff', border: '1.5px solid rgba(20,16,12,0.10)', borderRadius: 16, padding: '26px 24px 22px', boxShadow: '0 10px 26px rgba(20,16,12,0.06)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, borderTop: `38px solid ${color}`, borderRight: '38px solid transparent' }} />
    <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 30, letterSpacing: '-0.01em', color: CI, lineHeight: 1.04, paddingLeft: 12 }}>{s[0]}<span style={{ color: '#b3aea4' }}>.skill</span></div>
    <span style={{ alignSelf: 'flex-start', fontFamily: T.bodyFont, fontWeight: 700, fontSize: 16, color, background: `${color}1f`, borderRadius: 7, padding: '6px 13px' }}>{s[1]}</span>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 500, fontSize: 20, color: '#54504a', lineHeight: 1.38 }}>{s[2]}</div>
    <div style={{ marginTop: 'auto', height: 3, width: '100%', background: color, borderRadius: 2 }} />
  </div>
);

const Grid: React.FC<{ skills: Skill[] }> = ({ skills }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    {[0, 1, 2, 3].map((row) => (
      <div key={row} style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
        <SkillCard s={skills[row * 2]} color={PALETTE[row * 2]} />
        <SkillCard s={skills[row * 2 + 1]} color={PALETTE[row * 2 + 1]} />
      </div>
    ))}
  </div>
);

const G1: Skill[] = [
  ['Frontend-design', 'UI/UX Design', 'Forces bold modern UI decisions before coding and eliminates generic AI interfaces.'],
  ['Social Media OS', 'Social Media', 'Complete viral content workflow for posts, reels, thumbnails, analytics, and growth.'],
  ['Daydream', 'Creativity', 'Finds hidden connections in your knowledge base through autonomous AI brainstorming.'],
  ['Remotion', 'Video Development', 'Creates cinematic videos programmatically with React animations, captions, and effects.'],
  ['Autoresearch', 'Research Automation', 'Self-improving AI workflow that continuously modifies, verifies, and optimises tasks.'],
  ['Voice Builder', 'Personal Branding', 'Learns your writing voice and creates consistent, non-generic content styles.'],
  ['Reels Scripting', 'Short-Form Content', 'Reverse-engineers viral reels and rewrites them naturally in your own style.'],
  ['Post Scorer', 'Content Analytics', 'Scores drafts using your past performance data before you ever publish.'],
];
const G2: Skill[] = [
  ['YouTube Thumbnail', 'Thumbnail Design', 'Generates optimised thumbnail prompts designed to maximise clicks and curiosity.'],
  ['Hook Generator', 'Copywriting', 'Creates scroll-stopping hooks using proven marketing and storytelling frameworks.'],
  ['Humanizer', 'Writing Enhancement', 'Removes robotic AI writing patterns and makes content feel naturally human.'],
  ['Notebook LLM', 'Knowledge Repurposing', 'Turns articles, PDFs, and videos into podcasts, quizzes, and presentations.'],
  ['Beautiful Prose', 'Writing Style', 'Produces sharp, timeless prose without fluff, filler, or obvious AI patterns.'],
  ['Tweetclaw', 'Personal Branding', 'Advanced Twitter toolkit for posting, monitoring, extracting, and scheduling.'],
  ['X Article Publisher', 'Publishing Automation', 'Publishes long-form articles to X with proper formatting and threading.'],
  ['Color Expert', 'Design & Visuals', 'Color-science system for palettes, accessibility, contrast, and visual harmony.'],
];
const G3: Skill[] = [
  ['Drawn Diagrams', 'Visual Communication', 'Generates memorable hand-drawn diagrams and flowcharts with animated aesthetics.'],
  ['Claudedesign', '3D & Motion Design', 'Toolkit for cinematic motion graphics, 3D scenes, animations, and visuals.'],
  ['Design Auditor', 'Design Analysis', 'Audits interfaces using pro rules for typography, spacing, and consistency.'],
  ['Kim Barrett suite', 'Marketing Copywriting', 'Direct-response toolkit for headlines, offers, objections, and conversion.'],
  ['Nothing Design', 'UI Design', 'Creates sleek monochrome interfaces inspired by Nothing industrial design.'],
  ['GPT Image 2', 'AI Image Generation', 'Advanced image generation with reasoning modes, editing tools, and presets.'],
  ['Canvas Design', 'Graphic Design', 'Creates polished posters, graphics, and artistic visuals using modern aesthetics.'],
  ['Algorithmic Art', 'Generative Art', 'Produces procedural artwork using particles, flow fields, and seeded randomness.'],
];
const G4: Skill[] = [
  ['Wondelai Skills', 'Product Strategy', 'Framework-based skills covering UX, marketing, sales, growth, and conversion.'],
  ['Marketing.skills', 'Content Marketing', 'Covers SEO, ad creatives, growth systems, analytics, and short-form strategy.'],
  ['Email Marketing', 'Email Marketing', 'Complete system for segmentation, deliverability, lifecycle flows, and retention.'],
  ['Twitter Optimizer', 'Social Media', 'Rewrites tweets using real algorithm insights to maximise reach and engagement.'],
  ['Competitive Ads', 'Ad Research', 'Extracts competitor ads and analyses messaging patterns for better campaigns.'],
  ['Deep Research', 'Deep Research', 'Multi-stage research engine with source verification and intelligence pipelines.'],
  ['Academic Research', 'Academic Writing', 'End-to-end academic workflow with revisions, style calibration, and detection.'],
  ['Marketing Module', 'Marketing System', 'A huge collection of SEO, growth, sales, CRO, and content automation tools.'],
];
const G5: Skill[] = [
  ['Evidence dialogue', 'Critical Thinking', 'Replaces AI sycophancy with structured analysis, debates, and reasoning.'],
  ['SM Research', 'Social Media Research', 'Tracks public opinion and trends using real Reddit and Twitter discussions.'],
  ['PM Skills', 'Product Management', 'Massive toolkit for product discovery, strategy, execution, pricing, and growth.'],
  ['JTBD Interview Tool', 'Customer Research', 'Turns customer interviews into structured insights and Jobs-To-Be-Done frameworks.'],
  ['AI Transformation', 'AI Consulting', 'AI consulting framework for finding automation opportunities and readiness.'],
  ['AI Video Toolkit', 'Video Production', 'Full AI-native video production workflow from scripting to rendering MP4s.'],
  ['AI Music Album', 'AI Music Production', 'End-to-end music production: lyrics, mixing, mastering, and release workflows.'],
  ['Generative Media', 'Multi-Modal AI', 'Cross-platform toolkit for generating AI image, video, and audio content.'],
];
const G6: Skill[] = [
  ['Superpowers', 'Software Engineering', 'Makes Claude think, plan, test, execute, and review like a senior engineer.'],
  ['Repomix', 'Codebase Management', 'Compresses entire repositories into AI-friendly formats for large-scale analysis.'],
  ["Antfu's Skills", 'Developer Toolkit', 'Curated production-grade engineering skills from a top open-source developer.'],
  ['GEO/SEO Claude', 'AI SEO Optimization', 'Optimises content for AI search visibility, citations, authority, and reach.'],
  ['Dev Browser', 'Browser Automation', 'Gives AI autonomous web browsing for QA, automation, and online research.'],
  ['Vexor Search', 'Semantic Search', 'Vector-powered search that intelligently finds files and hidden context.'],
  ['Skill Seekers', 'Skill Generation', 'Turns docs, repos, and PDFs into reusable Claude-compatible AI skills.'],
  ['Web Scraper', 'Web Automation', 'Intelligent multi-strategy scraping with validation, stealth, and API detection.'],
];

const Chip: React.FC<{ t: string }> = ({ t }) => (
  <span style={{ fontFamily: T.bodyFont, fontWeight: 700, fontSize: 24, color: '#f3efe6', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '12px 22px' }}>{t}</span>
);

const slides: React.ReactNode[] = [
  // 1 — cover
  <AHFrame variant="dark" justify="center">
    <div style={{ display: 'flex', justifyContent: 'center' }}><LogoBadge Icon={SiClaude} color={AH_ORANGE} chip="#faf7f0" box={120} /></div>
    <div style={{ textAlign: 'center' }}>
      <Disp size={92}>50+ <span style={ah.oi}>Claude</span></Disp>
      <Disp size={150}>Skills.</Disp>
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 14 }}>
      {['AI Content', 'Social Media', 'Reels', 'Prompting', 'Design', 'Research'].map((t) => <Chip key={t} t={t} />)}
    </div>
    <Script size={46} color="#cfcabf">plug-and-play. drop them straight into Claude Code.</Script>
  </AHFrame>,

  <AHFrame variant="cream" justify="center"><Grid skills={G1} /></AHFrame>,
  <AHFrame variant="cream" justify="center"><Grid skills={G2} /></AHFrame>,
  <AHFrame variant="cream" justify="center"><Grid skills={G3} /></AHFrame>,
  <AHFrame variant="cream" justify="center"><Grid skills={G4} /></AHFrame>,
  <AHFrame variant="cream" justify="center"><Grid skills={G5} /></AHFrame>,
  <AHFrame variant="cream" justify="center"><Grid skills={G6} /></AHFrame>,
];

export const skills50Deck = { id: 'Skills50', title: '50+ Claude Skills, plug and play', slides };
