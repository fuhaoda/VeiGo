import type { Action, GameState } from "@miniweiqi/engine";

export type PeerRole = "HOST" | "GUEST";

export type WireMessage =
  | { t: "HELLO"; protocolVersion: 1; roomId: string; peerRole: PeerRole }
  | { t: "ACTION"; seq: number; action: Action; prevStateHash: string }
  | { t: "ACK"; seq: number; stateHash: string }
  | {
      t: "SNAPSHOT";
      seq: number;
      state: GameState;
      stateHash: string;
      reason: "RESYNC" | "RECONNECT_ATTEMPT";
    }
  | { t: "END"; reason: "RESIGN" | "DOUBLE_PASS" | "DISCONNECT" };

export type OfferCodePayload = { v: 1; kind: "offer"; sdp: RTCSessionDescriptionInit };
export type AnswerCodePayload = { v: 1; kind: "answer"; sdp: RTCSessionDescriptionInit };
