import { describe, expect, it } from "vitest";
import { calculateScoreBreakdown, createInitialState, type GameState } from "../src";

function withStone(state: GameState, id: string, owner: "P1" | "P2", kind: "NORMAL" | "BASE", x: number, y: number): void {
  state.stones[id] = {
    id,
    owner,
    color: state.playerColor[owner],
    kind,
    coord: { x, y },
    visibleTo: { P1: true, P2: true }
  };
  state.board[y][x] = id;
}

describe("final scoring", () => {
  it("counts alive stones, base bonus, plus/minus, territory minus exclusion, komi", () => {
    const state = createInitialState({
      boardSize: 3,
      map: {
        size: 3,
        plusPoints: [],
        minusPoints: [{ x: 1, y: 1 }]
      }
    });

    state.phase = "ENDED";
    state.komiAwardToWhite = 7;
    state.playerColor = { P1: "B", P2: "W" };

    withStone(state, "P1_BASE", "P1", "BASE", 0, 0);
    withStone(state, "P1_A", "P1", "NORMAL", 1, 0);
    withStone(state, "P1_B", "P1", "NORMAL", 0, 1);
    withStone(state, "P1_C", "P1", "NORMAL", 2, 1);
    withStone(state, "P1_D", "P1", "NORMAL", 1, 2);
    withStone(state, "P2_A", "P2", "NORMAL", 2, 2);

    state.scoreEvents.push({ type: "PLUS", player: "P1", amount: 5, turnIndex: 1 });
    state.scoreEvents.push({ type: "SCAN_COST", player: "P2", amount: -2, turnIndex: 2 });

    const score = calculateScoreBreakdown(state);

    expect(score.aliveStones).toEqual({ P1: 5, P2: 1 });
    expect(score.baseBonus).toEqual({ P1: 4, P2: 0 });
    expect(score.plusMinusAndScan).toEqual({ P1: 5, P2: -2 });
    expect(score.territory.P1).toBe(1);
    expect(score.komi).toEqual({ P1: 0, P2: 7 });
    expect(score.total).toEqual({ P1: 15, P2: 6 });
  });
});
