"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getDilemma, saveDilemma } from "@/lib/storage";
import { usePoll } from "@/lib/usePoll";
import type { Dilemma, Method, Mode } from "@/lib/types";
import { ProsCons } from "@/components/ProsCons";
import { Weighted } from "@/components/Weighted";
import { Jury } from "@/components/Jury";
import { Decide } from "@/components/Decide";

const MODES: { id: Mode; label: string; blurb: string }[] = [
  { id: "think", label: "🧠 Think It Through", blurb: "Weigh it yourself" },
  { id: "settle", label: "🧪 Settle This", blurb: "Ask your friends" },
];
const METHODS: { id: Method; label: string }[] = [
  { id: "proscons", label: "Pros & Cons" },
  { id: "weighted", label: "Weighted Comparison" },
];

export default function Workspace() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Dilemma | null | undefined>(undefined);
  const poll = usePoll(d?.poll?.token);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setD(getDilemma(id) ?? null);
  }, [id]);

  const update = useCallback((patch: Partial<Dilemma>) => {
    setD((cur) => (cur ? saveDilemma({ ...cur, ...patch }) : cur));
  }, []);

  if (d === undefined) return null;
  if (d === null) {
    return (
      <div className="card mx-auto max-w-md space-y-3 text-center">
        <p className="font-display text-xl font-bold">We couldn&apos;t find that dilemma.</p>
        <p className="text-sm text-ink/60">Dilemmas are saved in the browser where you created them.</p>
        <Link href="/" className="btn-primary">Back home</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="btn-ghost -ml-2 mb-2">← All dilemmas</Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight leading-tight">{d.question}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          {d.options.map((o, i) => (
            <span key={o.id} className="chip bg-white">
              {i > 0 && <span className="mr-2 text-xs text-ink/40">vs</span>}
              {o.label}
            </span>
          ))}
        </div>
      </div>

      <div role="tablist" aria-label="Mode" className="grid grid-cols-2 gap-2 rounded-lg border border-ink/10 bg-white p-1">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={d.mode === m.id}
            onClick={() => update({ mode: m.id })}
            className={`rounded-md px-3 py-2 text-left transition sm:text-center ${
              d.mode === m.id ? "bg-ink text-paper" : "hover:bg-ink/5"
            }`}
          >
            <div className="font-display font-bold">{m.label}</div>
            <div className={`text-xs ${d.mode === m.id ? "text-paper/60" : "text-ink/50"}`}>{m.blurb}</div>
          </button>
        ))}
      </div>

      {d.mode === "think" ? (
        <div className="space-y-4">
          <div className="flex gap-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                onClick={() => update({ method: m.id })}
                className={`chip px-4 py-1 ${d.method === m.id ? "bg-sun" : "bg-white hover:bg-sun/40"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
          {d.method === "proscons" ? <ProsCons d={d} update={update} /> : <Weighted d={d} update={update} />}
          <p className="text-sm text-ink/60">
            Want a second opinion?{" "}
            <button className="font-semibold text-grape underline" onClick={() => update({ mode: "settle" })}>
              Send it to a Friend Jury →
            </button>
          </p>
        </div>
      ) : (
        <Jury d={d} update={update} poll={poll} />
      )}

      <Decide key={d.outcome?.decidedAt ?? "none"} d={d} update={update} poll={poll.data} />
    </div>
  );
}
