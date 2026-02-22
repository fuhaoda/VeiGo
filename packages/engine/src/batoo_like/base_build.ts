import type { GameState } from "../model";

export function isBaseBuildComplete(state: GameState): boolean {
  return state.baseBuildConfirmed.P1 && state.baseBuildConfirmed.P2;
}
