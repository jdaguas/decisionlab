import { imageStore, MAX_IMAGE_BYTES, sniff } from "@/lib/server/imageStore";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";
import { readJson } from "@/lib/server/validate";

const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

/** Upload an option photo for peer review. Body: { dataUrl: "data:image/jpeg;base64,…" } */
export async function POST(req: Request) {
  if (!rateLimit(`img:${clientIp(req)}`, 40, 60 * 60 * 1000)) {
    return Response.json({ error: "Too many photo uploads. Try again later." }, { status: 429 });
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES * 1.5) {
    return Response.json({ error: "That photo is too large." }, { status: 413 });
  }
  const body = await readJson(req);
  const m = typeof body?.dataUrl === "string" ? body.dataUrl.match(DATA_URL_RE) : null;
  if (!m) return Response.json({ error: "Photos must be JPEG, PNG, or WebP." }, { status: 400 });

  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > MAX_IMAGE_BYTES) {
    return Response.json({ error: "That photo is too large." }, { status: 413 });
  }
  // Trust the bytes, not the label: rejects HTML/SVG/etc. dressed up as an image.
  const type = sniff(bytes);
  if (!type) return Response.json({ error: "Photos must be JPEG, PNG, or WebP." }, { status: 400 });

  try {
    const id = await imageStore().put({ type, data: bytes.toString("base64") });
    return Response.json({ id }, { status: 201 });
  } catch (e) {
    console.error("image upload failed", e);
    return Response.json({ error: "Could not save the photo." }, { status: 500 });
  }
}
