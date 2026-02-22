import type { Coord, GameState, PlayerId } from "../model";
import { coordKey, neighbors } from "../util/coords";

export interface TerritoryResult {
  P1: number;
  P2: number;
}

export function calculateTerritory(state: GameState, minusPointKeys: Set<string>): TerritoryResult {
  const visited = new Set<string>();
  const score: TerritoryResult = { P1: 0, P2: 0 };

  for (let y = 0; y < state.config.boardSize; y += 1) {
    for (let x = 0; x < state.config.boardSize; x += 1) {
      if (state.board[y][x]) {
        continue;
      }
      const start: Coord = { x, y };
      const startKey = coordKey(start);
      if (visited.has(startKey)) {
        continue;
      }

      const queue: Coord[] = [start];
      const region: Coord[] = [];
      const borderOwners = new Set<PlayerId>();

      while (queue.length > 0) {
        const c = queue.shift() as Coord;
        const key = coordKey(c);
        if (visited.has(key)) {
          continue;
        }
        visited.add(key);

        const id = state.board[c.y][c.x];
        if (id) {
          borderOwners.add(state.stones[id].owner);
          continue;
        }

        region.push(c);
        for (const n of neighbors(c, state.config.boardSize)) {
          if (!visited.has(coordKey(n))) {
            queue.push(n);
          }
        }
      }

      if (borderOwners.size === 1) {
        const owner = [...borderOwners][0];
        const usable = region.filter((coord) => !minusPointKeys.has(coordKey(coord))).length;
        score[owner] += usable;
      }
    }
  }

  return score;
}
