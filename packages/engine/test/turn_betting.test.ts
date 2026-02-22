import { describe, expect, it } from "vitest";
import { applyAction, createInitialState } from "../src";

function prepBidding(seed = 20260222) {
  let state = createInitialState({ seed });
  state = applyAction(state, { type: "PlaceBaseStone", player: "P1", coord: { x: 0, y: 0 } }).nextState;
  state = applyAction(state, { type: "PlaceBaseStone", player: "P1", coord: { x: 1, y: 0 } }).nextState;
  state = applyAction(state, { type: "PlaceBaseStone", player: "P1", coord: { x: 2, y: 0 } }).nextState;
  state = applyAction(state, { type: "PlaceBaseStone", player: "P2", coord: { x: 0, y: 1 } }).nextState;
  state = applyAction(state, { type: "PlaceBaseStone", player: "P2", coord: { x: 1, y: 1 } }).nextState;
  state = applyAction(state, { type: "PlaceBaseStone", player: "P2", coord: { x: 2, y: 1 } }).nextState;
  state = applyAction(state, { type: "ConfirmBaseBuild", player: "P1" }).nextState;
  state = applyAction(state, { type: "ConfirmBaseBuild", player: "P2" }).nextState;
  return state;
}

describe("turn betting", () => {
  it("higher bid gets black and first move, komi to white", () => {
    let state = prepBidding();
    state = applyAction(state, { type: "SubmitBid", player: "P1", round: 1, value: 10 }).nextState;
    state = applyAction(state, { type: "SubmitBid", player: "P2", round: 1, value: 20 }).nextState;

    expect(state.phase).toBe("MAIN_PLAY");
    expect(state.nextToAct).toBe("P2");
    expect(state.playerColor.P2).toBe("B");
    expect(state.playerColor.P1).toBe("W");
    expect(state.komiAwardToWhite).toBe(20);
  });

  it("double tie uses seeded random and second bid as komi", () => {
    let state = prepBidding(1);
    state = applyAction(state, { type: "SubmitBid", player: "P1", round: 1, value: 10 }).nextState;
    state = applyAction(state, { type: "SubmitBid", player: "P2", round: 1, value: 10 }).nextState;

    expect(state.phase).toBe("TURN_BETTING_R2");

    state = applyAction(state, { type: "SubmitBid", player: "P1", round: 2, value: 15 }).nextState;
    state = applyAction(state, { type: "SubmitBid", player: "P2", round: 2, value: 15 }).nextState;

    expect(state.phase).toBe("MAIN_PLAY");
    expect(state.nextToAct).toBe("P1");
    expect(state.playerColor.P1).toBe("B");
    expect(state.komiAwardToWhite).toBe(15);
  });
});
