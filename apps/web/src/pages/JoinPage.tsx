import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { decodeOfferCode, encodeAnswerCode } from "../net/handshake";
import { createPeerConnection, randomRoomId, waitIceGatheringComplete } from "../net/webrtc";
import { setSession } from "../net/sessionStore";

export function JoinPage() {
  const [offerInput, setOfferInput] = useState("");
  const [answerCode, setAnswerCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [roomId, setRoomId] = useState<string>("");
  const [working, setWorking] = useState(false);
  const navigate = useNavigate();

  const handleGenerateAnswer = async () => {
    setWorking(true);
    setError(null);
    try {
      const payload = decodeOfferCode(offerInput);
      const pc = createPeerConnection();

      const waitChannel = new Promise<RTCDataChannel>((resolve) => {
        pc.ondatachannel = (event) => resolve(event.channel);
      });

      await pc.setRemoteDescription(payload.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitIceGatheringComplete(pc);

      const local = pc.localDescription;
      if (!local) {
        throw new Error("生成 Answer 失败");
      }

      const encoded = encodeAnswerCode({
        v: 1,
        kind: "answer",
        sdp: {
          type: local.type,
          sdp: local.sdp ?? ""
        }
      });

      const channel = await waitChannel;
      const nextRoomId = randomRoomId();
      channel.onopen = () => {
        navigate(`/room/${nextRoomId}`);
      };

      setSession({ roomId: nextRoomId, role: "GUEST", pc, channel });
      setRoomId(nextRoomId);
      setAnswerCode(encoded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成 Answer 失败");
    } finally {
      setWorking(false);
    }
  };

  const copyAnswer = async () => {
    if (!answerCode) {
      return;
    }
    await navigator.clipboard.writeText(answerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="page narrow">
      <h1>加入对局</h1>
      <p>粘贴对方给你的 Offer 交换码，生成 Answer 返还给对方。</p>
      <textarea value={offerInput} onChange={(e) => setOfferInput(e.target.value)} rows={8} placeholder="粘贴 Offer 交换码" />
      <button type="button" onClick={handleGenerateAnswer} disabled={working || !offerInput.trim()}>
        {working ? "处理中..." : "生成 Answer 交换码"}
      </button>
      {roomId ? <p>房间号：{roomId}</p> : null}
      <textarea value={answerCode} readOnly rows={8} placeholder="Answer 交换码" />
      <button type="button" onClick={copyAnswer} disabled={!answerCode}>
        {copied ? "已复制 Answer" : "复制 Answer 交换码"}
      </button>
      {error ? <p className="error">{error}</p> : null}
      <Link to="/">返回首页</Link>
    </main>
  );
}
