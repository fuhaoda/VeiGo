import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { decodeAnswerCode, encodeOfferCode } from "../net/handshake";
import { createPeerConnection, randomRoomId, waitIceGatheringComplete } from "../net/webrtc";
import { getSession, setSession } from "../net/sessionStore";

export function CreatePage() {
  const [offerCode, setOfferCode] = useState("");
  const [answerInput, setAnswerInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"offer" | null>(null);
  const [roomId, setRoomId] = useState<string>("");
  const [working, setWorking] = useState(false);
  const navigate = useNavigate();

  const canApplyAnswer = useMemo(() => offerCode.length > 0 && answerInput.trim().length > 0, [offerCode, answerInput]);

  const handleGenerateOffer = async () => {
    setWorking(true);
    setError(null);
    try {
      const nextRoomId = randomRoomId();
      const pc = createPeerConnection();
      const channel = pc.createDataChannel("miniweiqi");

      channel.onopen = () => {
        navigate(`/room/${nextRoomId}`);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitIceGatheringComplete(pc);

      if (!pc.localDescription) {
        throw new Error("创建 offer 失败");
      }

      const payload = {
        v: 1 as const,
        kind: "offer" as const,
        sdp: {
          type: pc.localDescription.type,
          sdp: pc.localDescription.sdp ?? ""
        }
      };

      setOfferCode(encodeOfferCode(payload));
      setRoomId(nextRoomId);
      setSession({ roomId: nextRoomId, role: "HOST", pc, channel });
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成 Offer 失败");
    } finally {
      setWorking(false);
    }
  };

  const handleApplyAnswer = async () => {
    setError(null);
    try {
      const candidate = decodeAnswerCode(answerInput.trim());
      const session = getSession();
      if (!session) {
        throw new Error("会话不存在，请重新生成 Offer");
      }

      await session.pc.setRemoteDescription(candidate.sdp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "应用 Answer 失败");
    }
  };

  const copyOffer = async () => {
    if (!offerCode) {
      return;
    }
    await navigator.clipboard.writeText(offerCode);
    setCopied("offer");
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <main className="page narrow">
      <h1>创建对局</h1>
      <p>步骤 1：生成 Offer 交换码，发给对方。</p>
      <button type="button" onClick={handleGenerateOffer} disabled={working}>
        {working ? "生成中..." : "生成 Offer 交换码"}
      </button>
      {roomId ? <p>房间号：{roomId}</p> : null}
      <textarea value={offerCode} readOnly rows={8} placeholder="Offer 交换码" />
      <button type="button" onClick={copyOffer} disabled={!offerCode}>
        {copied === "offer" ? "已复制 Offer" : "复制 Offer 交换码"}
      </button>

      <p>步骤 2：对方回传 Answer 交换码后粘贴到下方。</p>
      <textarea value={answerInput} onChange={(e) => setAnswerInput(e.target.value)} rows={8} placeholder="粘贴 Answer 交换码" />
      <button type="button" onClick={handleApplyAnswer} disabled={!canApplyAnswer}>
        应用 Answer 并建立连接
      </button>

      {error ? <p className="error">{error}</p> : null}
      <Link to="/">返回首页</Link>
    </main>
  );
}
