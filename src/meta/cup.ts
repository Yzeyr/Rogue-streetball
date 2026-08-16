import { generateOpponent } from "./opponent";
import { packTierForCupClear, type PackTier } from "./pack";
import type { PlayerAttributes } from "../sim/types";
import type { RunState } from "./run";

// Settled cup shape (see project decision log): 5 rounds. Rounds 1-4 are
// two-legged aggregate ties; round 5 is a single boss match. Pure
// knockout throughout — lose a tie (or the boss) and the run is over
// outright, no group stage. "Different court per leg" is part of that
// decision too, but courts aren't varied in code yet (only DEFAULT_COURT
// exists) — the tie structure is real, the court flavour isn't yet.
export interface CupProgress {
  round: number; // 1-5
  leg: 1 | 2 | null; // 1 or 2 for rounds 1-4, null for the round 5 boss
  aggregateHome: number;
  aggregateAway: number;
  opponent: PlayerAttributes[]; // same rival across both legs of a tie
}

export function startCup(teamSize: number): CupProgress {
  return {
    round: 1,
    leg: 1,
    aggregateHome: 0,
    aggregateAway: 0,
    opponent: generateOpponent(teamSize),
  };
}

export type CupOutcome =
  | "leg-complete" // leg 1 of a tie done, leg 2 still to come
  | "advance-round" // tie (or non-boss round) won, next round begins
  | "cup-cleared" // boss beaten, a new cup starts
  | "run-over" // a tie or the boss was lost — the run ends outright
  | "sudden-death-needed"; // level on aggregate (or a drawn boss) — decider needed

export interface CupAdvanceResult {
  run: RunState;
  outcome: CupOutcome;
  // Set only when outcome is "cup-cleared" — the caller opens this pack
  // against the persistent PlayerProfile (see profile.ts). Cup progress
  // itself stays free of collection/currency concerns.
  packTier?: PackTier;
}

function nextRoundProgress(round: number, teamSize: number): CupProgress {
  const nextRoundNumber = round + 1;
  return {
    round: nextRoundNumber,
    leg: nextRoundNumber === 5 ? null : 1,
    aggregateHome: 0,
    aggregateAway: 0,
    opponent: generateOpponent(teamSize),
  };
}

// Applies a completed leg/boss match's score to the current cup tie and
// decides what happens next. Doesn't play any match itself — the caller
// drives an actual match from the returned CupOutcome.
export function advanceCup(
  run: RunState,
  homeScore: number,
  awayScore: number,
  teamSize: number
): CupAdvanceResult {
  const cup = run.cup;

  if (cup.round === 5) {
    if (homeScore === awayScore) {
      return { run, outcome: "sudden-death-needed" };
    }
    if (homeScore > awayScore) {
      return {
        run: { ...run, cupsCleared: run.cupsCleared + 1, cup: startCup(teamSize) },
        outcome: "cup-cleared",
        packTier: packTierForCupClear(run.cupsCleared + 1),
      };
    }
    return { run: { ...run, over: true }, outcome: "run-over" };
  }

  const aggregateHome = cup.aggregateHome + homeScore;
  const aggregateAway = cup.aggregateAway + awayScore;

  if (cup.leg === 1) {
    return {
      run: { ...run, cup: { ...cup, leg: 2, aggregateHome, aggregateAway } },
      outcome: "leg-complete",
    };
  }

  if (aggregateHome === aggregateAway) {
    return {
      run: { ...run, cup: { ...cup, aggregateHome, aggregateAway } },
      outcome: "sudden-death-needed",
    };
  }
  if (aggregateHome > aggregateAway) {
    return {
      run: { ...run, cup: nextRoundProgress(cup.round, teamSize) },
      outcome: "advance-round",
    };
  }
  return {
    run: { ...run, over: true, cup: { ...cup, aggregateHome, aggregateAway } },
    outcome: "run-over",
  };
}

// Resolves a decisive sudden-death decider (next goal wins — see decision
// log, chosen over penalties to keep the ball-always-live rule intact
// through the tie-break too). Whoever scored wins the tie/boss outright;
// this doesn't touch the aggregate, it just decides who advances.
export function resolveSuddenDeath(
  run: RunState,
  homeScore: number,
  awayScore: number,
  teamSize: number
): CupAdvanceResult {
  if (homeScore <= awayScore) {
    return { run: { ...run, over: true }, outcome: "run-over" };
  }
  if (run.cup.round === 5) {
    return {
      run: { ...run, cupsCleared: run.cupsCleared + 1, cup: startCup(teamSize) },
      outcome: "cup-cleared",
      packTier: packTierForCupClear(run.cupsCleared + 1),
    };
  }
  return {
    run: { ...run, cup: nextRoundProgress(run.cup.round, teamSize) },
    outcome: "advance-round",
  };
}
