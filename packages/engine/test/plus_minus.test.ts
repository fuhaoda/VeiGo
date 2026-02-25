import { describe, expect, it } from "vitest";
import { applyAction, createInitialState, type GameState } from "../src";
import { enterMainPlay } from "./helpers";

function forceRemoveAt(state: GameState, x: number, y: number): GameState {
  const next = structuredClone(state);
  const id = next.board[y][x];
  if (id) {
    next.board[y][x] = null;
    delete next.stones[id];
  }
  return next;
}

describe("plus/minus points", () => {
  it("uses the default 11x11 map points from game rules", () => {
    const state = createInitialState();
    expect(state.config.map.minusPoints).toEqual([
      { x: 2, y: 2 },
      { x: 2, y: 8 },
      { x: 8, y: 2 },
      { x: 8, y: 8 }
    ]);
    expect(state.config.map.plusPoints).toEqual([
      { x: 0, y: 5 },
      { x: 5, y: 0 },
      { x: 10, y: 5 },
      { x: 5, y: 10 }
    ]);
  });

  it("triggers only once per point even if occupied again later", () => {
    let state = enterMainPlay({
      boardSize: 5,
      map: {
        size: 5,
        plusPoints: [{ x: 1, y: 1 }],
        minusPoints: []
      }
    });

    state = applyAction(state, { type: "PlaceStone", player: "P1", coord: { x: 1, y: 1 }, kind: "NORMAL" }).nextState;
    expect(state.scoreEvents.at(-1)?.amount).toBe(5);

    state = applyAction(state, { type: "PlaceStone", player: "P2", coord: { x: 3, y: 3 }, kind: "NORMAL" }).nextState;

    // Simulate later occupancy change (capture/removal) and re-placement.
    state = forceRemoveAt(state, 1, 1);
    state = applyAction(state, { type: "PlaceStone", player: "P1", coord: { x: 1, y: 1 }, kind: "NORMAL" }).nextState;

    const plusEvents = state.scoreEvents.filter((ev) => ev.amount === 5);
    expect(plusEvents).toHaveLength(1);
  });
});
