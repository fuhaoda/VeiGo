import { describe, expect, it } from "vitest";
import { applyAction, computeBoardHash, createInitialState, type GameState } from "../src";

function withStone(state: GameState, id: string, owner: "P1" | "P2", x: number, y: number): void {
  state.stones[id] = {
    id,
    owner,
    color: state.playerColor[owner],
    kind: "NORMAL",
    coord: { x, y },
    visibleTo: { P1: true, P2: true }
  };
  state.board[y][x] = id;
}

describe("capture and ko", () => {
  it("captures chains with no liberties", () => {
    let state = createInitialState({ boardSize: 5, map: { size: 5, plusPoints: [], minusPoints: [] } });
    state.phase = "MAIN_PLAY";
    state.nextToAct = "P1";

    withStone(state, "W", "P2", 1, 1);
    withStone(state, "B1", "P1", 1, 0);
    withStone(state, "B2", "P1", 0, 1);
    withStone(state, "B3", "P1", 2, 1);
    state.historyBoardHashes = [computeBoardHash(state), computeBoardHash(state)];

    const result = applyAction(state, { type: "PlaceStone", player: "P1", coord: { x: 1, y: 2 }, kind: "NORMAL" });
    expect(result.events.some((ev) => ev.type === "CAPTURE")).toBe(true);
    expect(result.nextState.board[1][1]).toBeNull();
  });

  it("prevents immediate ko recapture", () => {
    let state = createInitialState({ boardSize: 5, map: { size: 5, plusPoints: [], minusPoints: [] } });
    state.phase = "MAIN_PLAY";
    state.nextToAct = "P1";

    withStone(state, "B_a", "P1", 1, 0);
    withStone(state, "B_b", "P1", 0, 1);
    withStone(state, "B_c", "P1", 2, 1);
    withStone(state, "W_t", "P2", 1, 1);
    withStone(state, "W_x", "P2", 0, 2);
    withStone(state, "W_y", "P2", 2, 2);
    withStone(state, "W_z", "P2", 1, 3);

    const original = computeBoardHash(state);
    state.historyBoardHashes = ["seed", original];

    state = applyAction(state, { type: "PlaceStone", player: "P1", coord: { x: 1, y: 2 }, kind: "NORMAL" }).nextState;
    expect(state.board[1][1]).toBeNull();

    expect(() =>
      applyAction(state, { type: "PlaceStone", player: "P2", coord: { x: 1, y: 1 }, kind: "NORMAL" })
    ).toThrow(/ko/i);
  });
});
