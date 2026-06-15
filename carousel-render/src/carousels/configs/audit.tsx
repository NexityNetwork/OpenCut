/** Deck: "I gave Claude access to all of my competitors" — CTW brand. 9 slides. */
import React from 'react';
import { AHFrame, Disp, Mono, CTAPill, ah } from '../ah-blocks';
import { CodeCard } from '../feature-blocks';
import { carouselTheme as T } from '../theme';
import { Kick, Callout, CI, DISP, AH_ORANGE, BrowserMock } from '../wipf-kit';

const Stat: React.FC<{ n: string; label: string; sub: string }> = ({ n, label, sub }) => (
  <div style={{ flex: 1, background: '#141416', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 24px' }}>
    <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 72, color: AH_ORANGE, lineHeight: 1 }}>{n}</div>
    <Mono size={16} color="rgba(243,239,230,0.5)" style={{ marginTop: 8 }}>{label}</Mono>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 22, color: '#cfcabf', marginTop: 8, lineHeight: 1.3 }}>{sub}</div>
  </div>
);
const tiles = ['#141416', '#e8542b', '#1e2a3a', '#1d4a36', '#4b2d6b', '#141416', '#1e2a3a', '#e8542b'];

const slides: React.ReactNode[] = [
  // 1 cover
  <AHFrame variant="cream" justify="center">
    <div>
      <Kick label="ISSUE 02 · COMPETITOR INTEL" />
      <Disp size={104} style={{ marginTop: 14 }}>I gave Claude access to all of my <span style={ah.oi}>competitors.</span></Disp>
      <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontStyle: 'italic', fontSize: 32, color: '#3a3733', marginTop: 14 }}>2,847 reels. 1,143 carousels. 318 YouTube videos.</div>
    </div>
    <BrowserMock url="content-os.local / library" dark={false}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1].map((row) => (
          <div key={row} style={{ display: 'flex', gap: 10 }}>
            {tiles.slice(row * 4, row * 4 + 4).map((c, i) => (
              <div key={i} style={{ flex: 1, height: 70, borderRadius: 10, background: c, display: 'flex', alignItems: 'flex-end', padding: 8 }}>
                <span style={{ fontFamily: T.monoFont, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>{['1.2M', '840K', '612K', '488K', '391K', '274K', '219K', '188K'][row * 4 + i]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </BrowserMock>
  </AHFrame>,
  // 2 every word every frame
  <AHFrame variant="dark" justify="center">
    <div><Mono size={22} color={AH_ORANGE}>SLIDE 02</Mono><Disp size={92} style={{ marginTop: 10 }}>every word. every frame. <span style={ah.oi}>one file.</span></Disp></div>
    <div style={{ display: 'flex', gap: 16 }}>
      <Stat n="2,847" label="REELS" sub="hook, frame, CTA. every clip transcribed." />
      <Stat n="1,143" label="CAROUSELS" sub="every slide vision-coded. text extracted." />
      <Stat n="318" label="YOUTUBE" sub="long-form parsed. hooks and beats mapped." />
    </div>
    <Callout dark>every viral post in my niche. transcribed. coded. queryable. 4,308 rows, live.</Callout>
  </AHFrame>,
  // 3 same hook
  <AHFrame variant="cream" justify="center">
    <div><Mono size={22} color={AH_ORANGE}>SLIDE 03</Mono><Disp size={86} style={{ marginTop: 10 }}><span style={ah.oi}>15%</span> of my niche uses the same hook.</Disp></div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[0, 1].map((row) => (
        <div key={row} style={{ display: 'flex', gap: 12 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ flex: 1, background: (row * 5 + i) % 3 === 0 ? '#161412' : '#ffffff', border: '1px solid rgba(20,16,12,0.12)', borderRadius: 10, padding: '20px 8px', textAlign: 'center' }}>
              <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 18, color: (row * 5 + i) % 3 === 0 ? '#fff' : CI }}>"What if..."</span>
            </div>
          ))}
        </div>
      ))}
    </div>
    <Callout>same opener, 600+ posts. the opener is not the moat. the execution is.</Callout>
  </AHFrame>,
  // 4 locked out
  <AHFrame variant="dark" justify="center">
    <div><Mono size={22} color={AH_ORANGE}>SLIDE 04</Mono><Disp size={88} style={{ marginTop: 10 }}>every AI tool is <span style={ah.oi}>locked out</span> of IG and YT.</Disp></div>
    <CodeCard title="~/test · zsh" width={800} lines={[
      '$ claude "summarize this reel"',
      '  ERROR 401  unable to fetch instagram media',
      '$ chatgpt "analyze this reel"',
      '  this URL cannot be accessed',
      '$ claude "read this caption"',
      '  ok: caption only. no video. no audio. no frames.',
    ]} />
    <Callout dark>captions only. the actual content stays invisible.</Callout>
  </AHFrame>,
  // 5 the unlock
  <AHFrame variant="cream" justify="center">
    <div><Mono size={22} color={AH_ORANGE}>SLIDE 05</Mono><Disp size={92} style={{ marginTop: 10 }}>the <span style={ah.oi}>unlock.</span></Disp></div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: 34, color: '#3a3733', lineHeight: 1.4 }}>the platforms hand the data out for free. you just have to ask the right endpoint instead of pasting a link.</div>
    <Callout>give Claude the official APIs, and the whole niche becomes readable.</Callout>
  </AHFrame>,
  // 6 step one
  <AHFrame variant="dark" justify="center">
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontStyle: 'italic', fontSize: 36, color: AH_ORANGE }}>step one.</div>
    <Disp size={96}>free <span style={ah.oi}>API tokens.</span></Disp>
    <CodeCard title="~/.config/competitors.env" width={800} lines={[
      '# Meta API   developers.facebook.com',
      'META_API_TOKEN="EAAxxxxx..."',
      '# YouTube Data API   console.cloud.google.com',
      'YT_API_KEY="AIzaSyA..."',
      '# Anthropic   console.anthropic.com',
      'ANTHROPIC_API_KEY="sk-ant-..."',
    ]} />
    <Callout dark>30 seconds each. all three free for the volume you need.</Callout>
  </AHFrame>,
  // 7 step two
  <AHFrame variant="cream" justify="center">
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontStyle: 'italic', fontSize: 36, color: AH_ORANGE }}>step two.</div>
    <Disp size={96}>pull and <span style={ah.oi}>transcribe.</span></Disp>
    <CodeCard title="pull.py" width={800} lines={[
      '# for each competitor handle',
      'media = meta.get_media(handle)        # reels + carousels',
      'videos = youtube.list(channel_id)     # long-form',
      'for m in media + videos:',
      '    text = claude.transcribe(m)       # words + on-screen',
      '    db.insert(handle, m.type, text, m.views)',
    ]} />
    <Callout>every reel, carousel, and video, turned into searchable text.</Callout>
  </AHFrame>,
  // 8 step three
  <AHFrame variant="dark" justify="center">
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontStyle: 'italic', fontSize: 36, color: AH_ORANGE }}>step three.</div>
    <Disp size={96}>query <span style={ah.oi}>your niche.</span></Disp>
    <CodeCard title="~/test · zsh" width={800} lines={[
      '$ claude "what hook gets the most views in my niche?"',
      '  -> "What if [contrarian take]"  ·  14.2M total',
      '$ claude "what do the top 10 reels have in common?"',
      '  -> short hook, fast cut at 0.8s, one CTA',
      '$ claude "write me 10 in that format"',
      '  ok: drafting 10 hooks...',
    ]} />
    <Callout dark>ask your whole niche anything. get the pattern back in seconds.</Callout>
  </AHFrame>,
  // 9 CTA
  <AHFrame variant="cream" justify="center">
    <Disp size={86}>every viral pattern, <span style={ah.oi}>mapped.</span></Disp>
    <div style={{ background: '#ffffff', border: '1.5px solid rgba(20,16,12,0.12)', borderRadius: 16, padding: '22px 26px', boxShadow: '0 14px 34px rgba(20,16,12,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><Mono size={15} color="#8a857c">HOOK STRUCTURE</Mono><Mono size={15} color="#8a857c">TOTAL VIEWS</Mono></div>
      {[['What if [contrarian take]', '14.2M'], ['I gave Claude [thing]', '9.8M'], ['Most [audience] do this wrong', '6.1M'], ['Stop using [tool]. Use [tool]', '4.7M'], ['X a month on [tool]. Build it', '3.4M']].map(([h, v], i) => (
        <div key={h} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <span style={{ fontFamily: T.monoFont, fontSize: 21, color: '#3a3733' }}><span style={{ color: '#b3aea4' }}>{`0${i + 1} `}</span>{h}</span>
          <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 22, color: AH_ORANGE }}>{v}</span>
        </div>
      ))}
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}><CTAPill pre="COMMENT" word="AUDIT" /></div>
    <div style={{ fontFamily: T.bodyFont, fontWeight: 700, fontStyle: 'italic', fontSize: 26, color: '#8a857c', textAlign: 'center' }}>ps. Claude made this carousel too.</div>
  </AHFrame>,
];
export const auditDeck = { id: 'Audit', title: 'I gave Claude access to all of my competitors', slides };
