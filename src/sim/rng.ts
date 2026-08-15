// Seeded PRNG (mulberry32), used as a pure function: every call takes a
// state and returns a new state alongside the value. No internal mutation,
// so it composes cleanly with the rest of the sim's pure match-state
// transitions. All sim randomness must flow through this — never
// Math.random() — so a seed fully determines a match.
export type RngState = number;

export function createRng(seed: number): RngState {
  return seed >>> 0;
}

export function nextFloat(state: RngState): [value: number, next: RngState] {
  let s = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return [value, s];
}

export function nextRange(
  state: RngState,
  min: number,
  max: number
): [value: number, next: RngState] {
  const [value, next] = nextFloat(state);
  return [min + value * (max - min), next];
}
