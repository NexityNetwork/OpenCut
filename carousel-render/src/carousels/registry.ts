/**
 * Registry of the Next WIPF carousel decks. Root.tsx maps over this to
 * register one still composition per slide (id = `<DeckId>-NN`).
 * render-carousel.mjs takes a DeckId + slide count.
 */
import { blueprint10kDeck } from './configs/blueprint-10k';
import { dashboardBuildDeck } from './configs/dashboard-build';
import { softwareStackDeck } from './configs/software-stack';
import { appStoreClaudeDeck } from './configs/appstore-claude';
import { skills50Deck } from './configs/skills-50';
import { agent10minDeck } from './configs/agent-10min';
import { contentDashboardDeck } from './configs/content-dashboard';
import { repos10Deck } from './configs/repos-10';
import { team200Deck } from './configs/team-200';
import { workflows5Deck } from './configs/workflows-5';
import { fourthingsDeck } from './configs/fourthings';
import { caveStackDeck } from './configs/cave-stack';
import { unfairDeck } from './configs/unfair';
import { firstmilDeck } from './configs/firstmil';
import { losingDeck } from './configs/losing';
import { metaMcpDeck } from './configs/meta-mcp';
import { rubixBuildDeck } from './configs/rubix-build';
import { devteamDeck } from './configs/devteam';
import { auditDeck } from './configs/audit';
import { openclawDeck } from './configs/openclaw';

export const decks = [
  blueprint10kDeck,
  dashboardBuildDeck,
  softwareStackDeck,
  appStoreClaudeDeck,
  skills50Deck,
  agent10minDeck,
  contentDashboardDeck,
  repos10Deck,
  team200Deck,
  workflows5Deck,
  fourthingsDeck,
  caveStackDeck,
  unfairDeck,
  firstmilDeck,
  losingDeck,
  metaMcpDeck,
  rubixBuildDeck,
  devteamDeck,
  auditDeck,
  openclawDeck,
];
