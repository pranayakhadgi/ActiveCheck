import { describe, expect, test } from "vitest";

import { CLOSET_INDEXER_ACTIVE_SHARE, verdict } from "./verdict";

describe("verdict", () => {
  test("reads as the sentence DESIGN.md specifies", () => {
    const { sentence } = verdict(0.4, 0.0205, "IVV");
    expect(sentence).toBe(
      "About 60% of this fund matches IVV, its closest index. You pay ~2.05%/yr for the rest.",
    );
  });

  test("labels a fund below the 60% convention a closet indexer", () => {
    expect(verdict(CLOSET_INDEXER_ACTIVE_SHARE - 0.001, 0.01, "IVV")).toMatchObject({
      tone: "low",
      label: "Closet indexer",
    });
  });

  test("the convention is a floor, not a midpoint: exactly 60% is active", () => {
    expect(verdict(CLOSET_INDEXER_ACTIVE_SHARE, 0.01, "IVV")).toMatchObject({
      tone: "high",
      label: "Genuinely active",
    });
  });

  test("a negative fee is spoken, not clamped or hidden", () => {
    // The fund is cheaper than the index fund it most resembles.
    expect(verdict(0.8, -0.0004, "IVV").sentence).toContain(
      "The rest costs you nothing — this fund is 0.04%/yr cheaper than IVV.",
    );
  });

  test("a missing fee says so rather than printing a blank", () => {
    const { sentence, caveat } = verdict(0.8, null, "IVV");
    expect(sentence).toContain("no expense ratio on file");
    expect(caveat).toBeNull();
  });

  test("a tiny active share carries the amplification caveat", () => {
    // 10% active share divides the whole fee gap by a sliver of the portfolio.
    expect(verdict(0.1, 0.05, "IVV").caveat).toContain("Only 10% of this fund is active");
  });

  test("a reliable active share carries no caveat", () => {
    expect(verdict(0.52, 0.007, "IVV").caveat).toBeNull();
  });
});
