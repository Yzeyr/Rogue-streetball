import { createRng, type RngState } from "../sim/rng";
import { rollAttributes } from "../sim/attributes";
import type { PlayerAttributes } from "../sim/types";

// A freshly generated rival squad for one cup tie. Its own throwaway RNG
// stream, seeded from Math.random() — this is meta/UI-level randomness
// (which opponent you face), not sim state, so it doesn't need to thread
// the sim's seeded RNG. That contract is specifically about reproducing
// a *match* deterministically (see project decision log, section 5);
// which opponent gets generated isn't part of that guarantee.
export function generateOpponent(teamSize: number): PlayerAttributes[] {
  let rng: RngState = createRng(Math.floor(Math.random() * 1_000_000_000));
  const attributes: PlayerAttributes[] = [];
  for (let i = 0; i < teamSize; i++) {
    const [rolled, next] = rollAttributes(rng);
    rng = next;
    attributes.push(rolled);
  }
  return attributes;
}
