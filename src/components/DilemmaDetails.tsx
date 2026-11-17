"use client";

import { useState } from "react";
import { uid } from "@/lib/storage";
import type { Dilemma } from "@/lib/types";
import { parseOptionText, safeUrl } from "@/lib/links";
import { OptionLink } from "./OptionLink";

type Props = { d: Dilemma; update: (p: Partial<Dilemma>) => void };

/** Removes an option and everything attached to it, so no tool keeps stale data. */
export function removeOption(d: Dilemma, optionId: string): Partial<Dilemma> {
  const { [optionId]: _s, ...scores } = d.scores;
  const { [optionId]: _f, ...fails } = d.fails;
  void _s;
  void _f;
  return {
    options: d.options.filter((o) => o.id !== optionId),
    factors: d.factors.filter((f) => f.optionId !== optionId),
    scores,
    fails,
    outcome: d.outcome?.optionId === optionId ? undefined : d.outcome,
  };
}

/** Adds an option from free text; a pasted link becomes the option's link. */
export function addOption(d: Dilemma, text: string): Partial<Dilemma> | null {
  const { label: l, url } = parseOptionText(text);
  if (!l || d.options.length >= 6 || d.options.some((o) => o.label.toLowerCase() === l.toLowerCase())) return null;
  return { options: [...d.options, url ? { id: uid(), label: l, url } : { id: uid(), label: l }] };
}

function AddInline({ placeholder, onAdd, max }: { placeholder: string; onAdd: (v: string) => boolean; max: number }) {
  const [v, setV] = useState("");
  const submit = () => {
    if (onAdd(v)) setV("");
  };
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        className="input w-56 py-1 text-sm"
        placeholder={placeholder}
        maxLength={max}
        value={v}
        onChange={(e) => setV(e.target.value)}
        aria-label={placeholder}
      />
      <button type="submit" className="btn-ghost" disabled={!v.trim()}>Add</button>
    </form>
  );
}

export function DilemmaDetails({ d, update }: Props) {
  const hasData = (optionId: string) =>
    d.factors.some((f) => f.optionId === optionId && f.text.trim()) || !!d.scores[optionId] || !!d.fails[optionId];

  return (
    <div className="card grid gap-5 p-4 sm:grid-cols-2">
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">Options</h2>
        <div className="flex flex-wrap items-center gap-2">
          {d.options.map((o) => (
            <span key={o.id} className="chip gap-1.5 bg-white pr-1">
              {o.label}
              <OptionLink url={o.url} label={false} />
              <button
                className="rounded px-1 text-xs text-ink/40 hover:bg-ink/5 hover:text-ink"
                title={o.url ? "Change link" : "Add a link (listing, menu, website…)"}
                aria-label={o.url ? `Change link for ${o.label}` : `Add a link to ${o.label}`}
                onClick={() => {
                  const v = prompt(`Link for “${o.label}” (leave empty to remove):`, o.url ?? "");
                  if (v === null) return;
                  const url = v.trim() ? safeUrl(v) : null;
                  if (v.trim() && !url) return alert("That doesn't look like a web link (http or https).");
                  update({ options: d.options.map((x) => (x.id === o.id ? (url ? { ...x, url } : { id: x.id, label: x.label }) : x)) });
                }}
              >
                🔗
              </button>
              <button
                className="rounded px-1 text-ink/40 hover:bg-ink/5 hover:text-ink"
                aria-label={`Remove option ${o.label}`}
                onClick={() => {
                  if (!hasData(o.id) || confirm(`Remove “${o.label}”? Its pros, cons, and ratings will be deleted.`)) {
                    update(removeOption(d, o.id));
                  }
                }}
              >
                ✕
              </button>
            </span>
          ))}
          {d.options.length === 0 && <span className="text-sm text-ink/50">None yet. You&apos;re gathering opinions.</span>}
          {d.options.length < 6 && (
            <AddInline
              placeholder="Add an option or paste a link"
              max={600}
              onAdd={(v) => {
                const p = addOption(d, v);
                if (p) update(p);
                return !!p;
              }}
            />
          )}
        </div>
        {d.options.length === 1 && (
          <p className="mt-2 text-xs text-coral">Add one more option to compare.</p>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">Dealbreakers</h2>
        <div className="flex flex-wrap items-center gap-2">
          {d.dealbreakers.map((b) => (
            <span key={b.id} className="chip gap-1 border-coral/30 bg-coral-soft/50 pr-1">
              🚫 {b.text}
              <button
                className="rounded px-1 text-ink/40 hover:bg-ink/5 hover:text-ink"
                aria-label={`Remove dealbreaker ${b.text}`}
                onClick={() => {
                  const fails = Object.fromEntries(
                    Object.entries(d.fails).map(([oid, m]) => {
                      const { [b.id]: _x, ...rest } = m;
                      void _x;
                      return [oid, rest];
                    }),
                  );
                  update({ dealbreakers: d.dealbreakers.filter((x) => x.id !== b.id), fails });
                }}
              >
                ✕
              </button>
            </span>
          ))}
          {d.dealbreakers.length === 0 && <span className="text-sm text-ink/50">None.</span>}
          {d.dealbreakers.length < 6 && (
            <AddInline
              placeholder="Add a dealbreaker"
              max={100}
              onAdd={(v) => {
                const t = v.trim();
                if (!t || d.dealbreakers.some((b) => b.text.toLowerCase() === t.toLowerCase())) return false;
                update({ dealbreakers: [...d.dealbreakers, { id: uid(), text: t }] });
                return true;
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** One option's pass/fail against one dealbreaker. The same data shows up in every tool. */
export function DealbreakerToggle({
  d, update, optionId, dealbreakerId,
}: Props & { optionId: string; dealbreakerId: string }) {
  const failed = !!d.fails[optionId]?.[dealbreakerId];
  const b = d.dealbreakers.find((x) => x.id === dealbreakerId);
  const o = d.options.find((x) => x.id === optionId);
  return (
    <button
      aria-pressed={failed}
      aria-label={`${o?.label} ${failed ? "breaks" : "is OK with"} “${b?.text}”. Click to toggle.`}
      className={`rounded-md border px-2 py-0.5 text-xs font-medium transition ${
        failed ? "border-coral/40 bg-coral-soft text-coral" : "border-ink/15 bg-white text-ink/60 hover:border-ink/30"
      }`}
      onClick={() =>
        update({ fails: { ...d.fails, [optionId]: { ...d.fails[optionId], [dealbreakerId]: !failed } } })
      }
    >
      {failed ? "✗ Breaks it" : "✓ OK"}
    </button>
  );
}
