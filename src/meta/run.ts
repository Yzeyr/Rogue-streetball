import { STARTER_CREW, type Crew } from "./crew";
import { startCup, type CupProgress } from "./cup";

// Now carries real cup progress (see project decision log for the full
// shape). Still no persistence — a page refresh loses the run — and no
// packs/Player Cards; Coins exist only as a placeholder milestone reward
// until packs are built.
export interface RunState {
  crew: Crew;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  cupsCleared: number;
  coins: number;
  cup: CupProgress;
  over: boolean;
}

export function createRunState(teamSize: number): RunState {
  return {
    crew: STARTER_CREW,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    cupsCleared: 0,
    coins: 0,
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
