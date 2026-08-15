import { createRng, nextRange, type RngState } from "./rng";
import { stepBall } from "./physics";
import { buildFormation, formationTarget } from "./formation";
import { rollAttributes } from "./attributes";
import { movePlayers } from "./movement";
import { applyTouches } from "./touches";
import type { BallState, MatchConfig, MatchState, PlayerState, TeamId } from "./types";

const BALL_RADIUS = 0.11; // metres, roughly a size-5 football
const KICKOFF_SPEED_RANGE: [number, number] = [3, 6]; // metres/second

function spawnPlayers(
  rngState: RngState,
  config: MatchConfig,
  ball: BallState
): [players: PlayerState[], next: RngState] {
  const players: PlayerState[] = [];
  const teams: TeamId[] = ["home", "away"];
  let s = rngState;

  for (const team of teams) {
    const formation = buildFormation(config.teamSize);
    formation.forEach((slot, i) => {
      const [attributes, next] = rollAttributes(s);
      s = next;
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
  };
  return [ball, s2];
}

export function createMatch(config: MatchConfig): MatchState {
  const rngState = createRng(config.seed);
  const [ball, rngAfterBall] = kickoffBall(rngState, config);
  const [players, rngAfterPlayers] = spawnPlayers(rngAfterBall, config, ball);
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

  const touched = applyTouches(state.ball, state.players, state.config.court, state.rngState);
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

// Runs the match to completion with no renderer attached, proving sim and
// render are fully decoupled. Used for instant-result simulation.
export function simulateMatch(
  config: MatchConfig,
  durationSeconds: number
): MatchState {
  let state = createMatch(config);
  const totalTicks = Math.floor(durationSeconds * config.tickRate);
  for (let i = 0; i < totalTicks; i++) {
    state = tickMatch(state);
  }
  return state;
}
