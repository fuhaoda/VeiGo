import type { EngineEvent, GameState, PlayerId, ScoreBreakdown } from "@miniweiqi/engine";

interface HUDProps {
  state: GameState;
  score: ScoreBreakdown;
  events: EngineEvent[];
  localPlayer: PlayerId;
  remoteStatus: "idle" | "connected" | "closed";
}

export function HUD({ state, score, events, localPlayer, remoteStatus }: HUDProps) {
  return (
    <aside className="hud">
      <section className="panel">
        <h3>对局状态</h3>
        <p>当前阶段：{state.phase}</p>
        <p>你的身份：{localPlayer}</p>
        <p>轮到：{state.nextToAct}</p>
        <p>连接：{remoteStatus}</p>
      </section>

      <section className="panel">
        <h3>即时分数</h3>
        <p>P1: {score.total.P1}</p>
        <p>P2: {score.total.P2}</p>
        {state.phase === "ENDED" && state.winner ? <p>胜者：{state.winner}</p> : null}
      </section>

      <section className="panel">
        <h3>事件流水</h3>
        <ul className="event-list">
          {events.length === 0 ? <li>暂无事件</li> : null}
          {events.map((ev, idx) => (
            <li key={`${idx}-${ev.type}`}>{formatEvent(ev)}</li>
          ))}
        </ul>
      </section>
    </aside>
  );
}

function formatEvent(ev: EngineEvent): string {
  if (ev.type === "SCORE_DELTA") {
    return `${ev.player} ${ev.reason}: ${ev.amount > 0 ? "+" : ""}${ev.amount}`;
  }
  if (ev.type === "CAPTURE") {
    return `${ev.by} 提子 ${ev.stoneIds.length} 颗`;
  }
  if (ev.type === "REVEAL") {
    return `${ev.player} 隐藏子显露 (${ev.reason})`;
  }
  if (ev.type === "PHASE_CHANGE") {
    return `阶段切换到 ${ev.phase}`;
  }
  return `终局 (${ev.reason})`;
}
