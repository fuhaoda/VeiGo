import type { GameState, PlayerId } from "../model";

export function canScan(state: GameState, player: PlayerId): boolean {
  return state.phase === "MAIN_PLAY" && state.nextToAct === player && state.scanAvailable[player] && !state.scanUsed[player];
}
