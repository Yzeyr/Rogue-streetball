export type TeamId = "home" | "away";

// Court dimensions and rules are config, not engine constants (see
// architecture rule: "Court is parameterised").
export interface CourtConfig {
  width: number; // metres, along x
  height: number; // metres, along y
  goalWidth: number; // metres, centred on each end wall
  wallRestitution: number; // 0..1, energy kept on a wall bounce
}

export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  // Ticks remaining before any player can touch the ball again — set after
  // a shot/pass/dribble so the toucher's own kick doesn't immediately
  // re-trigger a decision next tick. See touches.ts.
  touchCooldown: number;
  // Which team last touched the ball, while touchCooldown > 0 — this is
  // who a nearby opponent is pressing/tackling. Null when the ball is
  // fully free (cooldown elapsed, e.g. right after kickoff). See touches.ts.
  possessionTeam: TeamId | null;
  // The player currently dribbling, if any — set when a touch's chosen
  // action is "dribble", cleared on a shot/pass (the ball's been released
  // on purpose) or when nobody's carrying (loose ball). movement.ts reads
  // this to let the carrier run the ball forward instead of holding their
  // formation slot. See touches.ts / decision.ts.
  carrierId: string | null;
}

// Off-ball shape only — not a tactical formation system yet, just enough
// roles to give team shape a keeper vs. outfield distinction.
export type PlayerRole = "keeper" | "back" | "forward";

// The seven settled player attributes (see project decision log). Values
// are 0-100. Only `pace` is consumed by the sim so far; the rest are
// carried now so PlayerState doesn't need a breaking shape change once
// shooting/passing/tackling decisions are built.
export interface PlayerAttributes {
  pace: number;
  shooting: number;
  passing: number;
  tackling: number;
  positioning: number;
  stamina: number;
  goalkeeping: number;
}

export interface PlayerState {
  id: string;
  team: TeamId;
  role: PlayerRole;
  x: number;
  y: number;
  // Formation slot before the ball-tracking shift is applied, as a
  // fraction of the court: x is 0 at this player's own goal, 1 at the
  // opponent's; y is 0..1 across the pitch. See formation.ts.
  homeXFraction: number;
  homeYFraction: number;
  attributes: PlayerAttributes;
}

export interface MatchConfig {
  seed: number;
  court: CourtConfig;
  teamSize: number;
  tickRate: number; // sim ticks per second
}

export interface MatchState {
  config: MatchConfig;
  tick: number;
  elapsedSeconds: number;
  ball: BallState;
  players: PlayerState[];
  score: Record<TeamId, number>;
  rngState: number;
}
