import type { NextRequest } from "next/server";
import { pollStore } from "@/lib/server/pollStore";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";
import { readJson, TOKEN_RE } from "@/lib/server/validate";

export async function POST(req: NextRequest, ctx: RouteContext<"/api/polls/[token]/vote">) {
  const { token } = await ctx.params;
  if (!TOKEN_RE.test(token)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (!rateLimit(`vote:${clientIp(req)}`, 30, 10 * 60 * 1000)) {
    return Response.json({ error: "Too many votes from this network. Try again later." }, { status: 429 });
  }
  const body = await readJson(req);
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });
  const { optionId, voterId, reason } = body;

  if (typeof voterId !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(voterId)) {
    return Response.json({ error: "Invalid voter." }, { status: 400 });
  }
  if (reason != null && (typeof reason !== "string" || reason.length > 280)) {
    return Response.json({ error: "Responses are limited to 280 characters." }, { status: 400 });
  }
  const r = typeof reason === "string" && reason.trim() ? reason.trim() : null;

  try {
    const store = pollStore();
    const poll = await store.get(token);
    if (!poll) return Response.json({ error: "Not found" }, { status: 404 });

    let chosen: string | null = null;
    if (poll.options.length > 0) {
      if (typeof optionId !== "string" || !poll.options.some((o) => o.id === optionId)) {
        return Response.json({ error: "Pick one of the options." }, { status: 400 });
      }
      chosen = optionId;
    } else if (!r) {
      // Open-ended poll: the opinion itself is the response.
      return Response.json({ error: "Share your opinion first." }, { status: 400 });
    }
    await store.vote(poll.id, chosen, voterId, r);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("vote failed", e);
    return Response.json({ error: "Could not record vote." }, { status: 500 });
  }
}
