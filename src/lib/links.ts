/**
 * Option links (Zillow listings, restaurant sites, …). Only http(s) URLs are
 * ever stored or rendered, so a link can't smuggle in `javascript:` and run
 * code on a juror's device.
 */

export const MAX_URL = 500;

export function safeUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s || s.length > MAX_URL) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = `https://${s}`; // "zillow.com/…" → https://zillow.com/…
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

const URL_IN_TEXT = /\b((?:https?:\/\/|www\.)[^\s]+|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|io|co|us|app|ca|uk)(?:\/[^\s]*)?)/i;

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** A readable name for a bare link, e.g. a Zillow URL → "123 Main St Chicago IL". */
export function nameFromUrl(url: string): string {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, "");
  const segments = u.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  // Pick the most "wordy" path segment: listing addresses and restaurant names live there.
  const best = segments
    .filter((s) => /[a-z]{3,}/i.test(s) && !/^(homedetails|biz|restaurant|restaurants|menu|p|b|listing|rooms|apartments?)$/i.test(s))
    .sort((a, b) => (b.match(/-/g)?.length ?? 0) - (a.match(/-/g)?.length ?? 0))[0];
  const words = best?.replace(/[_-]+/g, " ").replace(/\b\d{5,}\b|\bzpid\b/gi, "").replace(/\s+/g, " ").trim();
  const name = words && words.length >= 3 ? titleCase(words) : host;
  return name.slice(0, 80);
}

/** Split "Tacos el Norte https://…" into a label and a link. Bare links get a name from the URL. */
export function parseOptionText(text: string): { label: string; url?: string } {
  const m = text.match(URL_IN_TEXT);
  const url = m ? safeUrl(m[1]) : null;
  if (!url) return { label: text.trim().slice(0, 80) };
  const rest = text.replace(m![1], "").replace(/\s*[-–—:|]\s*$/, "").trim();
  return { label: (rest || nameFromUrl(url)).slice(0, 80), url };
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
