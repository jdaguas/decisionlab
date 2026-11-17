import { pollStore } from "@/lib/server/pollStore";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";

const ID_RE = /^[A-Za-z0-9-]{1,64}$/;

export async function POST(req: Request) {
  if (!rateLimit(`create:${clientIp(req)}`, 10, 60 * 60 * 1000)) {
    return Response.json({ error: "Too many polls created. Try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { question, options } = (body ?? {}) as { question?: unknown; options?: unknown };

  if (typeof question !== "string" || !question.trim() || question.length > 200) {
    return Response.json({ error: "Question must be 1–200 characters." }, { status: 400 });
  }
  if (!Array.isArray(options) || options.length < 2 || options.length > 6) {
    return Response.json({ error: "Provide 2–6 options." }, { status: 400 });
  }
  const clean = [];
  for (const o of options) {
    if (
      !o || typeof o.id !== "string" || !ID_RE.test(o.id) ||
      typeof o.label !== "string" || !o.label.trim() || o.label.length > 80
    ) {
      return Response.json({ error: "Each option needs an id and a 1–80 character label." }, { status: 400 });
    }
    clean.push({ id: o.id, label: o.label.trim() });
  }

  try {
    const token = await pollStore().create(question.trim(), clean);
    return Response.json({ token }, { status: 201 });
  } catch (e) {
    console.error("create poll failed", e);
    return Response.json({ error: "Could not create poll." }, { status: 500 });
  }
}
