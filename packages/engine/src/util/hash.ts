import type { GameState } from "../model";

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function sortedRecord<T>(record: Record<string, T>): Record<string, T> {
  return Object.keys(record)
    .sort()
    .reduce<Record<string, T>>((acc, k) => {
      acc[k] = record[k];
      return acc;
    }, {});
}

export function computeBoardHash(state: GameState): string {
  const rows: string[] = [];
  for (let y = 0; y < state.config.boardSize; y += 1) {
    let row = "";
    for (let x = 0; x < state.config.boardSize; x += 1) {
      const id = state.board[y][x];
      if (!id) {
        row += ".";
        continue;
      }
      const stone = state.stones[id];
      row += `${stone.owner}${stone.kind[0]}`;
    }
    rows.push(row);
  }
  return fnv1a(rows.join("|"));
}

export function computeStateHash(state: GameState): string {
  const payload = {
    phase: state.phase,
    board: state.board,
    stones: sortedRecord(state.stones),
    dynamicMinusPoints: [...state.dynamicMinusPoints].sort(),
    triggeredPointMarkers: [...state.triggeredPointMarkers].sort(),
    baseBuildSelections: state.baseBuildSelections,
    baseBuildConfirmed: state.baseBuildConfirmed,
    bids: state.bids,
    komiAwardToWhite: state.komiAwardToWhite,
    playerColor: state.playerColor,
    nextToAct: state.nextToAct,
    hiddenStonePlaced: state.hiddenStonePlaced,
    scanAvailable: state.scanAvailable,
    scanUsed: state.scanUsed,
    consecutivePasses: state.consecutivePasses,
    scoreEvents: state.scoreEvents,
    moveIndex: state.moveIndex,
    historyBoardHashes: state.historyBoardHashes,
    rngSeed: state.rngSeed,
    winner: state.winner,
    endReason: state.endReason,
    finalScore: state.finalScore
  };
  return fnv1a(JSON.stringify(payload));
}
