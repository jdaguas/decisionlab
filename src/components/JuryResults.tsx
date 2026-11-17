"use client";

import { labelOf } from "@/lib/analysis";
import type { PollResults } from "@/lib/types";
import { OptionLink } from "./OptionLink";

const COLORS = ["bg-grape", "bg-mint", "bg-coral", "bg-sun", "bg-sky-400", "bg-pink-400"];

type Props = {
  p: PollResults;
  highlight?: string;
  /** Creator only: turn a friend's suggestion into an option. */
  onAdopt?: (text: string) => void;
  adopted?: (text: string) => boolean;
};

export function JuryResults({ p, highlight, onAdopt, adopted }: Props) {
  const open = p.options.length === 0;
  return (
    <div className="space-y-5">
      {!open && (
        <div className="space-y-3">
          {p.options.map((o, i) => {
            const n = p.tallies[o.id] ?? 0;
            const pct = p.totalVotes ? Math.round((n / p.totalVotes) * 100) : 0;
            return (
              <div key={o.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold">
                    {o.label} <OptionLink url={o.url} label={false} />{" "}
                    {highlight === o.id && <span className="text-xs text-grape">(your vote)</span>}
                  </span>
                  <span className="font-mono">
                    {n} vote{n === 1 ? "" : "s"} · {pct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-sm bg-ink/10">
                  <div className={`h-full transition-all duration-500 ${COLORS[i % COLORS.length]}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <h4 className="mb-2 font-display font-bold">{open ? "💬 Reviewer notes" : "💬 Reviewer comments"}</h4>
        {p.reasons.length === 0 ? (
          <p className="text-sm text-ink/50">{open ? "No notes yet." : "No comments yet."}</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {p.reasons.map((r, i) => (
              <li key={i} className="flex items-start justify-between gap-2 rounded-md border border-ink/10 bg-paper px-3 py-2 text-sm">
                <span>
                  <span className="mr-2 chip border-ink/30 bg-white py-0 text-xs">
                    {r.optionId ? `for ${labelOf(p.options, r.optionId)}` : "opinion"}
                  </span>
                  &ldquo;{r.reason}&rdquo;
                </span>
                {onAdopt && !r.optionId && (
                  adopted?.(r.reason) ? (
                    <span className="shrink-0 text-xs text-mint">✓ Added</span>
                  ) : (
                    <button
                      className="btn-ghost shrink-0 text-xs"
                      title="Turn this suggestion into an option"
                      onClick={() => onAdopt(r.reason)}
                    >
                      + Add as option
                    </button>
                  )
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
