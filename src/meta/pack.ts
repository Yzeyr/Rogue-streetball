import { generatePlayerCard, type PlayerCard, type Rarity } from "./playerCard";

export type PackTier = "bronze" | "silver" | "gold";

export const PACK_TIER_LABELS: Record<PackTier, string> = {
  bronze: "Bronze Pack",
  silver: "Silver Pack",
  gold: "Gold Pack",
};

// Pack tier gates the rarity ceiling (decision log — confirmed, gate not
// weight): Bronze tops out at Purple, Silver at Orange, Gold can reach
// Diamond at roughly 1-in-1000. The weights within a tier are the "later
// balance detail" the decision log flagged as not blocking.
const PACK_RARITY_WEIGHTS: Record<PackTier, Partial<Record<Rarity, number>>> = {
  bronze: { gray: 0.55, blue: 0.33, purple: 0.12 },
  silver: { gray: 0.4, blue: 0.33, purple: 0.2, orange: 0.07 },
  gold: { gray: 0.3, blue: 0.3, purple: 0.25, orange: 0.149, diamond: 0.001 },
};

function rollRarity(tier: PackTier): Rarity {
  const weights = Object.entries(PACK_RARITY_WEIGHTS[tier]) as [Rarity, number][];
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return weights[weights.length - 1][0];
}

const CARDS_PER_PACK = 3;

// A pack reveals 3 Player Cards, all received, none picked among (decision
// log — fully random, overriding an earlier recommendation toward a
// revealed choice-of-N).
export function openPack(tier: PackTier): PlayerCard[] {
  const cards: PlayerCard[] = [];
  for (let i = 0; i < CARDS_PER_PACK; i++) {
    cards.push(generatePlayerCard(rollRarity(tier)));
  }
  return cards;
}

// Milestone reward tier scaling with cups cleared this run (decision
// log): 1st clear -> Bronze, 2nd -> Silver, 3rd+ -> Gold.
export function packTierForCupClear(cupsClearedSoFar: number): PackTier {
  if (cupsClearedSoFar <= 1) return "bronze";
  if (cupsClearedSoFar === 2) return "silver";
  return "gold";
}
