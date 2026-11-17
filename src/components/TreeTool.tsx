"use client";

import { useState } from "react";
import { FEELINGS, feelingFor, isRuledOut, treeLeader } from "@/lib/analysis";
import { uid } from "@/lib/storage";
import { addChild, chanceSum, countNodes, insertAfter, mapNode, removeNode, scoreOf, scoreOfBranches } from "@/lib/tree";
import type { Dilemma, TreeNode } from "@/lib/types";
import { OptionImage } from "./OptionImage";

type Props = { d: Dilemma; update: (p: Partial<Dilemma>) => void };

const fmt = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`;
const blank = (p: Partial<TreeNode> = {}): TreeNode => ({ id: uid(), text: "", children: [], ...p });

const BREAK_DOWN = () => ["Cost", "Time", "How I'd feel"].map((text) => blank({ text }));
const WHAT_IF = () => [
  blank({ text: "Best case", chance: 30, value: 2 }),
  blank({ text: "Most likely", chance: 50, value: 0 }),
  blank({ text: "Worst case", chance: 20, value: -2 }),
];

type Ctx = {
  setList: (fn: (list: TreeNode[]) => TreeNode[]) => void;
  focusId: string | null;
  setFocusId: (id: string | null) => void;
  optionLabel: string;
};

function Score({ v, approx }: { v: number; approx?: boolean }) {
  const f = feelingFor(v);
  return (
    <span className="shrink-0 rounded bg-ink/[0.04] px-1.5 py-0.5 text-xs text-ink/70" title={`${f.label} (${fmt(v)})`}>
      {approx && "≈ "}
      {f.emoji} <span className="font-mono">{fmt(v)}</span>
    </span>
  );
}

function FeelingPicker({ value, onPick, label }: { value: number; onPick: (v: number | null) => void; label: string }) {
  return (
    <span className="flex shrink-0 items-center rounded-md border border-ink/15" role="radiogroup" aria-label={label}>
      {FEELINGS.map((f) => (
        <button
          key={f.value}
          role="radio"
          aria-checked={value === f.value}
          aria-label={f.label}
          title={f.label}
          onClick={() => onPick(f.value)}
          className={`px-1 py-0.5 text-sm first:rounded-l-md ${value === f.value ? "bg-grape-soft" : "opacity-40 grayscale hover:opacity-100 hover:grayscale-0"}`}
        >
          {f.emoji}
        </button>
      ))}
      <button className="px-1 text-xs text-ink/30 hover:text-ink" aria-label="Remove feeling" title="Remove feeling" onClick={() => onPick(null)}>
        ✕
      </button>
    </span>
  );
}

/** Branches at one level, with a warning when "what if" chances don't add to 100%. */
function Branches({ list, ctx }: { list: TreeNode[]; ctx: Ctx }) {
  const sum = chanceSum(list);
  return (
    <ul className="space-y-1">
      {list.map((n) => (
        <Branch key={n.id} n={n} ctx={ctx} />
      ))}
      {sum !== null && sum !== 100 && (
        <li className="pl-6 text-[11px] text-ink/40">Chances here add to {sum}%, so they&apos;re scaled to 100%.</li>
      )}
    </ul>
  );
}

function Branch({ n, ctx }: { n: TreeNode; ctx: Ctx }) {
  const patch = (p: Partial<TreeNode>) => ctx.setList((l) => mapNode(l, n.id, (x) => ({ ...x, ...p })));
  const addSub = () => {
    const c = blank();
    ctx.setList((l) => addChild(l, n.id, c));
    ctx.setFocusId(c.id);
  };
  const rolled = n.children.length ? scoreOf(n) : null;
  const name = n.text || "branch";

  return (
    <li className="relative pl-6 before:absolute before:top-4 before:left-0 before:w-5 before:border-t-2 before:border-ink/15">
      <div className="group flex flex-wrap items-center gap-1.5 py-0.5">
        {n.children.length > 0 ? (
          <button
            className="w-4 shrink-0 text-xs text-ink/40 hover:text-ink"
            aria-label={n.collapsed ? `Expand ${name}` : `Collapse ${name}`}
            aria-expanded={!n.collapsed}
            onClick={() => patch({ collapsed: !n.collapsed })}
          >
            {n.collapsed ? "▸" : "▾"}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <input
          className="min-w-32 flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-sm outline-none hover:border-ink/15 focus:border-grape focus:bg-white sm:max-w-xs"
          value={n.text}
          maxLength={80}
          placeholder="Name this branch…"
          aria-label={`Branch under ${ctx.optionLabel}`}
          autoFocus={ctx.focusId === n.id}
          onFocus={() => ctx.focusId === n.id && ctx.setFocusId(null)}
          onChange={(e) => patch({ text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const s = blank();
              ctx.setList((l) => insertAfter(l, n.id, s));
              ctx.setFocusId(s.id);
            }
            if (e.key === "Backspace" && !n.text && !n.children.length) {
              e.preventDefault();
              ctx.setList((l) => removeNode(l, n.id));
            }
          }}
        />
        {n.collapsed && <span className="text-xs text-ink/40">({countNodes(n.children)} inside)</span>}
        {rolled !== null && <Score v={rolled} approx />}

        {n.chance != null && (
          <label className="flex shrink-0 items-center gap-0.5 rounded-md border border-ink/15 bg-white px-1.5 py-0.5 text-xs" title="How likely is this?">
            <input
              type="number" min={0} max={100} step={5}
              className="w-10 bg-transparent text-right font-mono outline-none"
              value={n.chance}
              aria-label={`Chance of ${name}`}
              onChange={(e) => patch({ chance: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
            />
            %
            <button className="ml-0.5 text-ink/30 hover:text-ink" aria-label="Remove chance" title="Remove chance" onClick={() => patch({ chance: null })}>✕</button>
          </label>
        )}
        {n.value != null && (
          <FeelingPicker value={n.value} label={`How you'd feel about ${name}`} onPick={(v) => patch({ value: v })} />
        )}

        <span className="flex shrink-0 items-center gap-0.5 opacity-60 transition group-focus-within:opacity-100 group-hover:opacity-100">
          <button className="btn-ghost px-1.5 py-0.5 text-xs" onClick={addSub} title="Add a branch inside this one">+ Branch</button>
          {n.chance == null && (
            <button className="btn-ghost px-1.5 py-0.5 text-xs" onClick={() => patch({ chance: 50, value: n.value ?? 0 })} title="Make this a what-if scenario with a chance">
              % What if
            </button>
          )}
          {n.value == null && (
            <button className="btn-ghost px-1.5 py-0.5 text-xs" onClick={() => patch({ value: 0 })} title="How would you feel about this?">
              😐 Feeling
            </button>
          )}
          {n.note == null && (
            <button className="btn-ghost px-1.5 py-0.5 text-xs" onClick={() => patch({ note: "" })} aria-label={`Add a note to ${name}`} title="Add a note">📝</button>
          )}
          <button
            className="btn-ghost px-1.5 py-0.5 text-xs hover:text-coral"
            aria-label={`Delete ${name}`}
            title="Delete branch"
            onClick={() => {
              if (n.children.length && !confirm(`Delete “${name}” and the ${countNodes(n.children)} branches inside it?`)) return;
              ctx.setList((l) => removeNode(l, n.id));
            }}
          >
            ✕
          </button>
        </span>
      </div>

      {n.note != null && (
        <div className="ml-6 flex items-start gap-1">
          <textarea
            rows={1}
            maxLength={280}
            autoFocus={!n.note}
            className="input mb-1 resize-y py-1 text-xs text-ink/70"
            placeholder="Note…"
            value={n.note}
            aria-label={`Note for ${name}`}
            onChange={(e) => patch({ note: e.target.value })}
          />
          <button className="btn-ghost px-1 text-xs" aria-label="Remove note" onClick={() => patch({ note: undefined })}>✕</button>
        </div>
      )}

      {n.children.length > 0 && !n.collapsed && (
        <div className="ml-2 border-l-2 border-ink/15">
          <Branches list={n.children} ctx={ctx} />
        </div>
      )}
    </li>
  );
}

/** Decision tree: question → options → branches, nested as deep as you like. */
export function TreeTool({ d, update }: Props) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const best = treeLeader(d);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/60">
        Break each option down and follow it where it leads, e.g. <em>Cost → Short term → Adoption fees</em>. Add a{" "}
        <strong>% What if</strong> to imagine scenarios, and a <strong>feeling</strong> to say how you&apos;d feel. Scores roll up
        the tree. Press Enter for the next branch.
      </p>

      <div className="card overflow-x-auto">
        <div className="mb-3 inline-block rounded-md bg-ink px-3 py-2 text-sm font-semibold text-paper">{d.question}</div>
        <ul className="ml-3 space-y-4 border-l-2 border-ink/15">
          {d.options.map((o) => {
            const list = d.tree[o.id] ?? [];
            const ctx: Ctx = {
              optionLabel: o.label,
              focusId,
              setFocusId,
              setList: (fn) => update({ tree: { ...d.tree, [o.id]: fn(d.tree[o.id] ?? []) } }),
            };
            const score = scoreOfBranches(list);
            const out = isRuledOut(d, o.id);
            const addTop = () => {
              const n = blank();
              ctx.setList((l) => [...l, n]);
              setFocusId(n.id);
            };
            return (
              <li key={o.id} className="relative pl-6 before:absolute before:top-5 before:left-0 before:w-5 before:border-t-2 before:border-ink/15">
                <div
                  className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 ${
                    best === o.id ? "border-grape bg-grape-soft/50" : out ? "border-coral/40 bg-white" : "border-ink/15 bg-white"
                  }`}
                >
                  <OptionImage o={o} size="thumb" className="h-8 w-8" />
                  <span className={`font-display font-semibold ${out ? "text-ink/40 line-through" : ""}`}>{o.label}</span>
                  {score !== null && <Score v={score} />}
                  {score !== null && (
                    <span className="text-xs text-ink/50">
                      {feelingFor(score).label} overall{best === o.id && <span className="ml-1 font-semibold text-grape">★ best so far</span>}
                    </span>
                  )}
                  <span className="ml-auto flex gap-1">
                    <button className="btn-ghost px-1.5 py-0.5 text-xs" onClick={addTop}>+ Branch</button>
                    {list.length === 0 && (
                      <>
                        <button className="btn-ghost px-1.5 py-0.5 text-xs" onClick={() => ctx.setList(() => BREAK_DOWN())} title="Start with Cost, Time, How I'd feel">
                          Break it down
                        </button>
                        <button className="btn-ghost px-1.5 py-0.5 text-xs" onClick={() => ctx.setList(() => WHAT_IF())} title="Start with best / likely / worst case">
                          What if…
                        </button>
                      </>
                    )}
                  </span>
                </div>
                {list.length > 0 && (
                  <div className="ml-4 border-l-2 border-ink/15">
                    <Branches list={list} ctx={ctx} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <p className="text-xs text-ink/50">
        Feelings run from 😫 −2 (awful) to 🤩 +2 (great). Scenarios are averaged by their chances; plain categories
        count equally. Your chances are guesses, and that&apos;s fine. The point is to notice what you&apos;re actually
        worried about.
      </p>
    </div>
  );
}
