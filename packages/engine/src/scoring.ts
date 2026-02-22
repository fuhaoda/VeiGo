import type { GameState, PlayerId, ScoreBreakdown } from "./model";
import { calculateTerritory } from "./go_core/territory";
import { coordKey } from "./util/coords";

const PLAYERS: PlayerId[] = ["P1", "P2"];

function zeroByPlayer(): Record<PlayerId, number> {
  return { P1: 0, P2: 0 };
}

export function calculateScoreBreakdown(state: GameState): ScoreBreakdown {
  const aliveStones = zeroByPlayer();
  const baseBonus = zeroByPlayer();
  const plusMinusAndScan = zeroByPlayer();

  for (let y = 0; y < state.config.boardSize; y += 1) {
    for (let x = 0; x < state.config.boardSize; x += 1) {
      const id = state.board[y][x];
      if (!id) {
        continue;
      }
      const stone = state.stones[id];
      aliveStones[stone.owner] += 1;
      if (stone.kind === "BASE") {
        baseBonus[stone.owner] += state.config.baseStoneBonus;
      }
    }
  }

  for (const ev of state.scoreEvents) {
    plusMinusAndScan[ev.player] += ev.amount;
  }

  const staticMinus = state.config.map.minusPoints.map(coordKey);
  const minusKeys = new Set<string>([...staticMinus, ...state.dynamicMinusPoints]);
  const territory = calculateTerritory(state, minusKeys);

  const whitePlayer = PLAYERS.find((player) => state.playerColor[player] === "W") ?? "P2";
  const komi = zeroByPlayer();
  komi[whitePlayer] = state.komiAwardToWhite;

  const total = zeroByPlayer();
  for (const p of PLAYERS) {
    total[p] = aliveStones[p] + baseBonus[p] + plusMinusAndScan[p] + territory[p] + komi[p];
  }

  return {
    aliveStones,
    baseBonus,
    plusMinusAndScan,
    territory,
    komi,
    total
  };
}
