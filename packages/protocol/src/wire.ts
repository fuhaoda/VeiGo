import type { WireMessage } from "./types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "string";
}

function hasNumber(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === "number";
}

export function serializeWireMessage(message: WireMessage): string {
  return JSON.stringify(message);
}

export function parseWireMessage(raw: string): WireMessage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid wire message JSON");
  }

  if (!isObject(parsed) || typeof parsed.t !== "string") {
    throw new Error("Invalid wire message shape");
  }

  const msg = parsed;
  switch (msg.t) {
    case "HELLO":
      if (!hasString(msg, "roomId") || !hasString(msg, "peerRole") || msg.protocolVersion !== 1) {
        throw new Error("Invalid HELLO message");
      }
      break;
    case "ACTION":
      if (!hasNumber(msg, "seq") || !hasString(msg, "prevStateHash") || !isObject(msg.action)) {
        throw new Error("Invalid ACTION message");
      }
      break;
    case "ACK":
      if (!hasNumber(msg, "seq") || !hasString(msg, "stateHash")) {
        throw new Error("Invalid ACK message");
      }
      break;
    case "SNAPSHOT":
      if (
        !hasNumber(msg, "seq") ||
        !hasString(msg, "stateHash") ||
        !isObject(msg.state) ||
        !hasString(msg, "reason")
      ) {
        throw new Error("Invalid SNAPSHOT message");
      }
      break;
    case "END":
      if (!hasString(msg, "reason")) {
        throw new Error("Invalid END message");
      }
      break;
    default:
      throw new Error(`Unsupported message type: ${msg.t}`);
  }

  return msg as WireMessage;
}
