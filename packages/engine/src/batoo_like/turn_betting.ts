import type { GameState } from "../model";

export function getCurrentBidRound(state: GameState): 1 | 2 | null {
  if (state.phase === "TURN_BETTING_R1") {
    return 1;
  }
  if (state.phase === "TURN_BETTING_R2") {
    return 2;
  }
  return null;
}
