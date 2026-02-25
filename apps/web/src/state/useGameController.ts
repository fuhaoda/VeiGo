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

function otherPlayer(player: PlayerId): PlayerId {
  return player === "P1" ? "P2" : "P1";
}

const BYOYOMI_SECONDS = 25;
const BYOYOMI_PERIODS = 3;

type ByoyomiEntry = {
  secondsLeft: number;
  periodsLeft: number;
};

export type ByoyomiState = {
  activePlayer: PlayerId | null;
  players: Record<PlayerId, ByoyomiEntry>;
};

function createInitialByoyomi(): ByoyomiState {
  return {
    activePlayer: null,
    players: {
      P1: { secondsLeft: BYOYOMI_SECONDS, periodsLeft: BYOYOMI_PERIODS },
      P2: { secondsLeft: BYOYOMI_SECONDS, periodsLeft: BYOYOMI_PERIODS }
    }
  };
}

function createByoyomiForTurn(turn: PlayerId): ByoyomiState {
  return {
    activePlayer: turn,
    players: {
      P1: { secondsLeft: BYOYOMI_SECONDS, periodsLeft: BYOYOMI_PERIODS },
      P2: { secondsLeft: BYOYOMI_SECONDS, periodsLeft: BYOYOMI_PERIODS }
    }
  };
}

export function useGameController(session: ActiveSession | null) {
  const [state, setState] = useState<GameState>(() => createInitialState());
  const [events, setEvents] = useState<EngineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [remoteStatus, setRemoteStatus] = useState<"idle" | "connected" | "closed">("idle");
  const [byoyomi, setByoyomi] = useState<ByoyomiState>(() => createInitialByoyomi());
  const [byoyomiEnabled, setByoyomiEnabledState] = useState(true);

  const stateRef = useRef(state);
  const byoyomiRef = useRef(byoyomi);
  const byoyomiEnabledRef = useRef(byoyomiEnabled);
  const seqRef = useRef(0);
  const seqGuard = useRef(new SequenceGuard());
  const prevPhaseRef = useRef(state.phase);
  const prevTurnRef = useRef<PlayerId | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    byoyomiRef.current = byoyomi;
  }, [byoyomi]);

  useEffect(() => {
    byoyomiEnabledRef.current = byoyomiEnabled;
  }, [byoyomiEnabled]);

  const localPlayer = useMemo<PlayerId>(() => {
    if (!session) {
      return "P1";
    }
    return localPlayerFromRole(session.role);
  }, [session]);

  const sendWire = (message: WireMessage) => {
    if (!session || !session.channel.open) {
      return;
    }
    session.channel.send(serializeWireMessage(message));
  };

  const forceEnd = (
    reason: "DISCONNECT" | "TIMEOUT",
    loser?: PlayerId,
    broadcast = false
  ) => {
    const current = stateRef.current;
    if (current.phase === "ENDED") {
      return;
    }

    const next = structuredClone(current);
    next.phase = "ENDED";
    next.endReason = reason;
    next.winner = reason === "TIMEOUT" && loser ? otherPlayer(loser) : undefined;
    next.finalScore = calculateScoreBreakdown(next);

    stateRef.current = next;
    setState(next);

    if (reason === "TIMEOUT") {
      setEvents((prev) => [{ type: "END", reason: "TIMEOUT", winner: next.winner }, ...prev].slice(0, 120));
    }

    if (broadcast && reason === "TIMEOUT" && loser && session) {
      sendWire({ t: "END", reason: "TIMEOUT", loser });
    }
  };

  const setByoyomiEnabled = (enabled: boolean, broadcast: boolean) => {
    setByoyomiEnabledState(enabled);
    byoyomiEnabledRef.current = enabled;

    if (enabled && stateRef.current.phase === "MAIN_PLAY") {
      setByoyomi(createByoyomiForTurn(stateRef.current.nextToAct));
      prevTurnRef.current = stateRef.current.nextToAct;
    } else {
      setByoyomi(createInitialByoyomi());
    }

    if (broadcast && session?.role === "HOST") {
      sendWire({ t: "CLOCK_CONFIG", enabled });
    }
  };

  useEffect(() => {
    const prevPhase = prevPhaseRef.current;

    if (prevPhase !== "MAIN_PLAY" && state.phase === "MAIN_PLAY") {
      if (byoyomiEnabledRef.current) {
        setByoyomi(createByoyomiForTurn(state.nextToAct));
      } else {
        setByoyomi(createInitialByoyomi());
      }
      prevTurnRef.current = state.nextToAct;
    } else if (state.phase !== "MAIN_PLAY") {
      setByoyomi(createInitialByoyomi());
      prevTurnRef.current = null;
    }

    prevPhaseRef.current = state.phase;
  }, [state.phase, state.nextToAct]);

  useEffect(() => {
    if (state.phase !== "MAIN_PLAY" || !byoyomiEnabledRef.current) {
      return;
    }
    if (prevTurnRef.current === state.nextToAct) {
      return;
    }

    prevTurnRef.current = state.nextToAct;
    setByoyomi((prev) => ({
      ...prev,
      activePlayer: state.nextToAct,
      players: {
        ...prev.players,
        [state.nextToAct]: {
          ...prev.players[state.nextToAct],
          secondsLeft: BYOYOMI_SECONDS
        }
      }
    }));
  }, [state.phase, state.nextToAct, state.moveIndex]);

  useEffect(() => {
    if (state.phase !== "MAIN_PLAY" || !byoyomiEnabledRef.current) {
      return;
    }

    const timer = window.setInterval(() => {
      const live = stateRef.current;
      if (live.phase !== "MAIN_PLAY" || !byoyomiEnabledRef.current) {
        return;
      }

      const turn = live.nextToAct;
      const current = byoyomiRef.current.players[turn];
      if (!current || current.periodsLeft <= 0) {
        return;
      }

      let nextClock: ByoyomiState;
      let timeoutLoser: PlayerId | null = null;

      if (current.secondsLeft > 1) {
        nextClock = {
          ...byoyomiRef.current,
          activePlayer: turn,
          players: {
            ...byoyomiRef.current.players,
            [turn]: {
              ...current,
              secondsLeft: current.secondsLeft - 1
            }
          }
        };
      } else if (current.periodsLeft > 1) {
        nextClock = {
          ...byoyomiRef.current,
          activePlayer: turn,
          players: {
            ...byoyomiRef.current.players,
            [turn]: {
              secondsLeft: BYOYOMI_SECONDS,
              periodsLeft: current.periodsLeft - 1
            }
          }
        };
      } else {
        nextClock = {
          ...byoyomiRef.current,
          activePlayer: turn,
          players: {
            ...byoyomiRef.current.players,
            [turn]: {
              secondsLeft: 0,
              periodsLeft: 0
            }
          }
        };
        timeoutLoser = turn;
      }

      byoyomiRef.current = nextClock;
      setByoyomi(nextClock);

      if (timeoutLoser) {
        forceEnd("TIMEOUT", timeoutLoser, Boolean(session));
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [state.phase, session]);

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
      if (session.role === "HOST") {
        sendWire({ t: "CLOCK_CONFIG", enabled: byoyomiEnabledRef.current });
      }
    };

    const onClose = () => {
      setRemoteStatus("closed");
      forceEnd("DISCONNECT");
    };

    const onMessageRaw = (raw: unknown) => {
      const payload = typeof raw === "string" ? raw : JSON.stringify(raw);
      let msg: WireMessage;
      try {
        msg = parseWireMessage(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "消息解析失败");
        return;
      }

      if (msg.t === "HELLO") {
        setRemoteStatus("connected");
        return;
      }

      if (msg.t === "CLOCK_CONFIG") {
        setByoyomiEnabled(msg.enabled, false);
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
          return;
        }
        if (msg.reason === "TIMEOUT") {
          const loser = msg.loser ?? stateRef.current.nextToAct;
          forceEnd("TIMEOUT", loser, false);
        }
      }
    };

    const onError = (err: unknown) => {
      setError(err instanceof Error ? err.message : "连接错误");
    };

    channel.on("open", onOpen);
    channel.on("close", onClose);
    channel.on("data", onMessageRaw);
    channel.on("error", onError);

    if (channel.open) {
      onOpen();
    }

    return () => {
      channel.off?.("open", onOpen);
      channel.off?.("close", onClose);
      channel.off?.("data", onMessageRaw);
      channel.off?.("error", onError);
    };
  }, [session]);

  const score = useMemo(() => calculateScoreBreakdown(state), [state]);

  return {
    state,
    score,
    byoyomi,
    byoyomiEnabled,
    events,
    error,
    remoteStatus,
    localPlayer,
    setByoyomiEnabled: (enabled: boolean) => setByoyomiEnabled(enabled, true),
    dispatchLocalAction: (action: Action) => applyEngineAction(action, Boolean(session))
  };
}
