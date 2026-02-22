import type { GameState, PlayerId } from "@miniweiqi/engine";

interface BaseBuildPanelProps {
  state: GameState;
  localPlayer: PlayerId;
  onConfirm: () => void;
}

export function BaseBuildPanel({ state, localPlayer, onConfirm }: BaseBuildPanelProps) {
  const selected = state.baseBuildSelections[localPlayer];
  const confirmed = state.baseBuildConfirmed[localPlayer];

  return (
    <section className="panel phase-panel">
      <h3>布局阶段</h3>
      <p>点击棋盘选择你的 3 个基地点。提交前你可见，提交后会隐藏，等待双方揭示。</p>
      <p>
        已选：{selected.length}/{state.config.baseBuildCount}
      </p>
      {confirmed ? <p>你已提交，布局坐标已隐藏。</p> : <p>坐标：{selected.map((c) => `(${c.x},${c.y})`).join(" ") || "无"}</p>}
      <button type="button" onClick={onConfirm} disabled={selected.length !== state.config.baseBuildCount || confirmed}>
        {confirmed ? "已确认" : "确认布局"}
      </button>
    </section>
  );
}
