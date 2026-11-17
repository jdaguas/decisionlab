"use client";

import { useEffect, useRef, useState } from "react";
import { isRuledOut, MATRIX_PRESETS, matrixPreset, quadrantOf } from "@/lib/analysis";
import type { Dilemma } from "@/lib/types";

type Props = { d: Dilemma; update: (p: Partial<Dilemma>) => void };
type Pos = { x: number; y: number };

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const CHIP_COLORS = ["bg-grape", "bg-mint", "bg-coral", "bg-amber-500", "bg-sky-500", "bg-pink-500"];

/** 2×2 plot: drag each option onto two axes; the quadrant names the result. */
export function MatrixTool({ d, update }: Props) {
  const board = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; pos: Pos } | null>(null);
  const preset = matrixPreset(d.matrix);
  const placed = d.options.filter((o) => d.matrix.pos[o.id]);
  const unplaced = d.options.filter((o) => !d.matrix.pos[o.id]);

  // Latest positions, updated synchronously, so fast or held-down arrow keys build on each other
  // instead of all starting from the same not-yet-re-rendered position.
  const latest = useRef(d.matrix.pos);
  useEffect(() => {
    latest.current = d.matrix.pos;
  }, [d.matrix.pos]);

  const setPos = (id: string, pos: Pos) => {
    latest.current = { ...latest.current, [id]: { x: clamp(pos.x), y: clamp(pos.y) } };
    update({ matrix: { ...d.matrix, pos: latest.current } });
  };

  const toPos = (clientX: number, clientY: number): Pos => {
    const r = board.current!.getBoundingClientRect();
    return { x: clamp((clientX - r.left) / r.width), y: clamp(1 - (clientY - r.top) / r.height) };
  };

  // Track the pointer on the window, so a chip can be dragged from the tray onto the board.
  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => setDrag((cur) => (cur ? { ...cur, pos: toPos(e.clientX, e.clientY) } : cur));
    const up = (e: PointerEvent) => {
      const r = board.current!.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (inside || d.matrix.pos[drag.id]) setPos(drag.id, toPos(e.clientX, e.clientY));
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

  const startDrag = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    window.getSelection()?.removeAllRanges();
    setDrag({ id, pos: d.matrix.pos[id] ?? toPos(e.clientX, e.clientY) });
  };

  const onKey = (id: string) => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 0.1 : 0.04;
    const cur = latest.current[id] ?? { x: 0.5, y: 0.5 };
    const delta: Record<string, Pos> = {
      ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: step }, ArrowDown: { x: 0, y: -step },
    };
    if (!delta[e.key]) return;
    e.preventDefault();
    setPos(id, { x: cur.x + delta[e.key].x, y: cur.y + delta[e.key].y });
  };

  const colorOf = (id: string) => CHIP_COLORS[d.options.findIndex((o) => o.id === id) % CHIP_COLORS.length];

  // A render function (not a component) so the same <button> survives re-renders and keeps keyboard focus.
  const chip = (id: string, pos?: Pos, floating?: boolean) => {
    const o = d.options.find((x) => x.id === id)!;
    const out = isRuledOut(d, id);
    return (
      <button
        key={floating ? `drag-${id}` : id}
        onPointerDown={startDrag(id)}
        onKeyDown={onKey(id)}
        aria-label={`${o.label}. ${pos ? quadrantOf(preset, pos) : "Not placed"}. Drag, or use arrow keys to move.`}
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/60">
        Drag each option onto the grid. Top-right is the best corner. It&apos;s a gut-check picture, not a score.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">Axes</span>
        {MATRIX_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => update({ matrix: { ...d.matrix, preset: p.id } })}
            className={`chip text-xs ${d.matrix.preset === p.id ? "border-grape bg-grape-soft text-grape" : "bg-white hover:bg-ink/[0.03]"}`}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => update({ matrix: { ...d.matrix, preset: "custom" } })}
          className={`chip text-xs ${d.matrix.preset === "custom" ? "border-grape bg-grape-soft text-grape" : "bg-white hover:bg-ink/[0.03]"}`}
        >
          Custom…
        </button>
        {d.matrix.preset === "custom" && (
          <span className="flex items-center gap-1 text-xs">
            <input
              className="input w-28 py-0.5 text-xs" placeholder="Across, e.g. Location" maxLength={30}
              value={d.matrix.xLabel ?? ""} aria-label="Horizontal axis"
              onChange={(e) => update({ matrix: { ...d.matrix, xLabel: e.target.value } })}
            />
            vs.
            <input
              className="input w-28 py-0.5 text-xs" placeholder="Up, e.g. Vibe" maxLength={30}
              value={d.matrix.yLabel ?? ""} aria-label="Vertical axis"
              onChange={(e) => update({ matrix: { ...d.matrix, yLabel: e.target.value } })}
            />
          </span>
        )}
      </div>

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
          {/* y axis label */}
          <div className="flex flex-col items-center justify-between py-1 text-[11px] font-medium text-ink/50">
            <span className="[writing-mode:vertical-rl] rotate-180">{preset.y[1]} ↑</span>
            <span className="[writing-mode:vertical-rl] rotate-180">{preset.y[0]}</span>
          </div>
          <div>
            <div ref={board} className="relative grid aspect-square grid-cols-2 grid-rows-2 overflow-visible rounded-md border border-ink/15">
              {([
                ["tl", preset.q.tl, "border-r border-b"],
                ["tr", preset.q.tr, "border-b bg-mint-soft/50"],
                ["bl", preset.q.bl, "border-r bg-coral-soft/30"],
                ["br", preset.q.br, ""],
              ] as const).map(([k, name, cls]) => (
                <div key={k} className={`border-ink/10 p-2 ${cls}`}>
                  <span className={`text-xs font-semibold ${k === "tr" ? "text-mint" : "text-ink/35"}`}>
                    {name}
                    {k === "tr" && " ★"}
                  </span>
                </div>
              ))}
              {placed.map((o) =>
                drag?.id === o.id ? null : chip(o.id, d.matrix.pos[o.id]),
              )}
              {drag && chip(drag.id, drag.pos, true)}
            </div>
            <div className="mt-1 flex justify-between text-[11px] font-medium text-ink/50">
              <span>{preset.x[0]}</span>
              <span>{preset.x[1]} →</span>
            </div>
          </div>
        </div>

      </div>

      {placed.length > 0 && (
        <div className="card space-y-2">
          <h3 className="font-display font-bold">Where things landed</h3>
          <ul className="space-y-1 text-sm">
            {[...placed]
              .sort((a, b) => d.matrix.pos[b.id].x + d.matrix.pos[b.id].y - (d.matrix.pos[a.id].x + d.matrix.pos[a.id].y))
              .map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-2">
                  <span className={`flex items-center gap-2 ${isRuledOut(d, o.id) ? "text-ink/40 line-through" : ""}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${colorOf(o.id)}`} />
                    {o.label}
                  </span>
                  <span className="text-ink/60">{quadrantOf(preset, d.matrix.pos[o.id])}</span>
                </li>
              ))}
          </ul>
          {placed.some((o) => isRuledOut(d, o.id)) && (
            <p className="text-xs text-coral">Crossed-out options break a dealbreaker.</p>
          )}
        </div>
      )}
    </div>
  );
}
