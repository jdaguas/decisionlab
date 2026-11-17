"use client";

import { labelOf } from "@/lib/analysis";
import type { PollResults } from "@/lib/types";

const COLORS = ["bg-grape", "bg-mint", "bg-coral", "bg-sun", "bg-sky-400", "bg-pink-400"];

export function JuryResults({ p, highlight }: { p: PollResults; highlight?: string }) {
  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {p.options.map((o, i) => {
          const n = p.tallies[o.id] ?? 0;
          const pct = p.totalVotes ? Math.round((n / p.totalVotes) * 100) : 0;
          return (
            <div key={o.id}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-semibold">
                  {o.label} {highlight === o.id && <span className="text-xs text-grape">(your vote)</span>}
                </span>
                <span className="font-mono">
                  {n} vote{n === 1 ? "" : "s"} · {pct}%
                </span>
              </div>
              <div className="h-5 overflow-hidden rounded-full border-2 border-ink bg-white">
                <div className={`h-full transition-all duration-500 ${COLORS[i % COLORS.length]}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <h4 className="mb-2 font-display font-bold">🗣️ Closing arguments</h4>
        {p.reasons.length === 0 ? (
          <p className="text-sm text-ink/50">No arguments filed yet.</p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {p.reasons.map((r, i) => (
              <li key={i} className="rounded-xl border-2 border-ink/15 bg-paper px-3 py-2 text-sm">
                <span className="mr-2 chip border-ink/30 bg-white py-0 text-xs">
                  for {labelOf(p.options, r.optionId)}
                </span>
                &ldquo;{r.reason}&rdquo;
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
