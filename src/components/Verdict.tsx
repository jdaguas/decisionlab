"use client";

import { useState } from "react";
import { labelOf, prosConsLeader, weightedLeader, weightedSummary } from "@/lib/analysis";
import { juryLeader } from "@/lib/usePoll";
import { verdict } from "@/lib/verdict";
import type { Dilemma, PollResults } from "@/lib/types";
import { Beaker } from "./Beaker";

export function Verdict({ d, poll }: { d: Dilemma; poll: PollResults | null }) {
  const [seed, setSeed] = useState(() => d.id.charCodeAt(0));

  const w = weightedLeader(d);
  const pc = prosConsLeader(d);
  const analysisId = w ?? pc;
  const jury = juryLeader(poll);

  const v = verdict({
    jury: jury ? labelOf(d.options, jury) : null,
    juryVotes: poll?.totalVotes ?? 0,
    analysis: analysisId ? labelOf(d.options, analysisId) : null,
    analysisName: w ? "weighted comparison" : "pros & cons list",
    ruledOut: weightedSummary(d).filter((r) => r.ruledOut).map((r) => labelOf(d.options, r.optionId)),
    open: (poll?.options.length ?? d.options.length) === 0,
    seed,
  });

  return (
    <div className="card sticky top-4 space-y-4 bg-ink text-paper border-ink">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-sun">
          <Beaker className="h-4 w-4" liquid="var(--color-sun)" stroke="var(--color-paper)" /> The Verdict
        </span>
        <button
          className="rounded-md px-2 py-0.5 text-xs text-paper/60 hover:bg-paper/10 hover:text-paper"
          onClick={() => setSeed((s) => s + 1)}
          title="Same facts, new drama"
        >
          🎲 Reroll
        </button>
      </div>
      <p className="font-display text-2xl font-semibold tracking-tight leading-snug">{v.headline}</p>
      <p className="text-sm text-paper/70">{v.detail}</p>
      <p className="border-t border-paper/20 pt-3 text-[11px] uppercase tracking-wide text-paper/40">
        Nonbinding · for entertainment · you are the judge
      </p>
    </div>
  );
}
