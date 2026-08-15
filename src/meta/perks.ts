import type { Crew } from "./crew";
import type { PlayerAttributes } from "../sim/types";

export interface Perk {
  id: string;
  name: string;
  description: string;
  attribute: keyof PlayerAttributes;
  amount: number;
}

// A small hand-authored pool for the vertical slice. Real Perks (including
// non-stat "wilder" effects) are a later pass — see project decision log.
export const PERK_POOL: Perk[] = [
  { id: "pace", name: "Quick Feet", description: "+8 Pace, crew-wide", attribute: "pace", amount: 8 },
  { id: "shooting", name: "Sharpshooters", description: "+8 Shooting, crew-wide", attribute: "shooting", amount: 8 },
  { id: "passing", name: "Playmakers", description: "+8 Passing, crew-wide", attribute: "passing", amount: 8 },
  { id: "tackling", name: "Iron Press", description: "+8 Tackling, crew-wide", attribute: "tackling", amount: 8 },
  {
    id: "positioning",
    name: "Game Readers",
    description: "+8 Positioning, crew-wide",
    attribute: "positioning",
    amount: 8,
  },
  { id: "stamina", name: "Iron Lungs", description: "+8 Stamina, crew-wide", attribute: "stamina", amount: 8 },
];

export function applyPerk(crew: Crew, perk: Perk): Crew {
  return crew.map((member) => ({
    ...member,
    attributes: {
      ...member.attributes,
      [perk.attribute]: Math.min(100, member.attributes[perk.attribute] + perk.amount),
    },
  }));
}

// Draft randomness is a meta/UI concern, not sim state — it doesn't need
// to thread through the sim's seeded RNG, which is specifically about
// reproducing a *match* (see project decision log, section 5).
export function pickRandomPerks(count: number): Perk[] {
  const pool = [...PERK_POOL];
  const picks: Perk[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const index = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(index, 1)[0]);
  }
  return picks;
}
