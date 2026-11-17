"use client";

import { compressImage } from "./image";
import { safeUrl } from "./links";

/** One thing someone dropped or pasted, ready to become an option. */
export type Dropped = { kind: "photo"; image: string; url?: string } | { kind: "text"; text: string };

const IMAGE_URL_RE = /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i;

/** True if a drag carries something we can use (so we can show the drop target). */
export function isUsefulDrag(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  return [...dt.types].some((t) => t === "Files" || t === "text/uri-list" || t === "text/plain");
}

/** Try to pull a web image into the browser. Many sites block this (CORS), which is fine. */
async function fetchImage(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(url, { signal: ctrl.signal, mode: "cors", credentials: "omit" });
    clearTimeout(t);
    const blob = await res.blob();
    if (!res.ok || !blob.type.startsWith("image/") || blob.size > 15 * 1024 * 1024) return null;
    return await compressImage(new File([blob], "image", { type: blob.type }));
  } catch {
    return null;
  }
}

/**
 * Read photos, links, and text out of a drop or paste.
 *  - image files → photos (shrunk in the browser)
 *  - a dragged web image → its photo if the site allows it, otherwise its link
 *  - links → text (later parsed into a name + link)
 *  - plain text → one item per line
 */
export async function readTransfer(dt: DataTransfer): Promise<Dropped[]> {
  const files = [...dt.files].filter((f) => f.type.startsWith("image/"));
  if (files.length) {
    const photos = await Promise.all(files.map((f) => compressImage(f).catch(() => null)));
    return photos.filter((p): p is string => !!p).map((image) => ({ kind: "photo", image }));
  }

  // Dragging an <img> from a page usually carries its HTML; prefer the real image src.
  const html = dt.getData("text/html");
  const imgSrc = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  const uris = dt
    .getData("text/uri-list")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  const text = dt.getData("text/plain").trim();

  const imageUrl = safeUrl(imgSrc) ?? (uris[0] && IMAGE_URL_RE.test(uris[0]) ? safeUrl(uris[0]) : null);
  if (imageUrl) {
    const image = await fetchImage(imageUrl);
    // If the picture sat inside a link (e.g. a listing photo), keep the page link, not the image file.
    const pageLink = uris.find((u) => u !== imageUrl && !IMAGE_URL_RE.test(u));
    if (image) return [{ kind: "photo", image, url: pageLink ? safeUrl(pageLink) ?? undefined : undefined }];
    return [{ kind: "text", text: pageLink ?? imageUrl }];
  }

  if (uris.length) return uris.slice(0, 6).map((u) => ({ kind: "text", text: u }));
  if (text) {
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 6)
      .map((t) => ({ kind: "text", text: t }));
  }
  return [];
}
