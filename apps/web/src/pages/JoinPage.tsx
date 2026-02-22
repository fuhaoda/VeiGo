import { useState } from "react";
import Peer from "peerjs";
import { Link, useNavigate } from "react-router-dom";
import { buildSessionCloser, isValidExchangeCode, normalizeExchangeCode } from "../net/peer";
import { clearSession, setSession } from "../net/sessionStore";

export function JoinPage() {
  const [exchangeCode, setExchangeCode] = useState("");
  const [status, setStatus] = useState("未连接");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const navigate = useNavigate();

  const handleJoin = () => {
    const code = normalizeExchangeCode(exchangeCode);
    if (!isValidExchangeCode(code)) {
      setError("交换码必须是 10 位（A-Z, 2-9）");
      return;
    }

    clearSession();
    setWorking(true);
    setError(null);
    setStatus("正在连接房间...");

    const peer = new Peer();

    peer.on("open", () => {
      const conn = peer.connect(code, { reliable: true });

      conn.on("open", () => {
        setSession({
          roomId: code,
          role: "GUEST",
          peer,
          channel: conn,
          close: buildSessionCloser(peer, conn)
        });
        navigate(`/room/${code}`);
      });

      conn.on("error", (connErr) => {
        setWorking(false);
        setStatus("连接失败");
        setError(connErr?.message ?? "连接对手失败");
        try {
          peer.destroy();
        } catch {
          // no-op
        }
      });
    });

    peer.on("error", (err: unknown) => {
      const maybeErr = err as { message?: string };
      setWorking(false);
      setStatus("连接失败");
      setError(maybeErr.message ?? "连接失败");
      try {
        peer.destroy();
      } catch {
        // no-op
      }
    });
  };

  return (
    <main className="page narrow">
      <h1>加入对局</h1>
      <p>输入对方给你的 10 位交换码。</p>
      <input
        value={exchangeCode}
        onChange={(e) => setExchangeCode(e.target.value.toUpperCase())}
        placeholder="例如 ABCD23EFGH"
        maxLength={10}
      />

      <button type="button" onClick={handleJoin} disabled={working}>
        {working ? "连接中..." : "加入对局"}
      </button>

      <p>状态：{status}</p>
      {error ? <p className="error">{error}</p> : null}
      <Link to="/">返回首页</Link>
    </main>
  );
}
