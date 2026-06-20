/** Shared bits for reel overlays: transparent frame, title block, palette. */
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { AH_ORANGE, T } from '../carousels/wipf-kit';

export { AH_ORANGE, T };
export const DARK = '#100f0e';
export const CREAM = '#f4f1ea';
export const INK = '#15130f';
export const GREEN = '#2faE57';
export const RED = '#df3b3b';
export const SHADOW = '0 8px 24px rgba(0,0,0,0.30)';
export const DISP = T.displayFont;

/** Transparent canvas with a vertically + horizontally centered column. */
export const OverlayRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ fontFamily: DISP }}>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 38px',
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);

/** Dark title chip (with optional orange accent word) + cream subtitle chip. */
export const TitleBlock: React.FC<{
  title: React.ReactNode;
  sub: string;
  size?: number;
  subSize?: number;
}> = ({ title, sub, size = 78, subSize = 33 }) => (
  <>
    <div style={{ background: DARK, borderRadius: 16, padding: '14px 30px', boxShadow: SHADOW, textAlign: 'center' }}>
      <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: size, color: '#fff', letterSpacing: -2.4, lineHeight: 1 }}>
        {title}
      </span>
    </div>
    <div style={{ marginTop: 11, background: CREAM, borderRadius: 12, padding: '9px 22px', boxShadow: SHADOW, textAlign: 'center' }}>
      <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: subSize, color: INK, letterSpacing: -0.6 }}>
        {sub}
      </span>
    </div>
  </>
);

/** Small footer tag chip (used to slip the brand in). */
export const FooterTag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ marginTop: 20, background: DARK, borderRadius: 12, padding: '11px 24px', boxShadow: SHADOW }}>
    <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 31, color: '#fff', letterSpacing: -0.4 }}>{children}</span>
  </div>
);

export const accent = (s: string) => <span style={{ color: AH_ORANGE }}>{s}</span>;
