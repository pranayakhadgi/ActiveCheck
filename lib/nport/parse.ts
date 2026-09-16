/**
 * Parses an N-PORT `primary_doc.xml` into a typed filing.
 *
 * Pure and deterministic: it takes the XML text, never a path or a URL, so
 * fetching and caching stay in `lib/edgar/`. Element names were verified
 * against the real filings in `fixtures/nport/` — see `.claude/skills/nport-data`.
 */
import { XMLParser } from "fast-xml-parser";

import type { AssetCat, Holding, NportFiling } from "./types";

/** `assetCat` values the schema uses; anything else is bucketed to OTHER. */
const ASSET_CATS = new Set<AssetCat>(["EC", "EP", "DBT", "STIV", "RA", "DE"]);

/** Placeholders filers use in place of a real CUSIP. */
const MISSING_CUSIP = new Set(["", "N/A", "NA", "NONE", "000000000", "0"]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Holdings and repeatable identifiers must always be arrays, otherwise a
  // single-holding filing parses to an object and silently breaks every caller.
  isArray: (name) => name === "invstOrSec" || name === "other",
  // Keep everything as text: pctVal and valUSD carry more digits than a JS
  // number preserves, so we convert explicitly and can validate as we go.
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

/** Narrows the `unknown` walk over the parsed tree to a plain object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Follows a path of element names, returning undefined at the first gap. */
function at(root: unknown, ...path: string[]): unknown {
  let node: unknown = root;
  for (const key of path) {
    if (!isRecord(node)) return undefined;
    node = node[key];
  }
  return node;
}

/** Element text, or null when the element is absent or empty. */
function text(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (typeof value === "number") return String(value);
  // fast-xml-parser represents an element with attributes as an object, and an
  // empty self-closing element as an empty string handled above.
  return null;
}

function requireText(value: unknown, what: string): string {
  const found = text(value);
  if (found === null) throw new Error(`N-PORT parse: missing ${what}`);
  return found;
}

function requireNumber(value: unknown, what: string): number {
  const raw = requireText(value, what);
  const num = Number(raw);
  if (!Number.isFinite(num)) throw new Error(`N-PORT parse: ${what} is not a number (${raw})`);
  return num;
}

/** Validates a filed date is a calendar date and keeps it as a `YYYY-MM-DD` string. */
function requireDate(value: unknown, what: string): string {
  const raw = requireText(value, what);
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) throw new Error(`N-PORT parse: ${what} is not a date (${raw})`);
  const [, year, month, day] = match;
  const iso = `${year}-${month}-${day}`;
  // Round-trip through UTC to reject 2026-02-31 and friends without letting a
  // local-timezone parse shift the day.
  const asUtc = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(asUtc.getTime()) || asUtc.toISOString().slice(0, 10) !== iso) {
    throw new Error(`N-PORT parse: ${what} is not a valid date (${raw})`);
  }
  return iso;
}

/** Reads the `value` attribute of an `identifiers/<kind>` element. */
function identifier(identifiers: unknown, kind: string): string | null {
  const node = at(identifiers, kind);
  if (!isRecord(node)) return null;
  return text(node["@_value"])?.toUpperCase() ?? null;
}

function parseAssetCat(value: unknown): AssetCat {
  const raw = text(value)?.toUpperCase();
  if (raw && ASSET_CATS.has(raw as AssetCat)) return raw as AssetCat;
  return "OTHER";
}

function parseHolding(sec: unknown, index: number): Holding {
  const where = `invstOrSec[${index}]`;
  const name = requireText(at(sec, "name"), `${where}/name`);

  const rawCusip = text(at(sec, "cusip"))?.toUpperCase() ?? "";
  const cusip = MISSING_CUSIP.has(rawCusip) ? null : rawCusip;

  const identifiers = at(sec, "identifiers");

  return {
    name,
    // `title` is optional in practice; fall back to the issuer name.
    title: text(at(sec, "title")) ?? name,
    cusip,
    isin: identifier(identifiers, "isin"),
    ticker: identifier(identifiers, "ticker"),
    valUSD: requireNumber(at(sec, "valUSD"), `${where}/valUSD`),
    pctVal: requireNumber(at(sec, "pctVal"), `${where}/pctVal`),
    assetCat: parseAssetCat(at(sec, "assetCat")),
    payoffProfile: text(at(sec, "payoffProfile")),
  };
}

export function parseNport(xml: string): NportFiling {
  const doc = parser.parse(xml);

  const submission = at(doc, "edgarSubmission");
  if (!isRecord(submission)) {
    throw new Error("N-PORT parse: no <edgarSubmission> root element");
  }

  const genInfo = at(submission, "formData", "genInfo");
  const fundInfo = at(submission, "formData", "fundInfo");

  // `genInfo/seriesId` is the fund identity; the header copy is a fallback.
  const seriesId =
    text(at(genInfo, "seriesId")) ??
    requireText(
      at(submission, "headerData", "filerInfo", "seriesClassInfo", "seriesId"),
      "genInfo/seriesId",
    );

  const rawHoldings = at(submission, "formData", "invstOrSecs", "invstOrSec");
  const holdings = Array.isArray(rawHoldings)
    ? rawHoldings.map((sec, i) => parseHolding(sec, i))
    : [];

  return {
    seriesId: seriesId.toUpperCase(),
    // repPdDate is the holdings as-of date; repPdEnd is the later fiscal-period end.
    reportDate: requireDate(at(genInfo, "repPdDate"), "genInfo/repPdDate"),
    netAssets: requireNumber(at(fundInfo, "netAssets"), "fundInfo/netAssets"),
    holdings,
  };
}
