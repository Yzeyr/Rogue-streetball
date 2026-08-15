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
