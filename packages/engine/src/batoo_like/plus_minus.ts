import type { GameState } from "../model";

export function isPointTriggered(state: GameState, key: string): boolean {
  return state.triggeredPointMarkers.includes(key);
}
