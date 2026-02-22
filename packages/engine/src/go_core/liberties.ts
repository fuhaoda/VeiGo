import type { Coord, GameState } from "../model";
import { neighbors, coordKey, parseCoordKey } from "../util/coords";

export function getLibertiesForChain(state: GameState, chain: Coord[]): Coord[] {
  const libertyKeys = new Set<string>();
  for (const c of chain) {
    for (const n of neighbors(c, state.config.boardSize)) {
      if (!state.board[n.y][n.x]) {
        libertyKeys.add(coordKey(n));
      }
    }
  }
  return [...libertyKeys].map(parseCoordKey);
}
