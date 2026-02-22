import type { Coord, GameState, PlayerId } from "@miniweiqi/engine";
import { coordKey } from "@miniweiqi/engine";

interface BoardProps {
  state: GameState;
  localPlayer: PlayerId;
  basePreviewCoords?: Coord[];
  onCellClick: (coord: Coord) => void;
}

function getStarPointKeys(size: number): Set<string> {
  const points: Coord[] = [];
  if (size === 11) {
    points.push({ x: 3, y: 3 }, { x: 7, y: 3 }, { x: 5, y: 5 }, { x: 3, y: 7 }, { x: 7, y: 7 });
  } else if (size === 9) {
    points.push({ x: 2, y: 2 }, { x: 6, y: 2 }, { x: 4, y: 4 }, { x: 2, y: 6 }, { x: 6, y: 6 });
  } else if (size >= 5) {
    const c = Math.floor(size / 2);
    points.push({ x: c, y: c });
  }
  return new Set(points.map(coordKey));
}

export function Board({ state, localPlayer, basePreviewCoords = [], onCellClick }: BoardProps) {
  const plus = new Set(state.config.map.plusPoints.map(coordKey));
  const minus = new Set([...state.config.map.minusPoints.map(coordKey), ...state.dynamicMinusPoints]);
  const triggered = new Set(state.triggeredPointMarkers);
  const starPoints = getStarPointKeys(state.config.boardSize);
  const previewKeys = new Set(basePreviewCoords.map(coordKey));
  const previewColor = state.playerColor[localPlayer];

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
          const isStar = starPoints.has(key);

          let stoneClass = "";

          if (id) {
            const stone = state.stones[id];
            const visible = stone.visibleTo[localPlayer];
            if (visible) {
              stoneClass = stone.color === "B" ? "stone black" : "stone white";
            }
          } else if (previewKeys.has(key)) {
            stoneClass = previewColor === "B" ? "stone black preview" : "stone white preview";
          }

          const cellClass = [
            "board-cell",
            x === 0 ? "edge-left" : "",
            x === state.config.boardSize - 1 ? "edge-right" : "",
            y === 0 ? "edge-top" : "",
            y === state.config.boardSize - 1 ? "edge-bottom" : ""
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button key={`${x}-${y}`} className={cellClass} onClick={() => onCellClick({ x, y })} type="button">
              <span className="line line-h" />
              <span className="line line-v" />
              {isStar ? <span className="star-point" /> : null}
              {showMark ? <span className={`point-mark ${mark === "+" ? "plus" : "minus"}`}>{mark}</span> : null}
              {stoneClass ? <span className={stoneClass} /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
