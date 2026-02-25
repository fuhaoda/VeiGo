import { describe, expect, it } from "vitest";
import { applyAction } from "../src";
import { enterMainPlay } from "./helpers";

describe("hidden stone and scan", () => {
  it("hidden stone invisible to both players until reveal, and scan miss costs -2", () => {
    let state = enterMainPlay({ boardSize: 5, map: { size: 5, plusPoints: [], minusPoints: [] } });

    state = applyAction(state, { type: "PlaceStone", player: "P1", coord: { x: 2, y: 2 }, kind: "HIDDEN" }).nextState;
    const hid = state.board[2][2] as string;
    expect(state.stones[hid].visibleTo.P1).toBe(false);
    expect(state.stones[hid].visibleTo.P2).toBe(false);
    expect(state.scanAvailable.P2).toBe(true);

    state = applyAction(state, { type: "Scan", player: "P2", coord: { x: 0, y: 4 } }).nextState;
    expect(state.scanUsed.P2).toBe(true);
    expect(state.scoreEvents.at(-1)?.amount).toBe(-2);
    expect(state.stones[hid].visibleTo.P2).toBe(false);
  });

  it("scan hit reveals hidden stone", () => {
    let state = enterMainPlay({ boardSize: 5, map: { size: 5, plusPoints: [], minusPoints: [] } });

    state = applyAction(state, { type: "PlaceStone", player: "P1", coord: { x: 2, y: 2 }, kind: "HIDDEN" }).nextState;
    const hid = state.board[2][2] as string;

    const result = applyAction(state, { type: "Scan", player: "P2", coord: { x: 2, y: 2 } });
    state = result.nextState;

    expect(state.stones[hid].visibleTo.P2).toBe(true);
    expect(result.events.some((ev) => ev.type === "REVEAL" && ev.reason === "SCAN_HIT")).toBe(true);
  });

  it("hidden stone participating in capture gets revealed", () => {
    let state = enterMainPlay({ boardSize: 5, map: { size: 5, plusPoints: [], minusPoints: [] } });

    state = applyAction(state, { type: "PlaceStone", player: "P1", coord: { x: 1, y: 1 }, kind: "HIDDEN" }).nextState;
    const hiddenId = state.board[1][1] as string;

    state = applyAction(state, { type: "PlaceStone", player: "P2", coord: { x: 1, y: 2 }, kind: "NORMAL" }).nextState;
    state = applyAction(state, { type: "PlaceStone", player: "P1", coord: { x: 0, y: 2 }, kind: "NORMAL" }).nextState;
    state = applyAction(state, { type: "PlaceStone", player: "P2", coord: { x: 3, y: 3 }, kind: "NORMAL" }).nextState;
    state = applyAction(state, { type: "PlaceStone", player: "P1", coord: { x: 2, y: 2 }, kind: "NORMAL" }).nextState;
    state = applyAction(state, { type: "PlaceStone", player: "P2", coord: { x: 3, y: 4 }, kind: "NORMAL" }).nextState;

    const result = applyAction(state, { type: "PlaceStone", player: "P1", coord: { x: 1, y: 3 }, kind: "NORMAL" });

    expect(result.events.some((ev) => ev.type === "REVEAL" && ev.stoneId === hiddenId && ev.reason === "HIDDEN_CAPTURE")).toBe(true);
    expect(result.nextState.stones[hiddenId].visibleTo.P2).toBe(true);
  });
});
