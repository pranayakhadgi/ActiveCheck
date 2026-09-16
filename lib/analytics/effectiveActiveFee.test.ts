import { describe, expect, it } from "vitest";

import { UNRELIABLE_ACTIVE_SHARE, effectiveActiveFee, isFeeReliable } from "./effectiveActiveFee";

// The cases below are docs/research/kimi.md section 3.
describe("effectiveActiveFee", () => {
  it("active share 0 → undefined, not Infinity and not 0", () => {
    expect(effectiveActiveFee(0.0075, 0.0009, 0)).toBeUndefined();
  });

  it("typical case: (75bps − 9bps) / 0.6 = 110bps", () => {
    expect(effectiveActiveFee(0.0075, 0.0009, 0.6)).toBeCloseTo(0.011, 10);
  });

  it("a fund cheaper than its index gives a negative fee, unclamped", () => {
    expect(effectiveActiveFee(0.0005, 0.0009, 0.4)).toBeCloseTo(-0.001, 10);
  });

  it("a tiny active share amplifies the fee and is still returned", () => {
    expect(effectiveActiveFee(0.0075, 0.0009, 0.001)).toBeCloseTo(6.6, 10);
  });

  it("active share exactly 1 with equal expense ratios → 0", () => {
    expect(effectiveActiveFee(0.0009, 0.0009, 1)).toBe(0);
  });

  it("returns undefined rather than a number for a missing expense ratio", () => {
    expect(effectiveActiveFee(undefined, 0.0009, 0.6)).toBeUndefined();
    expect(effectiveActiveFee(0.0075, null, 0.6)).toBeUndefined();
  });

  it("rejects a negative or out-of-range active share", () => {
    expect(effectiveActiveFee(0.0075, 0.0009, -0.1)).toBeUndefined();
    expect(effectiveActiveFee(0.0075, 0.0009, 1.5)).toBeUndefined();
  });
});

describe("isFeeReliable", () => {
  it("flags the amplified regime instead of clamping the number", () => {
    expect(isFeeReliable(0.001)).toBe(false);
    expect(isFeeReliable(UNRELIABLE_ACTIVE_SHARE)).toBe(true);
    expect(isFeeReliable(0.6)).toBe(true);
  });
});
