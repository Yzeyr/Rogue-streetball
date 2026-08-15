import { nextRange, type RngState } from "./rng";
import type { PlayerAttributes } from "./types";

// Placeholder generation: a flat random roll in a modest "average pro"
// band. Real attribute generation belongs to the pack/rarity system
// (see project decision log) — this just needs to exist so movement has
// a pace to read.
const ATTRIBUTE_RANGE: [number, number] = [40, 70];

export function rollAttributes(rngState: RngState): [PlayerAttributes, RngState] {
  let s = rngState;
  const roll = (): number => {
    const [value, next] = nextRange(s, ...ATTRIBUTE_RANGE);
    s = next;
    return Math.round(value);
  };

  const attributes: PlayerAttributes = {
    pace: roll(),
    shooting: roll(),
    passing: roll(),
    tackling: roll(),
    positioning: roll(),
    stamina: roll(),
    goalkeeping: roll(),
  };

  return [attributes, s];
}
