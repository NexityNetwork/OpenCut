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

/** A label chip (right-aligned to a seam) + a wrapping description chip. */
export const LabelDescRow: React.FC<{
  label: React.ReactNode;
  desc: string;
  labelCol: number;
  descCol: number;
  descSize?: number;
  seam?: number;
}> = ({ label, desc, labelCol, descCol, descSize = 28, seam = 8 }) => (
  <div style={{ display: 'flex', gap: seam, alignItems: 'flex-start' }}>
    <div style={{ width: labelCol, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ background: AH_ORANGE, borderRadius: 12, padding: '11px 16px', boxShadow: SHADOW, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, maxWidth: labelCol }}>
        {label}
      </div>
    </div>
    <div style={{ width: descCol }}>
      <div style={{ background: CREAM, borderRadius: 12, padding: '12px 18px', boxShadow: SHADOW }}>
        <span style={{ fontFamily: T.bodyFont, fontWeight: 600, fontSize: descSize, color: INK, lineHeight: 1.32, letterSpacing: -0.2 }}>{desc}</span>
      </div>
    </div>
  </div>
);

/** Kicker (small) + bold title, right-aligned — for SKILL #1 / STEP #1 labels. */
export const KickerTitle: React.FC<{ kicker: string; title: string; size?: number }> = ({ kicker, title, size = 30 }) => (
  <>
    <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 21, color: 'rgba(255,255,255,0.82)', letterSpacing: 1.6 }}>{kicker}</span>
    <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: size, color: '#fff', textAlign: 'right', lineHeight: 1.08, letterSpacing: -0.4 }}>{title}</span>
  </>
);

/** creator/ (small) + skill name (bold), right-aligned — for skill handles. */
export const HandleLabel: React.FC<{ who: string; name: string; size?: number }> = ({ who, name, size = 30 }) => (
  <>
    <span style={{ fontFamily: DISP, fontWeight: 600, fontSize: 22, color: 'rgba(255,255,255,0.82)', letterSpacing: -0.2, textAlign: 'right' }}>{who}</span>
    <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: size, color: '#fff', textAlign: 'right', lineHeight: 1.06, letterSpacing: -0.4 }}>{name}</span>
  </>
);

/** Single bold label (e.g. a tool/MCP name), right-aligned. */
export const SoloLabel: React.FC<{ text: string; size?: number }> = ({ text, size = 33 }) => (
  <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: size, color: '#fff', textAlign: 'right', lineHeight: 1.05, letterSpacing: -0.5 }}>{text}</span>
);
