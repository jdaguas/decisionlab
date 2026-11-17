"use client";

import type { Option } from "./types";

const MAX_SIDE = 900;

/**
 * Shrink a photo in the browser before storing it: longest side ≤ 900px, JPEG
 * at ~0.8 quality. A phone photo goes from several MB to roughly 80–150 KB,
 * which keeps browser storage and uploads small.
 */
export async function compressImage(file: File): Promise<string> {
  if (!/^image\/(jpeg|png|webp|heic|heif|gif|avif)$/i.test(file.type) && !file.type.startsWith("image/")) {
    throw new Error("That file isn't a photo.");
  }
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Couldn't read that photo. Try a JPEG or PNG.");
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff"; // transparent PNGs get a white background in JPEG
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.8);
}

/** Where to load an option's photo from: the local copy, else the shared upload. */
export function imageSrc(o: Pick<Option, "image" | "imageId">): string | null {
  return o.image ?? (o.imageId ? `/api/images/${o.imageId}` : null);
}

/**
 * Upload any option photos that haven't been shared yet. Returns the options
 * with `imageId` filled in (or throws). Only called when sharing for peer review.
 */
export async function uploadMissingImages(options: Option[]): Promise<Option[]> {
  return Promise.all(
    options.map(async (o) => {
      if (!o.image || o.imageId) return o;
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: o.image }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Couldn't upload a photo.");
      return { ...o, imageId: body.id as string };
    }),
  );
}
