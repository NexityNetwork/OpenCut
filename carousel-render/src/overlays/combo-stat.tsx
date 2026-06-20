/** Reel overlay: Claude + Ultron + Maps, with a daily-numbers block under the
 * logos in outlined white text. No emojis, no dollar signs. Text is swappable. */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DISP } from './kit';
import { ClaudeTile, UltronTile, MapsTile, Plus } from './logos';

const TILE = 198;
const TS = '0 3px 16px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.85)';

const HEADLINE = 'My day, every day';
const LINES = ['100 calls', '95 said no', '5 said yes', '5 x 500 = 2,500', '2,500 for the day'];

export const ComboStatOverlay: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: DISP }}>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 36px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <ClaudeTile size={TILE} />
        <Plus size={74} />
        <UltronTile size={TILE} />
        <Plus size={74} />
        <MapsTile size={TILE} />
      </div>
      <div style={{ marginTop: 44, textAlign: 'center' }}>
        <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 66, color: '#fff', textShadow: TS, letterSpacing: -1 }}>{HEADLINE}</div>
        {LINES.map((l) => (
          <div key={l} style={{ fontFamily: DISP, fontWeight: 700, fontSize: 54, color: '#fff', textShadow: TS, letterSpacing: -0.5, marginTop: 12 }}>{l}</div>
        ))}
      </div>
    </div>
  </AbsoluteFill>
);
