import type { GameState } from "../model";
import { computeBoardHash } from "../util/hash";

export function violatesSimpleKo(state: GameState): boolean {
  if (state.historyBoardHashes.length < 2) {
    return false;
  }
  const newHash = computeBoardHash(state);
  const twoPliesAgo = state.historyBoardHashes[state.historyBoardHashes.length - 2];
  return newHash === twoPliesAgo;
}
