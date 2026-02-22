import { describe, expect, it } from "vitest";
import { SequenceGuard, parseWireMessage, serializeWireMessage, type WireMessage } from "../src";

describe("wire protocol", () => {
  it("serializes and parses valid wire messages", () => {
    const msg: WireMessage = {
      t: "ACTION",
      seq: 2,
      action: { type: "Pass", player: "P1" },
      prevStateHash: "abc"
    };

    const raw = serializeWireMessage(msg);
    expect(parseWireMessage(raw)).toEqual(msg);
  });

  it("rejects invalid wire message", () => {
    expect(() => parseWireMessage('{"t":"ACK","seq":"bad"}')).toThrow();
  });

  it("enforces monotonically increasing sequence", () => {
    const guard = new SequenceGuard();
    guard.accept(0);
    guard.accept(1);
    expect(() => guard.accept(1)).toThrow();
    expect(() => guard.accept(0)).toThrow();
  });
});
