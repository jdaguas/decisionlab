import type { NextRequest } from "next/server";
import { imageStore } from "@/lib/server/imageStore";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";
import { IMAGE_ID_RE } from "@/lib/server/validate";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/images/[id]">) {
  const { id } = await ctx.params;
  if (!IMAGE_ID_RE.test(id)) return new Response("Not found", { status: 404 });
  if (!rateLimit(`imgread:${clientIp(req)}`, 600, 60 * 1000)) return new Response("Slow down", { status: 429 });
  try {
    const img = await imageStore().get(id);
    if (!img) return new Response("Not found", { status: 404 });
    return new Response(Buffer.from(img.data, "base64"), {
      headers: {
        "Content-Type": img.type,
        // Images never change once uploaded (a new photo gets a new id).
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (e) {
    console.error("image read failed", e);
    return new Response("Error", { status: 500 });
  }
}
