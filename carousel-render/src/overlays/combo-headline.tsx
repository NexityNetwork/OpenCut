/** Reel overlay: a headline over three labeled brand tiles (Claude + Ultron +
 * Maps). Outlined white text, no emojis. */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DISP } from './kit';
import { ClaudeTile, UltronTile, MapsTile, Plus } from './logos';

const TILE = 192;
const TS = '0 3px 16px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.85)';

const HEADLINE = 'This feels like bitcoin in 2009';

const Labeled: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
    <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 34, color: '#fff', textShadow: TS, letterSpacing: -0.4 }}>{label}</span>
    {children}
  </div>
);

export const ComboHeadlineOverlay: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: DISP }}>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 30px' }}>
      <div style={{ maxWidth: 920, textAlign: 'center', fontFamily: DISP, fontWeight: 800, fontSize: 74, color: '#fff', textShadow: TS, letterSpacing: -1.4, lineHeight: 1.08, marginBottom: 44 }}>
        {HEADLINE}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18 }}>
        <Labeled label="Claude">
          <ClaudeTile size={TILE} />
        </Labeled>
        <Plus size={70} />
        <Labeled label="Ultron">
          <UltronTile size={TILE} />
        </Labeled>
        <Plus size={70} />
        <Labeled label="Maps">
          <MapsTile size={TILE} />
        </Labeled>
      </div>
    </div>
  </AbsoluteFill>
);
