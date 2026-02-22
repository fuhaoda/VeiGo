import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <main className="page">
      <h1>MiniWeiqi</h1>
      <p>迷你围棋（11x11）P2P 对弈首版：10 位交换码联机。</p>
      <div className="home-actions">
        <Link className="button-link" to="/create">
          创建对局
        </Link>
        <Link className="button-link" to="/join">
          加入对局
        </Link>
        <button type="button" className="button-link disabled" disabled>
          自动匹配（后续版本）
        </button>
      </div>
    </main>
  );
}
