"use client";

import Link from "next/link";
import { useState } from "react";
import type { Dilemma, PollResults } from "@/lib/types";
import { JuryResults } from "./JuryResults";
import { Verdict } from "./Verdict";

type Props = {
  d: Dilemma;
  update: (p: Partial<Dilemma>) => void;
  poll: { data: PollResults | null; error: string | null };
};

export function Jury({ d, update, poll }: Props) {
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function convene() {
    setCreating(true);
    setErr(null);
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: d.question, options: d.options }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      update({ poll: { token: body.token, createdAt: new Date().toISOString() } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  if (!d.poll) {
    return (
      <div className="card space-y-4 bg-sun/30 text-center">
        <div className="text-5xl" aria-hidden>🧑‍⚖️</div>
        <h3 className="font-display text-2xl font-bold">Put it before a Friend Jury</h3>
        <p className="mx-auto max-w-md text-ink/70">
          You&apos;ll get a link to send to friends. They pick an option and can say why. No sign-up needed.
          Only your question and options are shared; your pros, cons, and ratings stay private.
        </p>
        <button className="btn-primary text-lg" onClick={convene} disabled={creating}>
          {creating ? "Summoning the jury…" : "Convene the jury"}
        </button>
        {err && <p role="alert" className="text-sm font-medium text-coral">{err}</p>}
      </div>
    );
  }

  const link = typeof window !== "undefined" ? `${window.location.origin}/j/${d.poll.token}` : "";

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <div className="space-y-4 md:col-span-3">
        <div className="card space-y-3">
          <h3 className="font-display text-lg font-bold">📨 Invite your jury</h3>
          <div className="flex gap-2">
            <input className="input font-mono text-sm" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Jury link" />
            <button
              className="btn-primary shrink-0"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
          <p className="text-xs text-ink/50">
            Anyone with this link can vote and see the results.{" "}
            <Link href={`/j/${d.poll.token}`} target="_blank" className="underline hover:text-grape">
              Open the voting page
            </Link>{" "}
            to see what friends see (you can vote too).
          </p>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Live tally</h3>
            <span className="flex items-center gap-1 text-xs text-ink/50">
              <span className="h-2 w-2 animate-pulse rounded-full bg-mint" /> updates automatically
            </span>
          </div>
          {poll.error && <p className="mb-2 text-sm text-coral">{poll.error}</p>}
          {poll.data ? <JuryResults p={poll.data} /> : !poll.error && <p className="text-ink/50">Loading…</p>}
        </div>
      </div>

      <div className="md:col-span-2">
        <Verdict d={d} poll={poll.data} />
      </div>
    </div>
  );
}
