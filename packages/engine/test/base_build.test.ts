import { describe, expect, it } from "vitest";
import { applyAction, createInitialState, coordKey } from "../src";

describe("base build", () => {
  it("resolves overlap into dynamic minus point", () => {
    let state = createInitialState();

    state = applyAction(state, { type: "PlaceBaseStone", player: "P1", coord: { x: 1, y: 1 } }).nextState;
    state = applyAction(state, { type: "PlaceBaseStone", player: "P1", coord: { x: 2, y: 2 } }).nextState;
    state = applyAction(state, { type: "PlaceBaseStone", player: "P1", coord: { x: 3, y: 3 } }).nextState;

    state = applyAction(state, { type: "PlaceBaseStone", player: "P2", coord: { x: 1, y: 1 } }).nextState;
    state = applyAction(state, { type: "PlaceBaseStone", player: "P2", coord: { x: 4, y: 4 } }).nextState;
    state = applyAction(state, { type: "PlaceBaseStone", player: "P2", coord: { x: 5, y: 5 } }).nextState;

    state = applyAction(state, { type: "ConfirmBaseBuild", player: "P1" }).nextState;
    state = applyAction(state, { type: "ConfirmBaseBuild", player: "P2" }).nextState;

    expect(state.phase).toBe("TURN_BETTING_R1");
    expect(state.board[1][1]).toBeNull();
    expect(state.dynamicMinusPoints).toContain(coordKey({ x: 1, y: 1 }));
    expect(Object.keys(state.stones)).toHaveLength(4);
  });
});
