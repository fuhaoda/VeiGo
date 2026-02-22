import { useEffect, useMemo, useRef, useState } from "react";
import {
  applyAction,
  calculateScoreBreakdown,
  computeStateHash,
  createInitialState,
  RuleError,
  type Action,
  type EngineEvent,
  type GameState,
  type PlayerId
} from "@miniweiqi/engine";
import { SequenceGuard, parseWireMessage, serializeWireMessage, type PeerRole, type WireMessage } from "@miniweiqi/protocol";
import type { ActiveSession } from "../net/sessionStore";

function localPlayerFromRole(role: PeerRole): PlayerId {
  return role === "HOST" ? "P1" : "P2";
}

export function useGameController(session: ActiveSession | null) {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [events, setEvents] = useState<EngineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [remoteStatus, setRemoteStatus] = useState<"idle" | "connected" | "closed">("idle");

  const stateRef = useRef(state);
  const seqRef = useRef(0);
  const seqGuard = useRef(new SequenceGuard());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const localPlayer = useMemo<PlayerId>(() => {
    if (!session) {
      return "P1";
    }
    return localPlayerFromRole(session.role);
  }, [session]);

  const sendWire = (message: WireMessage) => {
    if (!session || session.channel.readyState !== "open") {
      return;
    }
    session.channel.send(serializeWireMessage(message));
  };

  const forceEnd = (reason: "DISCONNECT") => {
    const current = stateRef.current;
    if (current.phase === "ENDED") {
      return;
    }
    const next = structuredClone(current);
    next.phase = "ENDED";
    next.endReason = reason;
    next.winner = undefined;
    next.finalScore = calculateScoreBreakdown(next);
    setState(next);
  };

  const applyEngineAction = (action: Action, broadcast: boolean) => {
    try {
      const prevHash = computeStateHash(stateRef.current);
      const result = applyAction(stateRef.current, action);
      stateRef.current = result.nextState;
      setState(result.nextState);
      setEvents((prev) => [...result.events, ...prev].slice(0, 120));
      setError(null);

      if (broadcast && session) {
        const seq = seqRef.current;
        seqRef.current += 1;
        sendWire({
          t: "ACTION",
          seq,
          action,
          prevStateHash: prevHash
        });

        if (result.nextState.phase === "ENDED" && result.nextState.endReason) {
          sendWire({ t: "END", reason: result.nextState.endReason });
        }
      }
    } catch (err) {
      if (err instanceof RuleError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("未知规则错误");
      }
    }
  };

  useEffect(() => {
    if (!session) {
      return;
    }

    const channel = session.channel;
    const onOpen = () => {
      setRemoteStatus("connected");
      sendWire({ t: "HELLO", protocolVersion: 1, roomId: session.roomId, peerRole: session.role });
    };

    const onClose = () => {
      setRemoteStatus("closed");
      forceEnd("DISCONNECT");
    };

    const onMessage = (event: MessageEvent<string>) => {
      let msg: WireMessage;
      try {
        msg = parseWireMessage(event.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "消息解析失败");
        return;
      }

      if (msg.t === "HELLO") {
        setRemoteStatus("connected");
        return;
      }

      if (msg.t === "ACTION") {
        if (!seqGuard.current.canAccept(msg.seq)) {
          return;
        }

        const currentHash = computeStateHash(stateRef.current);
        if (currentHash !== msg.prevStateHash) {
          sendWire({
            t: "SNAPSHOT",
            seq: msg.seq,
            state: stateRef.current,
            stateHash: currentHash,
            reason: "RESYNC"
          });
          return;
        }

        try {
          const result = applyAction(stateRef.current, msg.action);
          seqGuard.current.accept(msg.seq);
          stateRef.current = result.nextState;
          setState(result.nextState);
          setEvents((prev) => [...result.events, ...prev].slice(0, 120));
          sendWire({ t: "ACK", seq: msg.seq, stateHash: result.stateHash });
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "远端动作校验失败");
        }
        return;
      }

      if (msg.t === "SNAPSHOT") {
        stateRef.current = structuredClone(msg.state);
        setState(stateRef.current);
        return;
      }

      if (msg.t === "END") {
        if (msg.reason === "DISCONNECT") {
          forceEnd("DISCONNECT");
        }
      }
    };

    channel.addEventListener("open", onOpen);
    channel.addEventListener("close", onClose);
    channel.addEventListener("message", onMessage as EventListener);

    if (channel.readyState === "open") {
      onOpen();
    }

    return () => {
      channel.removeEventListener("open", onOpen);
      channel.removeEventListener("close", onClose);
      channel.removeEventListener("message", onMessage as EventListener);
    };
  }, [session]);

  const score = useMemo(() => calculateScoreBreakdown(state), [state]);

  return {
    state,
    score,
    events,
    error,
    remoteStatus,
    localPlayer,
    dispatchLocalAction: (action: Action) => applyEngineAction(action, Boolean(session))
  };
}
