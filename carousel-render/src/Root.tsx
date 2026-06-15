/**
 * Remotion Root — one still Composition per carousel slide.
 * Each deck in the registry contributes `<DeckId>-01 … -NN` (1080x1920).
 * FontGate holds the render until the bundled Inter / Inter Tight /
 * JetBrains Mono variable fonts (imported in carousels/blocks.tsx) are ready.
 */
import React from 'react';
import { Composition } from 'remotion';
import { FontGate } from './carousels/blocks';
import { decks } from './carousels/registry';

const VERTICAL = { width: 1080, height: 1920, fps: 30 } as const;

export const RemotionRoot: React.FC = () => (
  <>
    {decks.flatMap((deck) =>
      deck.slides.map((node, i) => (
        <Composition
          key={`${deck.id}-${i}`}
          id={`${deck.id}-${String(i + 1).padStart(2, '0')}`}
          component={() => <FontGate>{node}</FontGate>}
          durationInFrames={1}
          {...VERTICAL}
        />
      )),
    )}
  </>
);
