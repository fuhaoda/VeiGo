import { applyAction, createInitialState, type Action, type GameConfig, type GameState } from "../src";

export function run(state: GameState, action: Action): GameState {
  return applyAction(state, action).nextState;
}

export function enterMainPlay(config?: Partial<GameConfig>): GameState {
  let state = createInitialState(config);
  const size = state.config.boardSize;
  state = run(state, { type: "PlaceBaseStone", player: "P1", coord: { x: 0, y: 0 } });
  state = run(state, { type: "PlaceBaseStone", player: "P1", coord: { x: size - 1, y: 0 } });
  state = run(state, { type: "PlaceBaseStone", player: "P1", coord: { x: 0, y: size - 1 } });
  state = run(state, { type: "PlaceBaseStone", player: "P2", coord: { x: size - 1, y: size - 1 } });
  state = run(state, { type: "PlaceBaseStone", player: "P2", coord: { x: size - 1, y: 1 } });
  state = run(state, { type: "PlaceBaseStone", player: "P2", coord: { x: 1, y: size - 1 } });
  state = run(state, { type: "ConfirmBaseBuild", player: "P1" });
  state = run(state, { type: "ConfirmBaseBuild", player: "P2" });
  state = run(state, { type: "SubmitBid", player: "P1", round: 1, value: 20 });
  state = run(state, { type: "SubmitBid", player: "P2", round: 1, value: 10 });
  return state;
}
