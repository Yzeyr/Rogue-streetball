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

// Placeholder entity for a crew member on the court. Position is static
// for now — movement/decision-making is an open design question (see
// project section 10) and is not implemented yet.
export interface PlayerState {
  id: string;
  team: TeamId;
  x: number;
  y: number;
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
