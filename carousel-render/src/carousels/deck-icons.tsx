/**
 * Shared icon + brand-logo badges for the decks.
 * - IconBadge: a lucide-react glyph in a rounded "orange family" chip.
 * - LogoBadge: a simple-icons brand logo in a light chip, in its brand colour.
 * Keeps sizing/chrome consistent everywhere instead of bare ✶ asterisks.
 */
import React from 'react';
import { AH_ORANGE } from './ah-blocks';

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
type BrandIcon = React.ComponentType<{ size?: number; color?: string }>;

export const IconBadge: React.FC<{ Icon: LucideIcon; box?: number; size?: number; solid?: boolean; dark?: boolean }> = ({ Icon, box = 60, size, solid = false, dark = false }) => {
  // No solid-orange fills: tint background with an orange glyph + a hairline ring.
  const bg = solid ? 'rgba(232,84,43,0.22)' : dark ? 'rgba(232,84,43,0.16)' : 'rgba(232,84,43,0.10)';
  return (
    <div style={{ width: box, height: box, borderRadius: Math.round(box * 0.28), background: bg, border: `1px solid rgba(232,84,43,${solid ? 0.55 : 0.3})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
      <Icon size={size ?? Math.round(box * 0.52)} color={AH_ORANGE} strokeWidth={2.1} />
    </div>
  );
};

export const LogoBadge: React.FC<{ Icon: BrandIcon; color: string; box?: number; size?: number; chip?: string }> = ({ Icon, color, box = 96, size, chip = '#faf7f0' }) => (
  <div style={{ width: box, height: box, borderRadius: Math.round(box * 0.26), background: chip, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', boxShadow: '0 12px 32px rgba(0,0,0,0.22)' }}>
    <Icon size={size ?? Math.round(box * 0.5)} color={color} />
  </div>
);
