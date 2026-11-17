"use client";

import { scoreFor, weightedSummary } from "@/lib/analysis";
import { uid } from "@/lib/storage";
import type { Criterion, Dilemma } from "@/lib/types";
import { DealbreakerToggle } from "./DilemmaDetails";
import { OptionImage } from "./OptionImage";

const SUGGESTIONS = ["Cost", "Time", "Fun", "Stress", "Long-term impact", "Time with friends"];
const SCORE_HINT = ["", "awful", "meh", "okay", "good", "great"];

export function Weighted({ d, update }: { d: Dilemma; update: (p: Partial<Dilemma>) => void }) {
  const rows = weightedSummary(d);
  const used = new Set(d.criteria.map((c) => c.label.toLowerCase()));

  const setCrit = (id: string, patch: Partial<Criterion>) =>
    update({ criteria: d.criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const addCrit = (label = "") =>
    update({ criteria: [...d.criteria, { id: uid(), label, weight: 3 }] });
  const removeCrit = (id: string) => update({ criteria: d.criteria.filter((c) => c.id !== id) });
  const setScore = (optionId: string, criterionId: string, score: number) =>
    update({ scores: { ...d.scores, [optionId]: { ...d.scores[optionId], [criterionId]: score } } });

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/60">
        Pick what matters, decide how much it matters, then rate each option. Higher is always better, so for
        &ldquo;Cost&rdquo; a cheap option gets a 5.
      </p>

      {d.dealbreakers.length > 0 && (
        <div className="card overflow-x-auto">
          <h3 className="mb-1 font-display font-bold">🚫 Dealbreakers first</h3>
          <p className="mb-3 text-xs text-ink/50">
            Does any option break one? Breaking one rules it out no matter how it scores. These are the same
            checks as in Pros &amp; Cons.
          </p>
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left">
                <th />
                {d.options.map((o) => (
                  <th key={o.id} className="px-2 pb-2">
                    <span className="chip gap-1.5 bg-white text-xs text-ink"><OptionImage o={o} size="dot" />{o.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.dealbreakers.map((b) => (
                <tr key={b.id}>
                  <td className="py-1 pr-2 text-ink/70">{b.text}</td>
                  {d.options.map((o) => (
                    <td key={o.id} className="px-2 py-1">
                      <DealbreakerToggle d={d} update={update} optionId={o.id} dealbreakerId={b.id} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card overflow-x-auto">
        {d.criteria.length === 0 ? (
          <p className="text-ink/60">No criteria yet. Add one below or pick a suggestion.</p>
        ) : (
          <table className="w-full min-w-[480px] border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                <th colSpan={2} />
                <th
                  colSpan={d.options.length}
                  className="rounded-t-lg border-l-2 border-ink/10 bg-grape-soft/60 px-2 pt-1.5 font-semibold text-grape"
                >
                  Rate each option <span className="normal-case font-normal">(1 = awful · 5 = great)</span>
                </th>
                <th />
              </tr>
              <tr className="text-left text-xs uppercase tracking-wide text-ink/50">
                <th className="pr-2 font-semibold">Criterion</th>
                <th className="px-2 font-semibold">How much it matters</th>
                {d.options.map((o, i) => (
                  <th
                    key={o.id}
                    className={`bg-grape-soft/60 px-2 pb-1.5 ${i === 0 ? "border-l-2 border-ink/10" : ""}`}
                  >
                    <span className="chip gap-1.5 bg-white text-xs normal-case text-ink"><OptionImage o={o} size="dot" />{o.label}</span>
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {d.criteria.map((c) => (
                <tr key={c.id} className="align-middle">
                  <td className="pr-2">
                    <input
                      className="input py-1"
                      value={c.label}
                      maxLength={60}
                      placeholder="e.g. Cost"
                      aria-label="Criterion name"
                      autoFocus={!c.label}
                      onChange={(e) => setCrit(c.id, { label: e.target.value })}
                    />
                  </td>
                  <td className="px-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="range" min={1} max={5} value={c.weight}
                        aria-label={`Importance of ${c.label || "criterion"}`}
                        className="w-24 accent-grape"
                        onChange={(e) => setCrit(c.id, { weight: Number(e.target.value) })}
                      />
                      <span className="w-4 font-mono">{c.weight}</span>
                    </div>
                  </td>
                  {d.options.map((o) => {
                    const s = scoreFor(d, o.id, c.id);
                    return (
                      <td key={o.id} className="px-2">
                        <select
                          value={s}
                          aria-label={`${o.label} on ${c.label || "criterion"}`}
                          className="input py-1"
                          onChange={(e) => setScore(o.id, c.id, Number(e.target.value))}
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n} · {SCORE_HINT[n]}</option>
                          ))}
                        </select>
                      </td>
                    );
                  })}
                  <td>
                    <button className="btn-ghost" aria-label="Remove criterion" onClick={() => removeCrit(c.id)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className="btn-secondary py-1 text-sm" onClick={() => addCrit()}>+ Add criterion</button>
          {SUGGESTIONS.filter((s) => !used.has(s.toLowerCase())).map((s) => (
            <button key={s} className="chip border-ink/30 bg-white text-xs font-medium hover:bg-sun" onClick={() => addCrit(s)}>
              + {s}
            </button>
          ))}
        </div>
      </div>

      {d.criteria.some((c) => c.label.trim()) && (
        <div className="card space-y-3">
          <h3 className="font-display font-bold">How the options stack up</h3>
          {rows.map((r) => {
            const o = d.options.find((x) => x.id === r.optionId)!;
            return (
              <div key={r.optionId}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className={`font-semibold ${r.ruledOut ? "text-ink/40 line-through" : ""}`}>{o.label}</span>
                  <span className="font-mono">{r.percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-sm bg-ink/10">
                  <div
                    className={`h-full transition-all ${r.ruledOut ? "bg-ink/20" : "bg-grape"}`}
                    style={{ width: `${r.percent}%` }}
                  />
                </div>
                {r.ruledOut && (
                  <p className="mt-1 text-xs font-semibold text-coral">
                    🚫 Ruled out by dealbreaker: {r.ruledOutBy.join(", ")}
                  </p>
                )}
              </div>
            );
          })}
          <p className="text-xs text-ink/50">
            % of the best possible score, given your weights. These are your own ratings, not facts.
          </p>
        </div>
      )}
    </div>
  );
}
