"use client";

import { expectedValue, FEELINGS, feelingFor, isRuledOut, treeLeader } from "@/lib/analysis";
import { uid } from "@/lib/storage";
import type { Dilemma, Outcome } from "@/lib/types";

type Props = { d: Dilemma; update: (p: Partial<Dilemma>) => void };

const STARTER: Omit<Outcome, "id">[] = [
  { text: "It goes great", chance: 30, value: 2 },
  { text: "It's fine", chance: 50, value: 0 },
  { text: "It goes badly", chance: 20, value: -2 },
];

const fmt = (ev: number) => `${ev > 0 ? "+" : ""}${ev.toFixed(1)}`;

/** Decision tree: question → options → possible outcomes (chance × how you'd feel). */
export function TreeTool({ d, update }: Props) {
  const best = treeLeader(d);
  const outcomesOf = (optionId: string) => d.tree[optionId] ?? [];
  const setOutcomes = (optionId: string, list: Outcome[]) => update({ tree: { ...d.tree, [optionId]: list } });
  const patch = (optionId: string, id: string, p: Partial<Outcome>) =>
    setOutcomes(optionId, outcomesOf(optionId).map((o) => (o.id === id ? { ...o, ...p } : o)));

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/60">
        For each option, list what could realistically happen, how likely it is, and how you&apos;d feel about it.
        The tree weighs each outcome by its chance to give you an <em>expected outcome</em>.
      </p>

      <div className="card overflow-x-auto">
        <div className="flex min-w-[720px] items-stretch">
          {/* root */}
          <div className="flex w-40 shrink-0 items-center">
            <div className="w-full rounded-md bg-ink px-3 py-2 text-sm font-semibold text-paper">{d.question}</div>
          </div>

          <ul className="flex-1 space-y-4 border-l-2 border-ink/15 py-2">
            {d.options.map((o) => {
              const list = outcomesOf(o.id);
              const named = list.filter((x) => x.text.trim());
              const ev = expectedValue(named);
              const sum = named.reduce((s, x) => s + x.chance, 0);
              const out = isRuledOut(d, o.id);
              return (
                <li key={o.id} className="relative flex items-center pl-6 before:absolute before:top-1/2 before:left-0 before:w-6 before:border-t-2 before:border-ink/15">
                  {/* option node */}
                  <div
                    className={`w-44 shrink-0 rounded-md border px-3 py-2 ${
                      best === o.id ? "border-grape bg-grape-soft" : out ? "border-coral/40 bg-white" : "border-ink/15 bg-white"
                    }`}
                  >
                    <p className={`font-display font-semibold leading-snug ${out ? "text-ink/40 line-through" : ""}`}>{o.label}</p>
                    {ev !== null ? (
                      <p className="mt-1 text-xs text-ink/60">
                        Expected: {feelingFor(ev).emoji} {feelingFor(ev).label}{" "}
                        <span className="font-mono">({fmt(ev)})</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-ink/40">Add outcomes →</p>
                    )}
                    {best === o.id && <p className="mt-1 text-[11px] font-semibold text-grape">★ Best expected outcome</p>}
                    {named.length > 0 && sum !== 100 && (
                      <p className="mt-1 text-[11px] text-ink/40">Chances add to {sum}%; scaled to 100%.</p>
                    )}
                  </div>

                  {/* outcomes */}
                  <div className="relative ml-6 flex-1 before:absolute before:top-1/2 before:-left-6 before:w-6 before:border-t-2 before:border-ink/15">
                    <ul className="space-y-1.5 border-l-2 border-ink/15 py-1">
                      {list.map((x) => (
                        <li key={x.id} className="relative flex items-center gap-2 pl-4 before:absolute before:top-1/2 before:left-0 before:w-4 before:border-t-2 before:border-ink/15">
                          <input
                            className="input w-40 py-1 text-sm"
                            value={x.text}
                            maxLength={80}
                            placeholder="What could happen?"
                            aria-label={`Outcome for ${o.label}`}
                            autoFocus={!x.text}
                            onChange={(e) => patch(o.id, x.id, { text: e.target.value })}
                          />
                          <label className="flex items-center gap-1 text-xs text-ink/60" title="How likely is this?">
                            <input
                              type="range" min={0} max={100} step={5} value={x.chance}
                              className="w-16 accent-grape"
                              aria-label={`Chance of “${x.text || "outcome"}”`}
                              onChange={(e) => patch(o.id, x.id, { chance: Number(e.target.value) })}
                            />
                            <span className="w-8 font-mono">{x.chance}%</span>
                          </label>
                          <div className="flex rounded-md border border-ink/15" role="radiogroup" aria-label={`How you'd feel about “${x.text || "outcome"}”`}>
                            {FEELINGS.map((f) => (
                              <button
                                key={f.value}
                                role="radio"
                                aria-checked={x.value === f.value}
                                title={f.label}
                                aria-label={f.label}
                                onClick={() => patch(o.id, x.id, { value: f.value })}
                                className={`px-1 py-0.5 text-sm transition first:rounded-l-md last:rounded-r-md ${
                                  x.value === f.value ? "bg-grape-soft" : "opacity-40 grayscale hover:opacity-100 hover:grayscale-0"
                                }`}
                              >
                                {f.emoji}
                              </button>
                            ))}
                          </div>
                          <button
                            className="btn-ghost px-1"
                            aria-label="Remove outcome"
                            onClick={() => setOutcomes(o.id, list.filter((y) => y.id !== x.id))}
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                      <li className="relative flex gap-2 pl-4 before:absolute before:top-1/2 before:left-0 before:w-4 before:border-t-2 before:border-dashed before:border-ink/15">
                        <button
                          className="btn-ghost text-xs"
                          onClick={() => setOutcomes(o.id, [...list, { id: uid(), text: "", chance: 25, value: 0 }])}
                        >
                          + Add outcome
                        </button>
                        {list.length === 0 && (
                          <button
                            className="btn-ghost text-xs"
                            onClick={() => setOutcomes(o.id, STARTER.map((s) => ({ ...s, id: uid() })))}
                          >
                            Start with best / likely / worst
                          </button>
                        )}
                      </li>
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <p className="text-xs text-ink/50">
        Expected outcome runs from 😫 −2 (awful) to 🤩 +2 (great). Your chances are guesses, and that&apos;s fine. The point
        is to notice which risks you&apos;re actually worried about.
      </p>
    </div>
  );
}
