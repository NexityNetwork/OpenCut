/** Reusable brand tiles for the combo overlays: Claude, Ultron, Maps. */
import React from 'react';
import { Img, staticFile } from 'remotion';
import { SiClaude } from '@icons-pack/react-simple-icons';

const TILE_SHADOW = '0 16px 46px rgba(0,0,0,0.42)';

export const Tile: React.FC<{ size: number; bg: string; children: React.ReactNode }> = ({ size, bg, children }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: Math.round(size * 0.23),
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: TILE_SHADOW,
      overflow: 'hidden',
      flex: '0 0 auto',
    }}
  >
    {children}
  </div>
);

export const ClaudeTile: React.FC<{ size: number }> = ({ size }) => (
  <Tile size={size} bg="#D97757">
    <SiClaude size={Math.round(size * 0.6)} color="#fff" />
  </Tile>
);

export const UltronTile: React.FC<{ size: number }> = ({ size }) => (
  <Tile size={size} bg="#f4f1ea">
    <Img src={staticFile('ultron-logo.png')} style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
  </Tile>
);

/** Colorful Google Maps style pin (4 brand colors, white center). */
export const MapsPin: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={Math.round(size * 1.22)} viewBox="0 0 100 122">
    <defs>
      <clipPath id="mapspin">
        <path d="M50 3 C27 3 9 21 9 44 C9 76 50 119 50 119 C50 119 91 76 91 44 C91 21 73 3 50 3 Z" />
      </clipPath>
    </defs>
    <g clipPath="url(#mapspin)">
      <rect x="0" y="0" width="100" height="122" fill="#4285F4" />
      <rect x="0" y="0" width="100" height="44" fill="#EA4335" />
      <rect x="50" y="20" width="50" height="55" fill="#34A853" />
      <rect x="0" y="34" width="50" height="44" fill="#FBBC04" />
    </g>
    <circle cx="50" cy="44" r="17" fill="#fff" />
  </svg>
);

export const MapsTile: React.FC<{ size: number }> = ({ size }) => (
  <Tile size={size} bg="#ffffff">
    <MapsPin size={Math.round(size * 0.58)} />
  </Tile>
);

export const Plus: React.FC<{ size?: number }> = ({ size = 80 }) => (
  <span style={{ fontFamily: '"Inter Tight Variable", sans-serif', fontWeight: 800, fontSize: size, color: '#fff', textShadow: '0 3px 14px rgba(0,0,0,0.6)', flex: '0 0 auto' }}>+</span>
);
