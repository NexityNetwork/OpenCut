/** Reel overlay: two big centered brand tiles (Claude + Ultron) over a
 * transparent canvas, with a stat/headline block beneath in outlined white
 * text. Text is placeholder and easy to swap. */
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { DISP } from './kit';
import { SiClaude } from '@icons-pack/react-simple-icons';

const TILE = 262;
const RADIUS = 60;
const TS = '0 3px 16px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.85)';

// Placeholder copy — swap for the real lines.
const HEADLINE = 'Sold 67 websites this month';
const LINES = ['500 per site', '67 x 500 = 33,500', '33,500 a month'];

export const BrandComboOverlay: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: DISP }}>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 50px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
        <div style={{ width: TILE, height: TILE, borderRadius: RADIUS, background: '#D97757', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 54px rgba(0,0,0,0.42)' }}>
          <SiClaude size={Math.round(TILE * 0.6)} color="#fff" />
        </div>
        <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 96, color: '#fff', textShadow: TS }}>+</span>
        <div style={{ width: TILE, height: TILE, borderRadius: RADIUS, background: '#f4f1ea', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 20px 54px rgba(0,0,0,0.42)', overflow: 'hidden' }}>
          <Img src={staticFile('ultron-logo.png')} style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
        </div>
      </div>

      <div style={{ marginTop: 46, textAlign: 'center' }}>
        <div style={{ fontFamily: DISP, fontWeight: 800, fontSize: 64, color: '#fff', textShadow: TS, letterSpacing: -1, lineHeight: 1.12 }}>{HEADLINE}</div>
        {LINES.map((l) => (
          <div key={l} style={{ fontFamily: DISP, fontWeight: 700, fontSize: 52, color: '#fff', textShadow: TS, letterSpacing: -0.5, marginTop: 10 }}>{l}</div>
        ))}
      </div>
    </div>
  </AbsoluteFill>
);
