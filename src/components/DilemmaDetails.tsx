"use client";

import { useState } from "react";
import { uid } from "@/lib/storage";
import type { Dilemma } from "@/lib/types";
import { parseOptionText, safeUrl } from "@/lib/links";
import { brokenBy } from "@/lib/analysis";
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
      className="flex w-full items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        className="input py-1 text-sm"
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

/** A roomy card for one option: name, link, and dealbreaker status at a glance. */
function OptionCard({ d, update, optionId, onRemove }: Props & { optionId: string; onRemove: () => void }) {
  const o = d.options.find((x) => x.id === optionId)!;
  const [editingLink, setEditingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState(o.url ?? "");
  const [linkError, setLinkError] = useState(false);
  const broken = brokenBy(d, o.id);

  const saveLink = () => {
    const v = linkDraft.trim();
    const url = v ? safeUrl(v) : null;
    if (v && !url) return setLinkError(true);
    update({ options: d.options.map((x) => (x.id === o.id ? (url ? { ...x, url } : { id: x.id, label: x.label }) : x)) });
    setEditingLink(false);
    setLinkError(false);
  };

  return (
    <li
      className={`group relative flex min-h-28 flex-col justify-between gap-3 rounded-lg border bg-white p-4 transition ${
        broken.length ? "border-coral/40" : "border-ink/10 hover:border-ink/25"
      }`}
    >
      <button
        className="absolute top-2 right-2 rounded px-1.5 text-ink/30 hover:bg-ink/5 hover:text-ink"
        aria-label={`Remove option ${o.label}`}
        onClick={onRemove}
      >
        ✕
      </button>
      <p className={`pr-6 font-display text-lg font-semibold leading-snug ${broken.length ? "text-ink/40 line-through" : ""}`}>
        {o.label}
      </p>

      <div className="space-y-1.5">
        {editingLink ? (
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              saveLink();
            }}
          >
            <input
              autoFocus
              className={`input py-1 text-xs ${linkError ? "border-coral" : ""}`}
              placeholder="https://…"
              maxLength={500}
              value={linkDraft}
              onChange={(e) => {
                setLinkDraft(e.target.value);
                setLinkError(false);
              }}
              onKeyDown={(e) => e.key === "Escape" && setEditingLink(false)}
              aria-label={`Link for ${o.label}`}
            />
            <button type="submit" className="btn-ghost text-xs">Save</button>
          </form>
        ) : o.url ? (
          <div className="flex items-center gap-2">
            <OptionLink url={o.url} />
            <button className="text-xs text-ink/40 hover:text-ink" onClick={() => setEditingLink(true)}>Edit</button>
          </div>
        ) : (
          <button className="text-xs font-medium text-ink/40 hover:text-grape" onClick={() => setEditingLink(true)}>
            🔗 Add link
          </button>
        )}
        {linkError && <p className="text-xs text-coral">That doesn&apos;t look like a web link (http or https).</p>}
        {broken.length > 0 && (
          <p className="text-xs font-medium text-coral">🚫 Breaks: {broken.join(", ")}</p>
        )}
      </div>
    </li>
  );
}

export function DilemmaDetails({ d, update }: Props) {
  const hasData = (optionId: string) =>
    d.factors.some((f) => f.optionId === optionId && f.text.trim()) || !!d.scores[optionId] || !!d.fails[optionId];

  return (
    <div className="card space-y-5 p-4">
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">Options</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {d.options.map((o) => (
            <OptionCard
              key={o.id}
              d={d}
              update={update}
              optionId={o.id}
              onRemove={() => {
                if (!hasData(o.id) || confirm(`Remove “${o.label}”? Its pros, cons, and ratings will be deleted.`)) {
                  update(removeOption(d, o.id));
                }
              }}
            />
          ))}
          {d.options.length < 6 && (
            <li className="flex min-h-28 flex-col justify-center gap-2 rounded-lg border border-dashed border-ink/20 p-4">
              <span className="text-sm text-ink/50">
                {d.options.length === 0 ? "No options yet. You're gathering opinions." : d.options.length === 1 ? "Add one more to compare." : "Another option?"}
              </span>
              <AddInline
                placeholder="Add an option or paste a link"
                max={600}
                onAdd={(v) => {
                  const p = addOption(d, v);
                  if (p) update(p);
                  return !!p;
                }}
              />
            </li>
          )}
        </ul>
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
            <div className="w-full max-w-xs">
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
            </div>
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
