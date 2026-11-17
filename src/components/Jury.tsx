"use client";

import Link from "next/link";
import { useState } from "react";
import type { Dilemma, PollResults } from "@/lib/types";
import { JuryResults } from "./JuryResults";
import { Verdict } from "./Verdict";
import { Beaker } from "./Beaker";
import { addOption } from "./DilemmaDetails";

type Props = {
  d: Dilemma;
  update: (p: Partial<Dilemma>) => void;
  poll: { data: PollResults | null; error: string | null };
  syncNote: string | null;
};

/** What the jury sees: the shared options and (if allowed) dealbreakers. */
export function pollPayload(d: Dilemma, share = d.poll?.shareDealbreakers ?? true) {
  return {
    options: d.options.length === 1 ? null : d.options,
    dealbreakers: share ? d.dealbreakers.map((b) => b.text) : [],
  };
}

export function Jury({ d, update, poll, syncNote }: Props) {
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [share, setShare] = useState(true);
  const open = d.options.length === 0;

  async function convene() {
    const payload = pollPayload(d, share);
    if (!payload.options) {
      setErr("Add a second option first, or remove the one you have to collect open opinions.");
      return;
    }
    setCreating(true);
    setErr(null);
    try {
      const res = await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: d.question, ...payload }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      update({
        poll: { token: body.token, ownerKey: body.ownerKey, shareDealbreakers: share, createdAt: new Date().toISOString() },
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  const shareToggle = (checked: boolean, onChange: (v: boolean) => void) =>
    d.dealbreakers.length > 0 && (
      <label className="flex items-center justify-center gap-2 text-sm text-ink/70">
        <input type="checkbox" className="h-4 w-4 accent-grape" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        Show my dealbreakers to the jury
      </label>
    );

  if (!d.poll) {
    return (
      <div className="card space-y-4 text-center">
        <Beaker className="mx-auto h-14 w-14" />
        <h3 className="font-display text-2xl font-bold">{open ? "Ask your friends what they think" : "Put it before a Friend Jury"}</h3>
        <p className="mx-auto max-w-md text-ink/70">
          {open
            ? "No options yet? No problem. Friends share their opinions and suggestions, and you can turn the good ones into options with one click."
            : "Friends pick an option and can say why. No sign-up needed."}{" "}
          Your pros, cons, and ratings stay private.
        </p>
        {shareToggle(share, setShare)}
        <button className="btn-primary text-lg" onClick={convene} disabled={creating}>
          {creating ? "Summoning the jury…" : open ? "Get a link for opinions" : "Convene the jury"}
        </button>
        {err && <p role="status" className="text-sm font-medium text-coral">{err}</p>}
      </div>
    );
  }

  const link = typeof window !== "undefined" ? `${window.location.origin}/j/${d.poll.token}` : "";
  const canEdit = !!d.poll.ownerKey;

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
            Anyone with this link can respond and see the results.{" "}
            <Link href={`/j/${d.poll.token}`} target="_blank" className="underline hover:text-grape">
              Open the voting page
            </Link>{" "}
            to see what friends see.
            {canEdit
              ? " When you change your options or dealbreakers, the jury sees the update automatically."
              : " (This jury was created before live updates existed, so it won't pick up new options.)"}
          </p>
          {canEdit && shareToggle(d.poll.shareDealbreakers ?? true, (v) => update({ poll: { ...d.poll!, shareDealbreakers: v } }))}
          {syncNote && <p className="text-xs text-ink/50">{syncNote}</p>}
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">{poll.data && !poll.data.options.length ? "Open hearing" : "Live tally"}</h3>
            <span className="flex items-center gap-1 text-xs text-ink/50">
              <span className="h-2 w-2 animate-pulse rounded-full bg-mint" /> updates automatically
            </span>
          </div>
          {poll.error && <p className="mb-2 text-sm text-coral">{poll.error}</p>}
          {poll.error?.includes("doesn't exist") && (
            <button className="btn-secondary mb-2 text-sm" onClick={() => update({ poll: undefined })}>
              Start a new jury link
            </button>
          )}
          {poll.data ? (
            <JuryResults
              p={poll.data}
              onAdopt={(text) => {
                const p = addOption(d, text);
                if (p) update(p);
              }}
              adopted={(text) => d.options.some((o) => o.label.toLowerCase() === text.trim().slice(0, 80).toLowerCase())}
            />
          ) : (
            !poll.error && <p className="text-ink/50">Loading…</p>
          )}
        </div>
      </div>

      <div className="md:col-span-2">
        <Verdict d={d} poll={poll.data} />
      </div>
    </div>
  );
}
