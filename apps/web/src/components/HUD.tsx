import type { EngineEvent, GameState, PlayerId, ScoreBreakdown } from "@miniweiqi/engine";
import type { ByoyomiState } from "../state/useGameController";

interface HUDProps {
  state: GameState;
  score: ScoreBreakdown;
  byoyomi: ByoyomiState;
  events: EngineEvent[];
  localPlayer: PlayerId;
  remoteStatus: "idle" | "connected" | "closed";
}

function labelByPlayer(state: GameState, player: PlayerId): string {
  return state.playerColor[player] === "B" ? "黑棋" : "白棋";
}

function playerByColor(state: GameState, color: "B" | "W"): PlayerId {
  return state.playerColor.P1 === color ? "P1" : "P2";
}

function formatReason(reason: string): string {
  const mapping: Record<string, string> = {
    PLUS_POINT: "加点",
    MINUS_POINT: "减点",
    SCAN_COST: "查找",
    BASE_CAPTURE: "提基地子"
  };
  return mapping[reason] ?? reason;
}

export function HUD({ state, score, byoyomi, events, localPlayer, remoteStatus }: HUDProps) {
  const blackPlayer = playerByColor(state, "B");
  const whitePlayer = playerByColor(state, "W");
  const localColorLabel = labelByPlayer(state, localPlayer);
  const turnColorLabel = labelByPlayer(state, state.nextToAct);
  const winnerLabel = state.winner ? labelByPlayer(state, state.winner) : "平局";
  const blackClock = byoyomi.players[blackPlayer];
  const whiteClock = byoyomi.players[whitePlayer];
  const realtimeScore = {
    [blackPlayer]:
      score.aliveStones[blackPlayer] +
      score.baseBonus[blackPlayer] +
      score.plusMinusAndScan[blackPlayer] +
      score.komi[blackPlayer],
    [whitePlayer]:
      score.aliveStones[whitePlayer] +
      score.baseBonus[whitePlayer] +
      score.plusMinusAndScan[whitePlayer] +
      score.komi[whitePlayer]
  } as const;

  return (
    <aside className="hud">
      <section className="panel">
        <h3>对局状态</h3>
        <p>当前阶段：{state.phase}</p>
        <p>你的执色：{localColorLabel}</p>
        <p>轮到：{turnColorLabel}</p>
        <p>连接：{remoteStatus}</p>
      </section>

      <section className="panel">
        <h3>盘面即时分</h3>
        <p>黑棋：{realtimeScore[blackPlayer]}</p>
        <p>白棋：{realtimeScore[whitePlayer]}</p>
        <p className="score-note">口径：不算围空（按视频“占领点数”口径）</p>
      </section>

      <section className="panel">
        <h3>终局分</h3>
        {state.phase === "ENDED" ? (
          <>
            <p>黑棋：{score.total[blackPlayer]}</p>
            <p>白棋：{score.total[whitePlayer]}</p>
            <p>胜者：{winnerLabel}</p>
          </>
        ) : (
          <p>对局结束后显示（含围空）。</p>
        )}
      </section>

      <section className="panel">
        <h3>读秒</h3>
        <p>
          黑棋：{blackClock.secondsLeft}s（剩 {blackClock.periodsLeft} 次）
          {byoyomi.activePlayer === blackPlayer ? " ← 当前" : ""}
        </p>
        <p>
          白棋：{whiteClock.secondsLeft}s（剩 {whiteClock.periodsLeft} 次）
          {byoyomi.activePlayer === whitePlayer ? " ← 当前" : ""}
        </p>
      </section>

      <section className="panel">
        <h3>事件流水</h3>
        <ul className="event-list">
          {events.length === 0 ? <li>暂无事件</li> : null}
          {events.map((ev, idx) => (
            <li key={`${idx}-${ev.type}`}>{formatEvent(ev, state)}</li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

function formatEvent(ev: EngineEvent, state: GameState): string {
  if (ev.type === "SCORE_DELTA") {
    return `${labelByPlayer(state, ev.player)} ${formatReason(ev.reason)}: ${ev.amount > 0 ? "+" : ""}${ev.amount}`;
  }
  if (ev.type === "CAPTURE") {
    return `${labelByPlayer(state, ev.by)} 提子 ${ev.stoneIds.length} 颗`;
  }
  if (ev.type === "REVEAL") {
    return `${labelByPlayer(state, ev.player)} 隐藏子显露 (${ev.reason})`;
  }
  if (ev.type === "PHASE_CHANGE") {
    return `阶段切换到 ${ev.phase}`;
  }
  return `终局 (${ev.reason})`;
}
