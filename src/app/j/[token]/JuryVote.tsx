"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getVoterId } from "@/lib/storage";
import { usePoll } from "@/lib/usePoll";
import { JuryResults } from "@/components/JuryResults";
import { OptionLink } from "@/components/OptionLink";
import { OptionImage } from "@/components/OptionImage";

/** Marker stored locally when a friend answered an open-ended poll. */
const OPINION = "__opinion__";

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

  const open = !!data && data.options.length === 0;
  // If the creator added options after you gave an opinion, or removed the one
  // you voted for, invite you to vote again.
  const stale = !!data && !!voted && (open ? voted !== OPINION : !data.options.some((o) => o.id === voted));
  const hasVoted = !!voted && !stale;

  async function submit() {
    if (open ? !reason.trim() : !choice) return;
    setSubmitting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/polls/${token}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId: open ? null : choice, reason: reason.trim() || null, voterId: getVoterId() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't record your response.");
      const v = open ? OPINION : choice;
      localStorage.setItem(storageKey, v);
      setVoted(v);
      refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't record your response.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!data) {
    return (
      <div className="card mx-auto max-w-md text-center">
        {error ? <p className="font-semibold">{error}</p> : <p className="text-ink/50">Opening the lab notebook…</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="text-center">
        <p className="mb-2 text-sm font-bold uppercase tracking-widest text-grape">
          🧪 {open ? "Your input has been requested" : "You've been asked to peer review"}
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{data.question}</h1>
      </div>

      {data.dealbreakers.length > 0 && (
        <div className="rounded-md border border-coral/30 bg-coral-soft/40 px-4 py-3 text-sm">
          <p className="mb-1 font-semibold">Their dealbreakers:</p>
          <ul className="list-inside list-disc text-ink/70">
            {data.dealbreakers.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </div>
      )}

      {hasVoted ? (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-bold">
              {open ? "Thanks! Here's what everyone thinks so far:" : "Your vote is in. Here's the room:"}
            </p>
            <button className="btn-ghost" onClick={() => { setChoice(voted === OPINION ? "" : voted!); setVoted(null); }}>
              {open ? "Edit" : "Change vote"}
            </button>
          </div>
          <JuryResults p={data} highlight={voted ?? undefined} />
        </div>
      ) : (
        <div className="card space-y-4">
          {stale && (
            <p className="rounded-md bg-grape-soft px-3 py-2 text-sm text-grape">
              {open ? "The options changed. Share your take again." : "New options were added. Cast your vote!"}
            </p>
          )}
          {!open && (
            <fieldset>
              <legend className="label">What should they do?</legend>
              {data.options.some((o) => o.imageId) ? (
                <div className="grid grid-cols-2 gap-3">
                  {data.options.map((o) => (
                    <label
                      key={o.id}
                      className={`cursor-pointer overflow-hidden rounded-lg border-2 bg-white transition ${
                        choice === o.id ? "border-grape ring-2 ring-grape/25" : "border-ink/10 hover:border-ink/30"
                      }`}
                    >
                      <input type="radio" name="vote" className="sr-only" value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} />
                      {o.imageId ? (
                        <OptionImage o={o} size="hero" className="rounded-none" />
                      ) : (
                        <div className="grid aspect-square place-items-center bg-ink/5 text-xs text-ink/40">No photo</div>
                      )}
                      <div className={`flex items-center justify-between gap-2 px-3 py-2 text-sm font-semibold ${choice === o.id ? "bg-grape text-white" : ""}`}>
                        <span>{choice === o.id && "✓ "}{o.label}</span>
                        {o.url && <OptionLink url={o.url} label={false} className={choice === o.id ? "text-white" : ""} />}
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
              <div className="grid gap-2">
                {data.options.map((o) => (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border px-4 py-3 font-display text-lg font-bold transition ${
                      choice === o.id ? "border-grape bg-grape text-white" : "border-ink/15 bg-white hover:border-ink/40"
                    }`}
                  >
                    <input type="radio" name="vote" className="sr-only" value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} />
                    {o.label}
                    {o.url && (
                      <OptionLink url={o.url} className={choice === o.id ? "text-white" : ""} />
                    )}
                  </label>
                ))}
              </div>
              )}
            </fieldset>
          )}
          <div>
            <label htmlFor="reason" className="label">
              {open ? (
                "What do you think? Suggest an option or share your take."
              ) : (
                <>Reviewer comments <span className="font-normal text-ink/50">(optional, but it helps!)</span></>
              )}
            </label>
            <textarea
              id="reason" rows={open ? 3 : 2} maxLength={280} className="input resize-none"
              placeholder={open ? "e.g. Try the new ramen place on Clark. You can paste a link too." : "Why this one?"}
              value={reason} onChange={(e) => setReason(e.target.value)}
            />
            <p className="text-right text-xs text-ink/40">{reason.length}/280</p>
          </div>
          {err && <p role="status" className="text-sm font-medium text-coral">{err}</p>}
          <button
            className="btn-primary w-full text-lg"
            disabled={(open ? !reason.trim() : !choice) || submitting}
            onClick={submit}
          >
            {submitting ? "Submitting…" : open ? "Share my opinion" : "Cast my vote"}
          </button>
          <p className="text-center text-xs text-ink/50">Anonymous: your name isn&apos;t collected. What you write is visible to everyone with this link.</p>
        </div>
      )}

      <p className="text-center text-sm text-ink/60">
        Got your own dilemma? <Link href="/" className="font-semibold text-grape underline">Start one on DecisionLab</Link>
      </p>
    </div>
  );
}
