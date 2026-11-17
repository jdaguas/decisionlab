"use client";

import { useState } from "react";
import { isRuledOut, labelOf, matrixLeader, prosConsLeader, treeLeader, weightedLeader } from "@/lib/analysis";
import { juryLeader } from "@/lib/usePoll";
import type { Dilemma, PollResults } from "@/lib/types";

function Signal({ name, value, hint }: { name: string; value: string | null; hint: string }) {
  return (
    <div className="rounded-md border border-ink/10 bg-paper p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink/50">{name}</div>
      <div className="font-display font-bold">{value ?? <span className="text-ink/40">{hint}</span>}</div>
    </div>
  );
}

export function Decide({ d, update, poll }: { d: Dilemma; update: (p: Partial<Dilemma>) => void; poll: PollResults | null }) {
  const [choice, setChoice] = useState(d.outcome?.optionId ?? "");
  const [note, setNote] = useState(d.outcome?.note ?? "");
  const [editing, setEditing] = useState(!d.outcome);

  const pc = prosConsLeader(d);
  const w = weightedLeader(d);
  const m = matrixLeader(d);
  const t = treeLeader(d);
  const j = juryLeader(poll);
  const L = (id: string | null) => (id ? labelOf(d.options, id) : null);

  const signals = [pc, w, m, t, j].filter(Boolean);
  const agree = signals.length >= 2 && signals.every((s) => s === signals[0]);

  if (d.options.length < 2) {
    return (
      <section className="card space-y-1">
        <h2 className="font-display text-2xl font-bold">📝 Your conclusion</h2>
        <p className="text-sm text-ink/60">Once you have at least two options, you can compare where each tool landed and record your decision here.</p>
      </section>
    );
  }

  return (
    <section className="card space-y-4">
      <h2 className="font-display text-2xl font-bold">📝 Your conclusion</h2>

      <div>
        <p className="mb-2 text-sm text-ink/60">Here&apos;s where each method landed:</p>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Signal name="Pros & Cons" value={L(pc)} hint={d.factors.length ? "Tied" : "Not tried yet"} />
          <Signal name="Weighted" value={L(w)} hint={d.criteria.length ? "Tied / all ruled out" : "Not tried yet"} />
          <Signal name="2×2 Matrix" value={L(m)} hint={d.matrices.some((m) => Object.keys(m.pos).length) ? "Tied / place 2+" : "Not tried yet"} />
          <Signal name="Decision Tree" value={L(t)} hint={Object.values(d.tree).some((l) => l.length) ? "Tied / needs 2+" : "Not tried yet"} />
          <Signal name="Peer Review" value={L(j)} hint={!d.poll ? "Not sent out" : poll?.totalVotes ? "Tied" : "No votes yet"} />
        </div>
        {signals.length >= 2 && (
          <p className={`mt-2 text-sm font-semibold ${agree ? "text-mint" : "text-coral"}`}>
            {agree ? "✓ Your methods agree." : "⚠ Your methods disagree. Worth asking yourself why."}
          </p>
        )}
      </div>

      {!editing && d.outcome ? (
        <div className="rounded-md border border-mint/40 bg-mint-soft p-4">
          <p className="text-sm font-semibold text-mint">Decided {new Date(d.outcome.decidedAt).toLocaleDateString()}</p>
          <p className="font-display text-2xl font-semibold tracking-tight">{labelOf(d.options, d.outcome.optionId)}</p>
          {d.outcome.note && <p className="mt-1 text-ink/70">&ldquo;{d.outcome.note}&rdquo;</p>}
          <button className="btn-ghost mt-2" onClick={() => setEditing(true)}>Change my mind</button>
        </div>
      ) : (
        <div className="space-y-3">
          <fieldset>
            <legend className="label">I&apos;m going with…</legend>
            <div className="flex flex-wrap gap-2">
              {d.options.map((o) => (
                <label
                  key={o.id}
                  className={`chip cursor-pointer px-4 py-1.5 ${choice === o.id ? "bg-grape text-white" : "bg-white hover:bg-grape-soft"}`}
                >
                  <input type="radio" name="choice" className="sr-only" value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} />
                  {o.label}
                  {isRuledOut(d, o.id) && <span className="ml-1 text-xs opacity-70">(breaks a dealbreaker)</span>}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="note" className="label">Why? <span className="font-normal text-ink/50">(optional, for future you)</span></label>
            <input id="note" className="input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. It's a once-in-a-lifetime show, and I'll work Thursday" />
          </div>
          <button
            className="btn-primary"
            disabled={!choice}
            onClick={() => {
              update({ outcome: { optionId: choice, note: note.trim(), decidedAt: new Date().toISOString() } });
              setEditing(false);
            }}
          >
            Record my decision
          </button>
        </div>
      )}
    </section>
  );
}
