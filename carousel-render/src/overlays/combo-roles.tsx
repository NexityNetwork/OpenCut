/** Reel overlay: three brand tiles stacked with a role label each, then a big
 * monthly figure. Claude / Ultron / Maps. Outlined white text, no emojis, no
 * dollar signs. */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { DISP } from './kit';
import { ClaudeTile, UltronTile, MapsTile } from './logos';

const TILE = 150;
const TS = '0 3px 16px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.85)';

const ROWS: { tile: React.ReactNode; brand: string; role: string }[] = [
  { tile: <ClaudeTile size={TILE} />, brand: 'Claude', role: 'Cofounder' },
  { tile: <UltronTile size={TILE} />, brand: 'Ultron', role: 'Operations' },
  { tile: <MapsTile size={TILE} />, brand: 'Maps', role: 'Outreach' },
];

export const ComboRolesOverlay: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: DISP }}>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 40px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        {ROWS.map((r) => (
          <div key={r.brand} style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            {r.tile}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: DISP, fontWeight: 600, fontSize: 34, color: '#fff', textShadow: TS, letterSpacing: -0.4, opacity: 0.92 }}>{r.brand}</span>
              <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 58, color: '#fff', textShadow: TS, letterSpacing: -1, lineHeight: 1.04 }}>{r.role}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 40, fontFamily: DISP, fontWeight: 800, fontSize: 78, color: '#fff', textShadow: TS, letterSpacing: -1.5 }}>
        27,387 a month
      </div>
    </div>
  </AbsoluteFill>
);
