"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDilemma, saveDilemma } from "@/lib/storage";
import { usePoll } from "@/lib/usePoll";
import type { Dilemma, PollResults, Tool } from "@/lib/types";
import { ProsCons } from "@/components/ProsCons";
import { Weighted } from "@/components/Weighted";
import { Jury, pollPayload } from "@/components/Jury";
import { Decide } from "@/components/Decide";
import { DilemmaDetails } from "@/components/DilemmaDetails";

const GROUPS: { name: string; tools: { id: Tool; label: string }[] }[] = [
  { name: "Think it through", tools: [{ id: "proscons", label: "Pros & Cons" }, { id: "weighted", label: "Weighted Comparison" }] },
  { name: "Ask others", tools: [{ id: "jury", label: "Peer Review" }] },
];

/**
 * Keeps a live jury in step with the dilemma: when you add, rename, or remove
 * options or dealbreakers, push them to the poll (creator-only, via owner key).
 */
function useJurySync(d: Dilemma | null | undefined, server: PollResults | null, refresh: () => void) {
  const [note, setNote] = useState<string | null>(null);
  const failed = useRef(false);

  const token = d?.poll?.token;
  const ownerKey = d?.poll?.ownerKey;
  const want = d ? pollPayload(d) : null;
  const wantSig = want?.options ? JSON.stringify(want) : null;
  const haveSig = server ? JSON.stringify({ options: server.options, dealbreakers: server.dealbreakers }) : null;

  useEffect(() => {
    if (!token || !ownerKey || !wantSig || !haveSig || wantSig === haveSig || failed.current) return;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/polls/${token}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerKey, ...JSON.parse(wantSig) }),
        });
        if (!res.ok) {
          failed.current = true;
          setNote("Couldn't update peer review with your latest changes.");
          return;
        }
        setNote("✓ Peer review updated with your latest options.");
        refresh();
      } catch {
        setNote("Couldn't reach peer review. Will retry when you edit again.");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [token, ownerKey, wantSig, haveSig, refresh]);

  const pending = d?.options.length === 1 && !!token ? "Add one more option to update peer review." : null;
  return pending ?? note;
}

function NeedsOptions({ onJury }: { onJury: () => void }) {
  return (
    <div className="card space-y-3 text-center">
      <p className="font-display text-lg font-semibold">This tool compares options.</p>
      <p className="mx-auto max-w-md text-sm text-ink/60">
        Add at least two options in the box above, or ask your friends for ideas first.
      </p>
      <button className="btn-secondary" onClick={onJury}>Ask your peers for ideas →</button>
    </div>
  );
}

export default function Workspace() {
  const { id } = useParams<{ id: string }>();
  const [d, setD] = useState<Dilemma | null | undefined>(undefined);
  const poll = usePoll(d?.poll?.token);
  const syncNote = useJurySync(d, poll.data, poll.refresh);

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

  const enoughOptions = d.options.length >= 2;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="btn-ghost -ml-2 mb-2">← All dilemmas</Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{d.question}</h1>
      </div>

      <DilemmaDetails d={d} update={update} />

      <nav aria-label="Tools" className="flex flex-wrap items-end gap-x-6 gap-y-3 border-b border-ink/10">
        {GROUPS.map((g) => (
          <div key={g.name}>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink/40">{g.name}</div>
            <div className="flex gap-1">
              {g.tools.map((t) => (
                <button
                  key={t.id}
                  aria-current={d.tool === t.id ? "page" : undefined}
                  onClick={() => update({ tool: t.id })}
                  className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
                    d.tool === t.id ? "border-grape text-ink" : "border-transparent text-ink/50 hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {d.tool === "jury" ? (
        <Jury d={d} update={update} poll={poll} syncNote={syncNote} />
      ) : !enoughOptions ? (
        <NeedsOptions onJury={() => update({ tool: "jury" })} />
      ) : d.tool === "proscons" ? (
        <ProsCons d={d} update={update} />
      ) : (
        <Weighted d={d} update={update} />
      )}

      <Decide key={d.outcome?.decidedAt ?? "none"} d={d} update={update} poll={poll.data} />
    </div>
  );
}
