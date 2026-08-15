import { tickMatch } from "../sim/match";
import type { MatchState } from "../sim/types";

// Accumulator-driven fixed timestep: the sim always advances in whole
// ticks of 1 / tickRate, however ragged requestAnimationFrame's callbacks
// are. speedMultiplier scales how much sim time each real second buys,
// decoupling playback speed from the tick itself.
export class MatchLoop {
  private state: MatchState;
  private accumulatorSeconds = 0;
  private lastFrameMs: number | null = null;
  private rafHandle: number | null = null;
  speedMultiplier = 1;

  constructor(initialState: MatchState, private onFrame: (state: MatchState) => void) {
    this.state = initialState;
  }

  start(): void {
    if (this.rafHandle !== null) return;
    this.lastFrameMs = null;
    this.rafHandle = requestAnimationFrame(this.frame);
  }

  stop(): void {
    if (this.rafHandle !== null) {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
  }

  getState(): MatchState {
    return this.state;
  }

  private frame = (nowMs: number): void => {
    const dtSeconds = this.lastFrameMs === null ? 0 : (nowMs - this.lastFrameMs) / 1000;
    this.lastFrameMs = nowMs;

    this.accumulatorSeconds += dtSeconds * this.speedMultiplier;
    const tickSeconds = 1 / this.state.config.tickRate;

    while (this.accumulatorSeconds >= tickSeconds) {
      this.state = tickMatch(this.state);
      this.accumulatorSeconds -= tickSeconds;
    }

    this.onFrame(this.state);
    this.rafHandle = requestAnimationFrame(this.frame);
  };
}
