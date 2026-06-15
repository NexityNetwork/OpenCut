/**
 * Remotion Root — one still Composition per carousel slide.
 * Each deck in the registry contributes `<DeckId>-01 … -NN` (1080x1920).
 * FontGate holds the render until the bundled Inter / Inter Tight /
 * JetBrains Mono variable fonts (imported in carousels/blocks.tsx) are ready.
 */
import React from 'react';
import { Composition } from 'remotion';
import { FontGate } from './carousels/blocks';
import { FormatContext } from './carousels/ah-blocks';
import { decks } from './carousels/registry';

const VERTICAL = { width: 1080, height: 1920, fps: 30 } as const; // 9:16 Instagram
const SQUARE45 = { width: 1080, height: 1350, fps: 30 } as const; // 4:5 LinkedIn doc

export const RemotionRoot: React.FC = () => (
  <>
    {decks.flatMap((deck) =>
      deck.slides.flatMap((node, i) => {
        const nn = String(i + 1).padStart(2, '0');
        return [
          <Composition
            key={`${deck.id}-${i}`}
            id={`${deck.id}-${nn}`}
            component={() => <FontGate>{node}</FontGate>}
            durationInFrames={1}
            {...VERTICAL}
          />,
          <Composition
            key={`${deck.id}-li-${i}`}
            id={`${deck.id}-li-${nn}`}
            component={() => (
              <FontGate>
                <FormatContext.Provider value="4:5">{node}</FormatContext.Provider>
              </FontGate>
            )}
            durationInFrames={1}
            {...SQUARE45}
          />,
        ];
      }),
    )}
  </>
);
