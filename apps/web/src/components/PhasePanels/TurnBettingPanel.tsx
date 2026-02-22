interface TurnBettingPanelProps {
  round: 1 | 2;
  bidValue: number;
  setBidValue: (v: number) => void;
  submitted: boolean;
  onSubmit: () => void;
}

export function TurnBettingPanel({ round, bidValue, setBidValue, submitted, onSubmit }: TurnBettingPanelProps) {
  return (
    <section className="panel phase-panel">
      <h3>争先手（第 {round} 轮）</h3>
      <p>出价区间 0-50，高者执黑先行，后手得贴还点。</p>
      <input
        type="number"
        min={0}
        max={50}
        value={bidValue}
        onChange={(e) => setBidValue(Number(e.target.value))}
        disabled={submitted}
      />
      <button type="button" onClick={onSubmit} disabled={submitted}>
        {submitted ? "已提交" : "提交出价"}
      </button>
    </section>
  );
}
