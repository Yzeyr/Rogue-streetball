import { STARTER_CREW, type Crew } from "./crew";

// Deliberately thin for the vertical slice: no cups, currency, or
// persistence yet — just enough to carry a crew and a record across
// consecutive matches. See project decision log for the full run/season
// shape this will grow into.
export interface RunState {
  crew: Crew;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

export function createRunState(): RunState {
  return { crew: STARTER_CREW, matchesPlayed: 0, wins: 0, losses: 0, draws: 0 };
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
