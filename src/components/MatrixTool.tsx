"use client";

import { useEffect, useRef, useState } from "react";
import { isRuledOut, MATRIX_PRESETS, matrixLeader, matrixName, matrixStanding, quadrantOf, type MatrixPreset } from "@/lib/analysis";
import { uid } from "@/lib/storage";
import type { Dilemma, Matrix } from "@/lib/types";

type Props = { d: Dilemma; update: (p: Partial<Dilemma>) => void };
type Pos = { x: number; y: number };

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const CHIP_COLORS = ["bg-grape", "bg-mint", "bg-coral", "bg-amber-500", "bg-sky-500", "bg-pink-500"];

function fromPreset(p: Pick<MatrixPreset, "x" | "y" | "q">): Matrix {
  return { id: uid(), x: [...p.x] as [string, string], y: [...p.y] as [string, string], q: { ...p.q }, pos: {} };
}

/** Text you can click to rename. Saves on Enter or blur; Escape cancels. */
function Editable({
  value, onSave, label, className = "",
}: { value: string; onSave: (v: string) => void; label: string; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing) {
    const save = () => {
      onSave(draft.trim() || value);
      setEditing(false);
    };
    return (
      <input
        autoFocus
        aria-label={label}
        maxLength={30}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-28 rounded border border-grape bg-white px-1 py-0.5 text-[11px] font-medium text-ink outline-none"
      />
    );
  }
  return (
    <button
      type="button"
      title="Click to rename"
      aria-label={`${label}: ${value}. Click to rename.`}
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={`rounded px-0.5 decoration-dotted underline-offset-2 hover:bg-ink/5 hover:underline ${className}`}
    >
      {value}
    </button>
  );
}

function PresetPicker({ onPick, onCancel }: { onPick: (p: MatrixPreset) => void; onCancel?: () => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Compare your options on…</p>
        {onCancel && <button className="btn-ghost text-xs" onClick={onCancel}>Cancel</button>}
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        {MATRIX_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => onPick(p)}
            className="rounded-md border border-ink/15 bg-white p-3 text-left transition hover:border-grape hover:bg-grape-soft/40"
          >
            <span className="block font-medium">{p.id === "blank" ? "Your own axes" : p.name}</span>
            <span className="text-xs text-ink/50">
              {p.id === "blank" ? "Name everything yourself" : `${p.x[1]} · ${p.y[1]}`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** 2×2 plots: drag each option onto two axes; make several to compare different variables. */
export function MatrixTool({ d, update }: Props) {
  const board = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(d.matrices[0]?.id ?? null);
  const [picking, setPicking] = useState(false);
  const [drag, setDrag] = useState<{ id: string; pos: Pos } | null>(null);

  const m = d.matrices.find((x) => x.id === activeId) ?? d.matrices[0];

  // Latest matrices, updated synchronously, so fast arrow-key presses build on each other.
  const latest = useRef(d.matrices);
  useEffect(() => {
    latest.current = d.matrices;
  }, [d.matrices]);

  const saveMatrices = (list: Matrix[]) => {
    latest.current = list;
    update({ matrices: list });
  };
  const patchActive = (p: Partial<Matrix>) =>
    saveMatrices(latest.current.map((x) => (x.id === m.id ? { ...x, ...p } : x)));
  const setPos = (id: string, pos: Pos) => {
    const cur = latest.current.find((x) => x.id === m.id)!;
    patchActive({ pos: { ...cur.pos, [id]: { x: clamp(pos.x), y: clamp(pos.y) } } });
  };
  const addMatrix = (p: Pick<MatrixPreset, "x" | "y" | "q">) => {
    const n = fromPreset(p);
    saveMatrices([...latest.current, n]);
    setActiveId(n.id);
    setPicking(false);
  };

  const toPos = (clientX: number, clientY: number): Pos => {
    const r = board.current!.getBoundingClientRect();
    return { x: clamp((clientX - r.left) / r.width), y: clamp(1 - (clientY - r.top) / r.height) };
  };

  // Track the pointer on the window, so a chip can be dragged from the tray onto the board.
  useEffect(() => {
    if (!drag || !m) return;
    const move = (e: PointerEvent) => setDrag((cur) => (cur ? { ...cur, pos: toPos(e.clientX, e.clientY) } : cur));
    const up = (e: PointerEvent) => {
      const r = board.current!.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (inside || m.pos[drag.id]) setPos(drag.id, toPos(e.clientX, e.clientY));
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id]);

  if (!m) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-ink/60">
          Place your options on a 2×2 grid to see how they stack up on two variables. You can make several grids to
          compare different pairs.
        </p>
        <div className="card">
          <PresetPicker onPick={addMatrix} />
        </div>
      </div>
    );
  }

  const placed = d.options.filter((o) => m.pos[o.id]);
  const unplaced = d.options.filter((o) => !m.pos[o.id]);
  const colorOf = (id: string) => CHIP_COLORS[d.options.findIndex((o) => o.id === id) % CHIP_COLORS.length];

  const startDrag = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    setDrag({ id, pos: m.pos[id] ?? toPos(e.clientX, e.clientY) });
  };
  const onKey = (id: string) => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.04;
    const cur = latest.current.find((x) => x.id === m.id)?.pos[id] ?? { x: 0.5, y: 0.5 };
    const delta: Record<string, Pos> = {
      ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: step }, ArrowDown: { x: 0, y: -step },
    };
    if (!delta[e.key]) return;
    e.preventDefault();
    setPos(id, { x: cur.x + delta[e.key].x, y: cur.y + delta[e.key].y });
  };

  // A render function (not a component) so the same <button> survives re-renders and keeps keyboard focus.
  const chip = (id: string, pos?: Pos, floating?: boolean) => {
    const o = d.options.find((x) => x.id === id)!;
    const out = isRuledOut(d, id);
    return (
      <button
        key={floating ? `drag-${id}` : id}
        onPointerDown={startDrag(id)}
        onKeyDown={onKey(id)}
        aria-label={`${o.label}. ${pos ? quadrantOf(m, pos) : "Not placed"}. Drag, or use arrow keys to move.`}
        className={`flex touch-none items-center gap-1.5 whitespace-nowrap rounded-md border border-ink/15 bg-white px-2.5 py-1 text-sm font-medium shadow-sm select-none ${
          floating ? "cursor-grabbing ring-2 ring-grape/30" : "cursor-grab hover:border-ink/40"
        } ${out ? "text-ink/40 line-through" : ""}`}
        style={pos ? { position: "absolute", left: `${pos.x * 100}%`, top: `${(1 - pos.y) * 100}%`, transform: "translate(-50%, -50%)", zIndex: floating ? 20 : 10 } : undefined}
      >
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorOf(id)}`} />
        {o.label}
      </button>
    );
  };

  const best = matrixLeader(d);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/60">
        Drag each option onto the grid. Top-right is the best corner. Click any label to rename it, or add another grid
        to compare different variables.
      </p>

      {/* grid tabs */}
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="2×2 grids">
        {d.matrices.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === m.id}
            onClick={() => {
              setActiveId(x.id);
              setPicking(false);
            }}
            className={`chip text-xs ${x.id === m.id ? "border-grape bg-grape-soft text-grape" : "bg-white hover:bg-ink/[0.03]"}`}
          >
            {matrixName(x)}
          </button>
        ))}
        <button className="btn-ghost text-xs" onClick={() => setPicking((v) => !v)}>+ New 2×2</button>
      </div>

      {picking && (
        <div className="card">
          <PresetPicker onPick={addMatrix} onCancel={() => setPicking(false)} />
        </div>
      )}

      <div className="card">
        {unplaced.length > 0 && (
          <div className="mb-4 border-b border-ink/10 pb-3">
            <p className="mb-2 text-xs text-ink/50">Drag onto the grid:</p>
            <div className="flex flex-wrap gap-2">
              {unplaced.map((o) => (drag?.id === o.id ? null : chip(o.id)))}
            </div>
          </div>
        )}

        <div className="mx-auto grid max-w-md grid-cols-[auto_1fr] gap-2 select-none">
          {/* y axis */}
          <div className="flex flex-col items-center justify-between py-1 text-[11px] font-medium text-ink/50">
            <span className="[writing-mode:vertical-rl] rotate-180">
              <Editable value={m.y[1]} label="Top of vertical axis" onSave={(v) => patchActive({ y: [m.y[0], v] })} /> ↑
            </span>
            <span className="[writing-mode:vertical-rl] rotate-180">
              <Editable value={m.y[0]} label="Bottom of vertical axis" onSave={(v) => patchActive({ y: [v, m.y[1]] })} />
            </span>
          </div>
          <div>
            <div ref={board} className="relative grid aspect-square grid-cols-2 grid-rows-2 overflow-visible rounded-md border border-ink/15">
              {([
                ["tl", "border-r border-b"],
                ["tr", "border-b bg-mint-soft/50"],
                ["bl", "border-r bg-coral-soft/30"],
                ["br", ""],
              ] as const).map(([k, cls]) => (
                <div key={k} className={`border-ink/10 p-2 ${cls}`}>
                  <span className={`text-xs font-semibold ${k === "tr" ? "text-mint" : "text-ink/35"}`}>
                    <Editable
                      value={m.q[k]}
                      label={`${{ tr: "Top-right", tl: "Top-left", br: "Bottom-right", bl: "Bottom-left" }[k]} quadrant`}
                      onSave={(v) => patchActive({ q: { ...m.q, [k]: v } })}
                    />
                    {k === "tr" && " ★"}
                  </span>
                </div>
              ))}
              {placed.map((o) => (drag?.id === o.id ? null : chip(o.id, m.pos[o.id])))}
              {drag && chip(drag.id, drag.pos, true)}
            </div>
            <div className="mt-1 flex justify-between text-[11px] font-medium text-ink/50">
              <Editable value={m.x[0]} label="Left of horizontal axis" onSave={(v) => patchActive({ x: [v, m.x[1]] })} />
              <span>
                <Editable value={m.x[1]} label="Right of horizontal axis" onSave={(v) => patchActive({ x: [m.x[0], v] })} /> →
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-1 border-t border-ink/10 pt-3">
          <button
            className="btn-ghost text-xs"
            title="New grid with the same labels, so you can try another framing"
            onClick={() => addMatrix({ x: m.x, y: m.y, q: m.q })}
          >
            Duplicate labels
          </button>
          <button
            className="btn-ghost text-xs hover:text-coral"
            onClick={() => {
              if (placed.length && !confirm("Delete this grid and its placements?")) return;
              const rest = latest.current.filter((x) => x.id !== m.id);
              saveMatrices(rest);
              setActiveId(rest[0]?.id ?? null);
            }}
          >
            Delete grid
          </button>
        </div>
      </div>

      {d.matrices.length > 1 ? (
        <div className="card overflow-x-auto">
          <h3 className="mb-2 font-display font-bold">Across all your grids</h3>
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-xs text-ink/50">
                <th className="pb-2 font-medium">Option</th>
                {d.matrices.map((x) => (
                  <th key={x.id} className="px-2 pb-2 font-medium">{matrixName(x)}</th>
                ))}
                <th className="pb-2 text-right font-medium" title="Average closeness to the best corner">Overall</th>
              </tr>
            </thead>
            <tbody>
              {d.options.map((o) => {
                const st = matrixStanding(d, o.id);
                return (
                  <tr key={o.id} className={`border-t border-ink/5 ${best === o.id ? "bg-grape-soft/40" : ""}`}>
                    <td className={`py-1.5 pr-2 font-medium ${isRuledOut(d, o.id) ? "text-ink/40 line-through" : ""}`}>
                      <span className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${colorOf(o.id)}`} />
                        {o.label}
                      </span>
                    </td>
                    {d.matrices.map((x) => (
                      <td key={x.id} className={`px-2 py-1.5 ${x.pos[o.id] && x.pos[o.id].x >= 0.5 && x.pos[o.id].y >= 0.5 ? "font-medium text-mint" : "text-ink/60"}`}>
                        {x.pos[o.id] ? quadrantOf(x, x.pos[o.id]) : <span className="text-ink/30">not placed</span>}
                      </td>
                    ))}
                    <td className="py-1.5 text-right font-mono text-xs">
                      {st === null ? "—" : `${Math.round(st * 100)}%`}
                      {best === o.id && <span className="ml-1 text-grape">★</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-ink/50">Overall = how close each option sits to the top-right corner, averaged across grids.</p>
        </div>
      ) : (
        placed.length > 0 && (
          <div className="card space-y-2">
            <h3 className="font-display font-bold">Where things landed</h3>
            <ul className="space-y-1 text-sm">
              {[...placed]
                .sort((a, b) => m.pos[b.id].x + m.pos[b.id].y - (m.pos[a.id].x + m.pos[a.id].y))
                .map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2">
                    <span className={`flex items-center gap-2 ${isRuledOut(d, o.id) ? "text-ink/40 line-through" : ""}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${colorOf(o.id)}`} />
                      {o.label}
                    </span>
                    <span className="text-ink/60">{quadrantOf(m, m.pos[o.id])}</span>
                  </li>
                ))}
            </ul>
            <p className="text-xs text-ink/50">Want another angle? Add a second grid with <strong>+ New 2×2</strong>.</p>
          </div>
        )
      )}
    </div>
  );
}
