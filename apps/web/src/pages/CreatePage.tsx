import { useState } from "react";
import Peer from "peerjs";
import { Link, useNavigate } from "react-router-dom";
import { buildSessionCloser, generateExchangeCode } from "../net/peer";
import { clearSession, setSession } from "../net/sessionStore";

export function CreatePage() {
  const [exchangeCode, setExchangeCode] = useState("");
  const [status, setStatus] = useState("未创建房间");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [working, setWorking] = useState(false);
  const navigate = useNavigate();

  const createHost = (attempt = 0) => {
    const code = generateExchangeCode(10);
    const peer = new Peer(code);

    peer.on("open", () => {
      setExchangeCode(code);
      setStatus("房间已创建，等待对手输入交换码加入...");
      setWorking(false);
    });

    peer.on("error", (err: unknown) => {
      const maybeErr = err as { type?: string; message?: string };
      if (maybeErr.type === "unavailable-id" && attempt < 5) {
        try {
          peer.destroy();
        } catch {
          // no-op
        }
        createHost(attempt + 1);
        return;
      }

      setWorking(false);
      setError(maybeErr.message ?? "创建房间失败");
    });

    peer.on("connection", (conn) => {
      setStatus("检测到对手，正在建立连接...");

      conn.on("open", () => {
        setSession({
          roomId: code,
          role: "HOST",
          peer,
          channel: conn,
          close: buildSessionCloser(peer, conn)
        });
        navigate(`/room/${code}`);
      });

      conn.on("error", (connErr) => {
        setError(connErr?.message ?? "连接对手失败");
      });
    });
  };

  const handleCreate = () => {
    clearSession();
    setError(null);
    setCopied(false);
    setWorking(true);
    setExchangeCode("");
    setStatus("正在创建 10 位交换码...");
    createHost();
  };

  const copyCode = async () => {
    if (!exchangeCode) {
      return;
    }
    await navigator.clipboard.writeText(exchangeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <main className="page narrow">
      <h1>创建对局</h1>
      <p>创建后会生成一个 10 位交换码，把它发给对手即可。</p>

      <button type="button" onClick={handleCreate} disabled={working}>
        {working ? "创建中..." : "创建 10 位交换码"}
      </button>

      <p>状态：{status}</p>
      <input readOnly value={exchangeCode} placeholder="10 位交换码" />

      <button type="button" onClick={copyCode} disabled={!exchangeCode}>
        {copied ? "已复制" : "复制交换码"}
      </button>

      {error ? <p className="error">{error}</p> : null}
      <Link to="/">返回首页</Link>
    </main>
  );
}
