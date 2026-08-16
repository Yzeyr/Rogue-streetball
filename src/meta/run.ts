import type { Crew } from "./crew";
import { startCup, type CupProgress } from "./cup";

// Carries real cup progress (see project decision log for the full
// shape). Deliberately no currency here anymore — Coins/Gems and the
// Player Card collection live on the persistent PlayerProfile (see
// profile.ts), since they carry over between runs; RunState is what
// resets. Still no persistence for RunState itself — a page refresh
// loses the in-progress run.
export interface RunState {
  crew: Crew;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  cupsCleared: number;
  cup: CupProgress;
  over: boolean;
}

// crew is the squad chosen on the Squad screen (see profile.ts /
// meta/squad selection) — RunState no longer hardcodes STARTER_CREW.
export function createRunState(teamSize: number, crew: Crew): RunState {
  return {
    crew,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    cupsCleared: 0,
    cup: startCup(teamSize),
    over: false,
  };
}

export function recordResult(run: RunState, homeScore: number, awayScore: number): RunState {
  return {
    ...run,
    matchesPlayed: run.matchesPlayed + 1,
    wins: run.wins + (homeScore > awayScore ? 1 : 0),
    losses: run.losses + (homeScore < awayScore ? 1 : 0),
    draws: run.draws + (homeScore === awayScore ? 1 : 0),
  };
}
