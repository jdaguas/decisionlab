import { hashKey, newOwnerKey, pollStore } from "@/lib/server/pollStore";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";
import { parsePollDetails, readJson } from "@/lib/server/validate";

export async function POST(req: Request) {
  if (!rateLimit(`create:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return Response.json({ error: "Too many polls created. Try again later." }, { status: 429 });
  }
  const body = await readJson(req);
  if (!body) return Response.json({ error: "Invalid JSON" }, { status: 400 });

  const { question } = body;
  if (typeof question !== "string" || !question.trim() || question.length > 200) {
    return Response.json({ error: "Question must be 1–200 characters." }, { status: 400 });
  }
  const details = parsePollDetails(body);
  if (!details.ok) return Response.json({ error: details.error }, { status: 400 });

  try {
    const ownerKey = newOwnerKey();
    const token = await pollStore().create(question.trim(), details.value, hashKey(ownerKey));
    // ownerKey is returned exactly once; only its hash is stored.
    return Response.json({ token, ownerKey }, { status: 201 });
  } catch (e) {
    console.error("create poll failed", e);
    return Response.json({ error: "Could not create poll." }, { status: 500 });
  }
}
