import { describe, expect, it } from "vitest";
import { decodeAnswerCode, decodeOfferCode, encodeAnswerCode, encodeOfferCode } from "../src";

describe("handshake exchange codes", () => {
  it("encodes and decodes offer and answer payloads", () => {
    const offer = {
      v: 1 as const,
      kind: "offer" as const,
      sdp: { type: "offer" as const, sdp: "v=0..." }
    };
    const answer = {
      v: 1 as const,
      kind: "answer" as const,
      sdp: { type: "answer" as const, sdp: "v=0...answer" }
    };

    const offerCode = encodeOfferCode(offer);
    const answerCode = encodeAnswerCode(answer);

    expect(decodeOfferCode(offerCode)).toEqual(offer);
    expect(decodeAnswerCode(answerCode)).toEqual(answer);
  });

  it("rejects malformed codes", () => {
    expect(() => decodeOfferCode("not-base64")).toThrow();
    const badKind = Buffer.from(JSON.stringify({ v: 1, kind: "answer", sdp: {} }), "utf8").toString("base64url");
    expect(() => decodeOfferCode(badKind)).toThrow();
  });
});
