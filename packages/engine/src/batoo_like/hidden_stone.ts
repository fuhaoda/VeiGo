import type { GameState, PlayerId } from "../model";

export function canPlaceHiddenStone(state: GameState, player: PlayerId): boolean {
  return state.phase === "MAIN_PLAY" && !state.hiddenStonePlaced[player] && state.nextToAct === player;
}
