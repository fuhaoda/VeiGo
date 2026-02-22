import type { Coord, GameState, PlayerId } from "@miniweiqi/engine";
import { coordKey } from "@miniweiqi/engine";

interface BoardProps {
  state: GameState;
  localPlayer: PlayerId;
  onCellClick: (coord: Coord) => void;
}

export function Board({ state, localPlayer, onCellClick }: BoardProps) {
  const plus = new Set(state.config.map.plusPoints.map(coordKey));
  const minus = new Set([...state.config.map.minusPoints.map(coordKey), ...state.dynamicMinusPoints]);
  const triggered = new Set(state.triggeredPointMarkers);

  return (
    <div className="board-wrap">
      <div className="board-grid" style={{ gridTemplateColumns: `repeat(${state.config.boardSize}, 1fr)` }}>
        {Array.from({ length: state.config.boardSize * state.config.boardSize }).map((_, idx) => {
          const x = idx % state.config.boardSize;
          const y = Math.floor(idx / state.config.boardSize);
          const id = state.board[y][x];
          const key = coordKey({ x, y });
          const mark = plus.has(key) ? "+" : minus.has(key) ? "-" : "";
          const showMark = mark && !triggered.has(key);

          let stoneClass = "";
          let stoneLabel = "";

          if (id) {
            const stone = state.stones[id];
            const visible = stone.visibleTo[localPlayer];
            if (visible) {
              stoneClass = stone.color === "B" ? "stone black" : "stone white";
              if (stone.kind === "BASE") {
                stoneLabel = "基";
              }
              if (stone.kind === "HIDDEN") {
                stoneLabel = "隐";
              }
            }
          }

          return (
            <button key={`${x}-${y}`} className="board-cell" onClick={() => onCellClick({ x, y })} type="button">
              {showMark ? <span className={`point-mark ${mark === "+" ? "plus" : "minus"}`}>{mark}</span> : null}
              {stoneClass ? <span className={stoneClass}>{stoneLabel}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
