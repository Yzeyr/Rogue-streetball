import { generatePlayerCard, type PlayerCard, type Rarity } from "./playerCard";

export const MARKET_PRICE: Record<Rarity, number> = {
  gray: 30,
  blue: 80,
  purple: 200,
  orange: 500,
  diamond: 2000,
};

const LISTING_SIZE = 4;

// Market listings skew toward common/rare — it's meant to be a reliable,
// affordable way to fill a specific gap (the deliberate-choice
// counterpart to blind packs, per the decision log), not a shortcut to
// Diamond.
const LISTING_RARITY_WEIGHTS: Partial<Record<Rarity, number>> = {
  gray: 0.45,
  blue: 0.35,
  purple: 0.16,
  orange: 0.04,
};

function rollListingRarity(): Rarity {
  const entries = Object.entries(LISTING_RARITY_WEIGHTS) as [Rarity, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return entries[entries.length - 1][0];
}

// A fresh, visible set of Player Cards for sale. Regenerated each time
// the Market screen is opened — no persistence of "today's stock," a
// fine simplification for now.
export function rollMarketListing(): PlayerCard[] {
  const cards: PlayerCard[] = [];
  for (let i = 0; i < LISTING_SIZE; i++) {
    cards.push(generatePlayerCard(rollListingRarity()));
  }
  return cards;
}

export function priceFor(card: PlayerCard): number {
  return MARKET_PRICE[card.rarity];
}
