import type { Coord, GameState, PlayerId } from "@miniweiqi/engine";

interface MainPlayPanelProps {
  state: GameState;
  localPlayer: PlayerId;
  moveKind: "NORMAL" | "HIDDEN";
  setMoveKind: (kind: "NORMAL" | "HIDDEN") => void;
  pendingHiddenCoord: Coord | null;
  onConfirmHidden: () => void;
  onCancelHidden: () => void;
  scanMode: boolean;
  setScanMode: (v: boolean) => void;
  onPass: () => void;
  onResign: () => void;
}

export function MainPlayPanel({
  state,
  localPlayer,
  moveKind,
  setMoveKind,
  pendingHiddenCoord,
  onConfirmHidden,
  onCancelHidden,
  scanMode,
  setScanMode,
  onPass,
  onResign
}: MainPlayPanelProps) {
  const canUseHidden = !state.hiddenStonePlaced[localPlayer];
  const canScan = state.scanAvailable[localPlayer] && !state.scanUsed[localPlayer];
  const isMyTurn = state.nextToAct === localPlayer;

  return (
    <section className="panel phase-panel">
      <h3>主对局</h3>
      <p>当前{isMyTurn ? "轮到你" : "等待对手"}</p>

      <div className="inline-actions">
        <button type="button" onClick={() => setMoveKind("NORMAL")} className={moveKind === "NORMAL" ? "active" : ""}>
          普通子
        </button>
        <button
          type="button"
          onClick={() => setMoveKind("HIDDEN")}
          className={moveKind === "HIDDEN" ? "active" : ""}
          disabled={!canUseHidden}
        >
          隐藏子（一次）
        </button>
        <button type="button" onClick={() => setScanMode(!scanMode)} className={scanMode ? "active" : ""} disabled={!canScan}>
          查找（-2）
        </button>
      </div>

      {moveKind === "HIDDEN" ? (
        <div className="hidden-confirm">
          <p>隐藏子坐标：{pendingHiddenCoord ? `(${pendingHiddenCoord.x}, ${pendingHiddenCoord.y})` : "未选择"}</p>
          <div className="inline-actions">
            <button type="button" onClick={onConfirmHidden} disabled={!isMyTurn || !pendingHiddenCoord}>
              提交隐藏子
            </button>
            <button type="button" onClick={onCancelHidden} disabled={!pendingHiddenCoord}>
              取消选择
            </button>
          </div>
        </div>
      ) : null}

      <div className="inline-actions">
        <button type="button" onClick={onPass} disabled={!isMyTurn}>
          Pass
        </button>
        <button type="button" onClick={onResign} disabled={!isMyTurn}>
          Resign
        </button>
      </div>
    </section>
  );
}
