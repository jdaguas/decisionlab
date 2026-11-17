import type { NextRequest } from "next/server";
import { ownerKeyMatches, pollStore, results } from "@/lib/server/pollStore";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";
import { parsePollDetails, readJson, TOKEN_RE } from "@/lib/server/validate";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/polls/[token]">) {
  const { token } = await ctx.params;
  if (!TOKEN_RE.test(token)) {
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

/** Creator-only: keep the poll's options and dealbreakers in sync with the dilemma. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/polls/[token]">) {
  const { token } = await ctx.params;
  if (!TOKEN_RE.test(token)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (!rateLimit(`update:${clientIp(req)}`, 60, 10 * 60 * 1000)) {
    return Response.json({ error: "Slow down a little." }, { status: 429 });
  }
  const body = await readJson(req);
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });
  const { ownerKey } = body;
  if (typeof ownerKey !== "string" || ownerKey.length > 100) {
    return Response.json({ error: "Not allowed" }, { status: 403 });
  }
  const details = parsePollDetails(body);
  if (!details.ok) return Response.json({ error: details.error }, { status: 400 });

  try {
    const store = pollStore();
    const poll = await store.get(token);
    // Same response for "no such poll" and "wrong key", so tokens can't be probed.
    if (!poll || !ownerKeyMatches(ownerKey, poll.owner_key_hash)) {
      return Response.json({ error: "Not allowed" }, { status: 403 });
    }
    await store.update(poll.id, details.value);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("update poll failed", e);
    return Response.json({ error: "Could not update poll." }, { status: 500 });
  }
}
