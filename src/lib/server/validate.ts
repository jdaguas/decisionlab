import "server-only";
import type { Option } from "../types";
import { MAX_URL, safeUrl } from "../links";

const ID_RE = /^[A-Za-z0-9-]{1,64}$/;
export const TOKEN_RE = /^[A-Za-z0-9_-]{10,64}$/;
export const IMAGE_ID_RE = /^[A-Za-z0-9_-]{20,40}$/;

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** Validates the options + dealbreakers a creator sends when creating or updating a poll. */
export function parsePollDetails(body: Record<string, unknown>): Result<{ options: Option[]; dealbreakers: string[] }> {
  const { options = [], dealbreakers = [] } = body;
  if (!Array.isArray(options) || options.length > 6) {
    return { ok: false, error: "Provide up to 6 options." };
  }
  if (options.length === 1) {
    return { ok: false, error: "Add a second option, or remove the first to collect open opinions." };
  }
  const cleanOptions: Option[] = [];
  for (const o of options) {
    if (
      !o || typeof o.id !== "string" || !ID_RE.test(o.id) ||
      typeof o.label !== "string" || !o.label.trim() || o.label.length > 80
    ) {
      return { ok: false, error: "Each option needs an id and a 1–80 character label." };
    }
    let url: string | undefined;
    if (o.url != null && o.url !== "") {
      const safe = typeof o.url === "string" && o.url.length <= MAX_URL ? safeUrl(o.url) : null;
      if (!safe) return { ok: false, error: "Option links must be http(s) URLs." };
      url = safe;
    }
    if (o.imageId != null && (typeof o.imageId !== "string" || !IMAGE_ID_RE.test(o.imageId))) {
      return { ok: false, error: "Invalid option photo." };
    }
    // Only the uploaded photo's id is accepted; raw image data never goes into a poll.
    const clean: Option = { id: o.id, label: o.label.trim() };
    if (url) clean.url = url;
    if (o.imageId) clean.imageId = o.imageId;
    cleanOptions.push(clean);
  }
  if (!Array.isArray(dealbreakers) || dealbreakers.length > 6) {
    return { ok: false, error: "Up to 6 dealbreakers." };
  }
  const cleanDb: string[] = [];
  for (const b of dealbreakers) {
    if (typeof b !== "string" || !b.trim() || b.length > 100) {
      return { ok: false, error: "Dealbreakers must be 1–100 characters." };
    }
    cleanDb.push(b.trim());
  }
  return { ok: true, value: { options: cleanOptions, dealbreakers: cleanDb } };
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await req.json();
    return b && typeof b === "object" && !Array.isArray(b) ? b : null;
  } catch {
    return null;
  }
}
