import type { Crew } from "./crew";
import type { PlayerAttributes } from "../sim/types";

// A small permanent, account-wide spend for Gems (decision log: "permanent
// buffs... a cross-run meta-progression spend, not a run-scoped one like
// Perks"). Kept to two for the demo — the catalog itself is still an open
// question, this just proves the category out.
export interface PermanentBuff {
  id: string;
  name: string;
  description: string;
  cost: number; // gems
}

export const BUFF_POOL: PermanentBuff[] = [
  {
    id: "scouting-network",
    name: "Scouting Network",
    description: "+3 to every attribute for your starting squad, every run",
    cost: 60,
  },
  {
    id: "home-advantage",
    name: "Home Advantage",
    description: "+50% Coins from duplicate Player Card pulls",
    cost: 40,
  },
];

function boostAttributes(attributes: PlayerAttributes, amount: number): PlayerAttributes {
  return {
    pace: Math.min(100, attributes.pace + amount),
    shooting: Math.min(100, attributes.shooting + amount),
    passing: Math.min(100, attributes.passing + amount),
    tackling: Math.min(100, attributes.tackling + amount),
    positioning: Math.min(100, attributes.positioning + amount),
    stamina: Math.min(100, attributes.stamina + amount),
    goalkeeping: Math.min(100, attributes.goalkeeping + amount),
  };
}

// Applied once, when a new run's squad is locked in (see main.ts's
// "Start run" handler) — not a Perk, so it isn't re-applied per match and
// doesn't count against the Perk pool.
export function applyStartingBuffs(crew: Crew, ownedBuffIds: string[]): Crew {
  if (!ownedBuffIds.includes("scouting-network")) return crew;
  return crew.map((card) => ({ ...card, attributes: boostAttributes(card.attributes, 3) }));
}
