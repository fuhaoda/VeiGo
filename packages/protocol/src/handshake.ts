import type { AnswerCodePayload, OfferCodePayload } from "./types";

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof btoa === "function") {
    let binary = "";
    for (const b of bytes) {
      binary += String.fromCharCode(b);
    }
    return btoa(binary);
  }
  return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof atob === "function") {
    const binary = atob(base64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
  return new Uint8Array(Buffer.from(base64, "base64"));
}

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const normalized = `${padded}${"=".repeat((4 - (padded.length % 4 || 4)) % 4)}`;
  const bytes = base64ToBytes(normalized);
  return new TextDecoder().decode(bytes);
}

function decodeRaw<T extends { v: 1; kind: string }>(code: string, kind: T["kind"]): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(code));
  } catch {
    throw new Error("Invalid exchange code format");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid exchange code payload");
  }

  const candidate = parsed as { v?: unknown; kind?: unknown };
  if (candidate.v !== 1 || candidate.kind !== kind) {
    throw new Error(`Invalid ${kind} code payload`);
  }

  return parsed as T;
}

export function encodeOfferCode(payload: OfferCodePayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeOfferCode(code: string): OfferCodePayload {
  return decodeRaw<OfferCodePayload>(code.trim(), "offer");
}

export function encodeAnswerCode(payload: AnswerCodePayload): string {
  return toBase64Url(JSON.stringify(payload));
}

export function decodeAnswerCode(code: string): AnswerCodePayload {
  return decodeRaw<AnswerCodePayload>(code.trim(), "answer");
}
