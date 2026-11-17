import type { NextRequest } from "next/server";
import { results } from "@/lib/server/pollStore";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/polls/[token]">) {
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{10,64}$/.test(token)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (!rateLimit(`read:${clientIp(req)}`, 120, 60 * 1000)) {
    return Response.json({ error: "Slow down a little." }, { status: 429 });
  }
  try {
    const r = await results(token);
    if (!r) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(r, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("read poll failed", e);
    return Response.json({ error: "Could not load poll." }, { status: 500 });
  }
}
