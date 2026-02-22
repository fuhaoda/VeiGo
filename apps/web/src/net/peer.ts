import type { DataConnection, Peer } from "peerjs";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateExchangeCode(length = 10): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return out;
}

export function normalizeExchangeCode(input: string): string {
  return input.trim().toUpperCase();
}

export function isValidExchangeCode(input: string, length = 10): boolean {
  const normalized = normalizeExchangeCode(input);
  const pattern = new RegExp(`^[${CODE_CHARS}]{${length}}$`);
  return pattern.test(normalized);
}

export function buildSessionCloser(peer: Peer, connection: DataConnection): () => void {
  return () => {
    try {
      connection.close();
    } catch {
      // no-op
    }
    try {
      peer.destroy();
    } catch {
      // no-op
    }
  };
}
