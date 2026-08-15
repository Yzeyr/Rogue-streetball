import { createRng, nextRange, type RngState } from "./rng";
import { stepBall } from "./physics";
import { buildFormation, formationTarget } from "./formation";
import { rollAttributes } from "./attributes";
import { movePlayers } from "./movement";
import { applyTouches } from "./touches";
import { attemptSave } from "./saves";
import type { BallState, MatchConfig, MatchState, PlayerAttributes, PlayerState, TeamId } from "./types";

const BALL_RADIUS = 0.11; // metres, roughly a size-5 football
const KICKOFF_SPEED_RANGE: [number, number] = [3, 6]; // metres/second

function spawnPlayers(
  rngState: RngState,
  config: MatchConfig,
  ball: BallState,
  homeAttributes?: PlayerAttributes[]
): [players: PlayerState[], next: RngState] {
  const players: PlayerState[] = [];
  const teams: TeamId[] = ["home", "away"];
  let s = rngState;

  for (const team of teams) {
    const formation = buildFormation(config.teamSize);
    formation.forEach((slot, i) => {
      const provided = team === "home" ? homeAttributes?.[i] : undefined;
      let attributes: PlayerAttributes;
      if (provided) {
        attributes = provided;
      } else {
        const [rolled, next] = rollAttributes(s);
        s = next;
        attributes = rolled;
      }
      const spawn = formationTarget(slot, team, config.court, ball);
      players.push({
        id: `${team}-${i}`,
        team,
        role: slot.role,
        x: spawn.x,
        y: spawn.y,
        homeXFraction: slot.xFraction,
        homeYFraction: slot.yFraction,
        attributes,
      });
    });
  }

  return [players, s];
}

function kickoffBall(
  rngState: RngState,
  config: MatchConfig
): [ball: BallState, next: RngState] {
  const [angle, s1] = nextRange(rngState, 0, Math.PI * 2);
  const [speed, s2] = nextRange(s1, ...KICKOFF_SPEED_RANGE);
  const ball: BallState = {
    x: config.court.width / 2,
    y: config.court.height / 2,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: BALL_RADIUS,
    touchCooldown: 0,
    possessionTeam: null,
    carrierId: null,
  };
  return [ball, s2];
}

// homeAttributes lets a meta-game Crew (see src/meta/) supply the home
// team's stats instead of the placeholder random roll — the sim itself
// stays unaware that "Crew" exists at all, it just takes an optional
// array of its own PlayerAttributes type. Away is always randomly rolled
// (a generated opponent), same as before.
export function createMatch(config: MatchConfig, homeAttributes?: PlayerAttributes[]): MatchState {
  const rngState = createRng(config.seed);
  const [ball, rngAfterBall] = kickoffBall(rngState, config);
  const [players, rngAfterPlayers] = spawnPlayers(rngAfterBall, config, ball, homeAttributes);
  return {
    config,
    tick: 0,
    elapsedSeconds: 0,
    ball,
    players,
    score: { home: 0, away: 0 },
    rngState: rngAfterPlayers,
  };
}

// Advances the match by exactly one fixed tick. Sim logic never reads the
// wall clock — dt is always 1 / tickRate.
export function tickMatch(state: MatchState): MatchState {
  const dt = 1 / state.config.tickRate;

  const saved = attemptSave(state.ball, state.players, state.config.court, state.rngState);
  const touched = applyTouches(saved.ball, state.players, state.config.court, saved.rngState);
  const { ball, scoredBy } = stepBall(touched.ball, state.config.court, dt);

  const score = scoredBy
    ? { ...state.score, [scoredBy]: state.score[scoredBy] + 1 }
    : state.score;

  const [nextBall, nextRngState] = scoredBy
    ? kickoffBall(touched.rngState, state.config)
    : [ball, touched.rngState];

  const players = movePlayers(state.players, state.config.court, nextBall, dt);

  return {
    ...state,
    tick: state.tick + 1,
    elapsedSeconds: state.elapsedSeconds + dt,
    ball: nextBall,
    players,
    score,
    rngState: nextRngState,
  };
}

// A match is over once it's run its configured duration — a query on the
// state, not a special tick, so tickMatch stays a plain per-tick step with
// no notion of "done." Whoever drives the loop (real-time or headless)
// decides what to do once this is true.
export function isMatchComplete(state: MatchState): boolean {
  return state.elapsedSeconds >= state.config.durationSeconds;
}

// Runs the match to completion with no renderer attached, proving sim and
// render are fully decoupled. Used for instant-result simulation.
export function simulateMatch(config: MatchConfig, homeAttributes?: PlayerAttributes[]): MatchState {
  let state = createMatch(config, homeAttributes);
  while (!isMatchComplete(state)) {
    state = tickMatch(state);
  }
  return state;
}
