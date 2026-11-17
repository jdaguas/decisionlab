"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getVoterId } from "@/lib/storage";
import { usePoll } from "@/lib/usePoll";
import { JuryResults } from "@/components/JuryResults";

export default function JuryVote() {
  const { token } = useParams<{ token: string }>();
  const { data, error, refresh } = usePoll(token, 5000);
  const storageKey = `decisionlab:voted:${token}`;

  const [choice, setChoice] = useState("");
  const [reason, setReason] = useState("");
  const [voted, setVoted] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoted(localStorage.getItem(storageKey));
  }, [storageKey]);

  async function submit() {
    if (!choice) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/polls/${token}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId: choice, reason: reason.trim() || null, voterId: getVoterId() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't record your vote.");
      localStorage.setItem(storageKey, choice);
      setVoted(choice);
      refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't record your vote.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!data) {
    return (
      <div className="card mx-auto max-w-md text-center">
        {error ? <p className="font-semibold">{error}</p> : <p className="text-ink/50">Entering the courtroom…</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="text-center">
        <p className="mb-2 text-sm font-bold uppercase tracking-widest text-grape">🧑‍⚖️ You&apos;ve been summoned for jury duty</p>
        <h1 className="font-display text-3xl font-extrabold leading-tight">{data.question}</h1>
      </div>

      {voted ? (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-bold">Your vote is in. Here&apos;s the room:</p>
            <button className="btn-ghost" onClick={() => { setChoice(voted); setVoted(null); }}>
              Change vote
            </button>
          </div>
          <JuryResults p={data} highlight={voted} />
        </div>
      ) : (
        <div className="card space-y-4">
          <fieldset>
            <legend className="label">What should they do?</legend>
            <div className="grid gap-2">
              {data.options.map((o) => (
                <label
                  key={o.id}
                  className={`cursor-pointer rounded-xl border-2 px-4 py-3 font-display text-lg font-bold transition ${
                    choice === o.id ? "border-ink bg-grape text-white shadow-[3px_3px_0_0_var(--color-ink)]" : "border-ink/20 bg-white hover:border-ink"
                  }`}
                >
                  <input type="radio" name="vote" className="sr-only" value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="reason" className="label">
              Your closing argument <span className="font-normal text-ink/50">(optional, but it helps!)</span>
            </label>
            <textarea
              id="reason" rows={2} maxLength={280} className="input resize-none"
              placeholder="Why this one?"
              value={reason} onChange={(e) => setReason(e.target.value)}
            />
            <p className="text-right text-xs text-ink/40">{reason.length}/280</p>
          </div>
          {err && <p role="alert" className="text-sm font-medium text-coral">{err}</p>}
          <button className="btn-primary w-full text-lg" disabled={!choice || submitting} onClick={submit}>
            {submitting ? "Filing…" : "Cast my vote"}
          </button>
          <p className="text-center text-xs text-ink/50">Anonymous: your name isn&apos;t collected. Your argument is visible to everyone with this link.</p>
        </div>
      )}

      <p className="text-center text-sm text-ink/60">
        Got your own dilemma? <Link href="/new" className="font-semibold text-grape underline">Start one on DecisionLab</Link>
      </p>
    </div>
  );
}
