/**
 * Public surface of the analytics layer.
 *
 * Every export here is a pure function of its arguments: no I/O, no database,
 * no clock. The fund page composes them in this order —
 * `normalizeEquityWeights` → `matchSecurities` → `activeShare` /
 * `closestIndex` → `effectiveActiveFee` / `topOverUnderweights`.
 */
export { activeShare } from "./activeShare";
export { closestIndex, rankBenchmarks, type BenchmarkCandidate } from "./closestIndex";
export { UNRELIABLE_ACTIVE_SHARE, effectiveActiveFee, isFeeReliable } from "./effectiveActiveFee";
export { matchSecurities } from "./match";
export { normalizeEquityWeights, normalizeName } from "./normalize";
export { topOverUnderweights } from "./topOverUnderweights";
export type * from "./types";
