import type { DataConnection, Peer } from "peerjs";
import type { PeerRole } from "@miniweiqi/protocol";

export interface ActiveSession {
  roomId: string;
  role: PeerRole;
  peer: Peer;
  channel: DataConnection;
  close: () => void;
}

let currentSession: ActiveSession | null = null;

export function setSession(session: ActiveSession): void {
  currentSession = session;
}

export function getSession(): ActiveSession | null {
  return currentSession;
}

export function clearSession(): void {
  if (!currentSession) {
    return;
  }
  currentSession.close();
  currentSession = null;
}
