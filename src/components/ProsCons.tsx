"use client";

import { isRuledOut, prosConsSummary } from "@/lib/analysis";
import { DealbreakerToggle } from "./DilemmaDetails";
import { OptionLink } from "./OptionLink";
import { uid } from "@/lib/storage";
import type { Dilemma, Factor } from "@/lib/types";

const WEIGHT_LABEL = { 1: "minor", 2: "matters", 3: "big deal" } as const;

export function ProsCons({ d, update }: { d: Dilemma; update: (p: Partial<Dilemma>) => void }) {
  const summary = prosConsSummary(d);

  const setFactor = (id: string, patch: Partial<Factor>) =>
    update({ factors: d.factors.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  const add = (optionId: string, type: Factor["type"]) =>
    update({ factors: [...d.factors, { id: uid(), optionId, type, text: "", weight: 2 }] });
  const remove = (id: string) => update({ factors: d.factors.filter((f) => f.id !== id) });

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/60">
        List what&apos;s good and bad about each option, and mark how much each one matters to you.
      </p>
      <div className={`grid gap-4 ${d.options.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        {d.options.map((o) => {
          const s = summary.find((x) => x.optionId === o.id)!;
          const out = isRuledOut(d, o.id);
          return (
            <div key={o.id} className={`card space-y-4 ${out ? "border-coral/40" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className={`font-display text-lg font-bold ${out ? "text-ink/40 line-through" : ""}`}>{o.label}</h3>
                  <OptionLink url={o.url} />
                </div>
                <span
                  className={`chip shrink-0 ${s.net > 0 ? "bg-mint-soft" : s.net < 0 ? "bg-coral-soft" : "bg-white"}`}
                  title="Pros minus cons, weighted by importance"
                >
                  {s.net > 0 ? "+" : ""}
                  {s.net}
                </span>
              </div>
              {(["pro", "con"] as const).map((type) => (
                <div key={type}>
                  <h4 className={`mb-2 text-sm font-bold ${type === "pro" ? "text-mint" : "text-coral"}`}>
                    {type === "pro" ? "👍 Pros" : "👎 Cons"}
                  </h4>
                  <ul className="space-y-2">
                    {d.factors
                      .filter((f) => f.optionId === o.id && f.type === type)
                      .map((f) => (
                        <li key={f.id} className="flex items-center gap-1">
                          <input
                            className="input py-1 text-sm"
                            value={f.text}
                            maxLength={120}
                            placeholder={type === "pro" ? "Something good…" : "Something bad…"}
                            aria-label={`${type} for ${o.label}`}
                            autoFocus={!f.text}
                            onChange={(e) => setFactor(f.id, { text: e.target.value })}
                            onKeyDown={(e) => e.key === "Enter" && f.text.trim() && add(o.id, type)}
                          />
                          <button
                            className="shrink-0 rounded border border-ink/15 px-1.5 py-0.5 font-mono text-xs hover:border-ink"
                            title={`Importance: ${WEIGHT_LABEL[f.weight]} (click to change)`}
                            aria-label={`Importance: ${WEIGHT_LABEL[f.weight]}`}
                            onClick={() => setFactor(f.id, { weight: ((f.weight % 3) + 1) as Factor["weight"] })}
                          >
                            {"●".repeat(f.weight)}
                            <span className="text-ink/20">{"●".repeat(3 - f.weight)}</span>
                          </button>
                          <button className="btn-ghost shrink-0" aria-label="Remove" onClick={() => remove(f.id)}>
                            ✕
                          </button>
                        </li>
                      ))}
                  </ul>
                  <button className="btn-ghost mt-1" onClick={() => add(o.id, type)}>
                    + Add {type}
                  </button>
                </div>
              ))}
              {d.dealbreakers.length > 0 && (
                <div className="border-t border-ink/10 pt-3">
                  <h4 className="mb-2 text-sm font-bold text-ink/70">🚫 Dealbreakers</h4>
                  <ul className="space-y-1.5">
                    {d.dealbreakers.map((b) => (
                      <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-ink/70">{b.text}</span>
                        <DealbreakerToggle d={d} update={update} optionId={o.id} dealbreakerId={b.id} />
                      </li>
                    ))}
                  </ul>
                  {out && <p className="mt-2 text-xs font-semibold text-coral">Ruled out in every tool.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-ink/50">
        Tip: click the dots to set importance (● minor, ●● matters, ●●● big deal). The score is just pros minus
        cons. It&apos;s a nudge, not an answer.
      </p>
    </div>
  );
}
