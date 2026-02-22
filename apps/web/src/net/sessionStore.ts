import type { PeerRole } from "@miniweiqi/protocol";

export interface ActiveSession {
  roomId: string;
  role: PeerRole;
  pc: RTCPeerConnection;
  channel: RTCDataChannel;
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
  try {
    currentSession.channel.close();
  } catch {
    // no-op
  }
  try {
    currentSession.pc.close();
  } catch {
    // no-op
  }
  currentSession = null;
}
