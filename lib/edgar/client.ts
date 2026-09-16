/**
 * Minimal EDGAR HTTP client that obeys the SEC fair-access rules:
 * a contactable User-Agent on every request, a client-side rate limit,
 * and backoff on the throttling status codes.
 */

export const USER_AGENT = "ActiveCheck Pranaya Khadgi Shahi qh85275@truman.edu";

/** SEC asks for no more than 10 requests/second; we stay under it. */
const MIN_INTERVAL_MS = 120;
const MAX_ATTEMPTS = 4;
const RETRY_STATUS = new Set([403, 429, 500, 502, 503, 504]);

let nextSlot = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Serialises every caller through one shared rate-limit gate. */
async function takeSlot(): Promise<void> {
  const now = Date.now();
  const at = Math.max(now, nextSlot);
  nextSlot = at + MIN_INTERVAL_MS;
  if (at > now) await sleep(at - now);
}

export async function edgarGet(url: string): Promise<string> {
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await takeSlot();

    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept-Encoding": "gzip, deflate",
      },
    });

    if (res.ok) return res.text();

    lastError = `${res.status} ${res.statusText}`;
    if (!RETRY_STATUS.has(res.status) || attempt === MAX_ATTEMPTS) break;

    // Exponential backoff with jitter, so a retry storm does not sync up.
    const backoff = 500 * 2 ** (attempt - 1) + Math.random() * 250;
    await sleep(backoff);
  }

  throw new Error(`EDGAR GET failed for ${url}: ${lastError}`);
}

/** Filing-history feed for one series (S000xxxxxx), newest first. */
export function seriesFilingsUrl(seriesId: string, formType: string): string {
  const params = new URLSearchParams({
    action: "getcompany",
    CIK: seriesId,
    type: formType,
    dateb: "",
    owner: "include",
    count: "10",
    output: "atom",
  });
  return `https://www.sec.gov/cgi-bin/browse-edgar?${params}`;
}

/** Direct URL of a document inside a filing folder. */
export function archiveDocUrl(cik: string, accessionNo: string, file: string): string {
  const bare = accessionNo.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${bare}/${file}`;
}
