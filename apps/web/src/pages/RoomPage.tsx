import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Coord } from "@miniweiqi/engine";
import { BaseBuildPanel } from "../components/PhasePanels/BaseBuildPanel";
import { MainPlayPanel } from "../components/PhasePanels/MainPlayPanel";
import { TurnBettingPanel } from "../components/PhasePanels/TurnBettingPanel";
import { Board } from "../components/Board";
import { HUD } from "../components/HUD";
import { clearSession, getSession } from "../net/sessionStore";
import { useGameController } from "../state/useGameController";

export function RoomPage() {
  const { roomId } = useParams();
  const session = useMemo(() => getSession(), []);
  const { state, score, events, error, remoteStatus, localPlayer, dispatchLocalAction } = useGameController(session);

  const [bidValue, setBidValue] = useState(10);
  const [moveKind, setMoveKind] = useState<"NORMAL" | "HIDDEN">("NORMAL");
  const [pendingHiddenCoord, setPendingHiddenCoord] = useState<Coord | null>(null);
  const [scanMode, setScanMode] = useState(false);
  const isBaseConfirmed = state.baseBuildConfirmed[localPlayer];
  const basePreviewCoords =
    state.phase === "BASE_BUILD" && !isBaseConfirmed ? state.baseBuildSelections[localPlayer] : [];
  const movePreviewCoords =
    state.phase === "MAIN_PLAY" && moveKind === "HIDDEN" && pendingHiddenCoord ? [pendingHiddenCoord] : [];

  useEffect(() => {
    if (state.phase !== "MAIN_PLAY" || moveKind !== "HIDDEN") {
      setPendingHiddenCoord(null);
    }
  }, [state.phase, moveKind]);

  useEffect(() => {
    if (state.nextToAct !== localPlayer) {
      setPendingHiddenCoord(null);
    }
  }, [state.nextToAct, localPlayer]);

  if (!session) {
    return (
      <main className="page narrow">
        <h1>房间不可用</h1>
        <p>未检测到活跃会话，请从创建/加入页面进入。</p>
        <Link to="/">返回首页</Link>
      </main>
    );
  }

  const onBoardClick = (coord: Coord) => {
    if (state.phase === "BASE_BUILD") {
      if (isBaseConfirmed) {
        return;
      }
      dispatchLocalAction({ type: "PlaceBaseStone", player: localPlayer, coord });
      return;
    }

    if (state.phase !== "MAIN_PLAY") {
      return;
    }

    if (state.nextToAct !== localPlayer) {
      return;
    }

    if (scanMode) {
      dispatchLocalAction({ type: "Scan", player: localPlayer, coord });
      setScanMode(false);
      return;
    }

    if (moveKind === "HIDDEN") {
      if (state.nextToAct !== localPlayer) {
        return;
      }
      setPendingHiddenCoord(coord);
      return;
    }

    dispatchLocalAction({ type: "PlaceStone", player: localPlayer, coord, kind: moveKind });
  };

  const submitHiddenStone = () => {
    if (!pendingHiddenCoord) {
      return;
    }
    dispatchLocalAction({ type: "PlaceStone", player: localPlayer, coord: pendingHiddenCoord, kind: "HIDDEN" });
    setPendingHiddenCoord(null);
    setMoveKind("NORMAL");
  };

  const renderPhasePanel = () => {
    if (state.phase === "BASE_BUILD") {
      return (
        <BaseBuildPanel
          state={state}
          localPlayer={localPlayer}
          onConfirm={() => dispatchLocalAction({ type: "ConfirmBaseBuild", player: localPlayer })}
        />
      );
    }

    if (state.phase === "TURN_BETTING_R1" || state.phase === "TURN_BETTING_R2") {
      const round = state.phase === "TURN_BETTING_R1" ? 1 : 2;
      const bidValueForLocal = (round === 1 ? state.bids.r1?.[localPlayer] : state.bids.r2?.[localPlayer]) ?? -1;
      const submitted = bidValueForLocal >= state.config.bidMin;
      return (
        <TurnBettingPanel
          round={round}
          bidValue={bidValue}
          setBidValue={setBidValue}
          submitted={Boolean(submitted)}
          onSubmit={() => dispatchLocalAction({ type: "SubmitBid", player: localPlayer, round, value: bidValue })}
        />
      );
    }

    if (state.phase === "MAIN_PLAY") {
      return (
        <MainPlayPanel
          state={state}
          localPlayer={localPlayer}
          moveKind={moveKind}
          setMoveKind={setMoveKind}
          pendingHiddenCoord={pendingHiddenCoord}
          onConfirmHidden={submitHiddenStone}
          onCancelHidden={() => setPendingHiddenCoord(null)}
          scanMode={scanMode}
          setScanMode={setScanMode}
          onPass={() => dispatchLocalAction({ type: "Pass", player: localPlayer })}
          onResign={() => dispatchLocalAction({ type: "Resign", player: localPlayer })}
        />
      );
    }

    return (
      <section className="panel phase-panel">
        <h3>对局结束</h3>
        <p>原因：{state.endReason ?? "完成"}</p>
        <p>胜者：{state.winner ?? "平局"}</p>
      </section>
    );
  };

  return (
    <main className="page room">
      <header className="room-head">
        <h1>房间 {roomId ?? session.roomId}</h1>
        <div className="room-links">
          <button
            type="button"
            onClick={() => {
              clearSession();
              window.location.hash = "#/";
            }}
          >
            离开对局
          </button>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <section className="room-content">
        <div className="left-column">
          {renderPhasePanel()}
          <Board
            state={state}
            localPlayer={localPlayer}
            basePreviewCoords={basePreviewCoords}
            movePreviewCoords={movePreviewCoords}
            movePreviewKind={moveKind}
            onCellClick={onBoardClick}
          />
        </div>
        <HUD state={state} score={score} events={events} localPlayer={localPlayer} remoteStatus={remoteStatus} />
      </section>
    </main>
  );
}
