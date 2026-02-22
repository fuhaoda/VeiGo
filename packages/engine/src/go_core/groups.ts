import type { Coord, GameState } from "../model";
import { coordKey, neighbors } from "../util/coords";

export function getChain(state: GameState, start: Coord): Coord[] {
  const id = state.board[start.y][start.x];
  if (!id) {
    return [];
  }

  const owner = state.stones[id].owner;
  const visited = new Set<string>();
  const queue: Coord[] = [start];
  const result: Coord[] = [];

  while (queue.length > 0) {
    const c = queue.shift() as Coord;
    const key = coordKey(c);
    if (visited.has(key)) {
      continue;
    }
    visited.add(key);
    const curId = state.board[c.y][c.x];
    if (!curId || state.stones[curId].owner !== owner) {
      continue;
    }
    result.push(c);
    for (const n of neighbors(c, state.config.boardSize)) {
      if (!visited.has(coordKey(n))) {
        queue.push(n);
      }
    }
  }

  return result;
}
