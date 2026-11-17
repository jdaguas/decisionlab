import type { Dilemma, Option } from "./types";

/** Dealbreakers each option breaks (by text). Shared by every tool. */
export function brokenBy(d: Dilemma, optionId: string): string[] {
  return d.dealbreakers.filter((b) => d.fails[optionId]?.[b.id]).map((b) => b.text);
}

export function isRuledOut(d: Dilemma, optionId: string): boolean {
  return brokenBy(d, optionId).length > 0;
}

export type ProsConsSummary = {
  optionId: string;
  pros: number;
  cons: number;
  net: number;
}[];

export function prosConsSummary(d: Dilemma): ProsConsSummary {
  return d.options.map((o) => {
    const fs = d.factors.filter((f) => f.optionId === o.id && f.text.trim());
    const pros = fs.filter((f) => f.type === "pro").reduce((s, f) => s + f.weight, 0);
    const cons = fs.filter((f) => f.type === "con").reduce((s, f) => s + f.weight, 0);
    return { optionId: o.id, pros, cons, net: pros - cons };
  });
}

export type WeightedRow = {
  optionId: string;
  /** 0–100 */
  percent: number;
  ruledOut: boolean;
  ruledOutBy: string[];
};

export const DEFAULT_SCORE = 3;

export function scoreFor(d: Dilemma, optionId: string, criterionId: string): number {
  return d.scores[optionId]?.[criterionId] ?? DEFAULT_SCORE;
}

export function weightedSummary(d: Dilemma): WeightedRow[] {
  const crit = d.criteria.filter((c) => c.label.trim());
  const maxTotal = crit.reduce((s, c) => s + c.weight * 5, 0);
  return d.options.map((o) => {
    let total = 0;
    for (const c of crit) total += scoreFor(d, o.id, c.id) * c.weight;
    const ruledOutBy = brokenBy(d, o.id);
    return {
      optionId: o.id,
      percent: maxTotal ? Math.round((total / maxTotal) * 100) : 0,
      ruledOut: ruledOutBy.length > 0,
      ruledOutBy,
    };
  });
}

/** Returns the single leading option id, or null if there's no data or it's a tie. */
export function leader<T extends { optionId: string }>(
  rows: T[],
  value: (r: T) => number,
  eligible: (r: T) => boolean = () => true,
): string | null {
  const pool = rows.filter(eligible);
  if (!pool.length) return null;
  const best = Math.max(...pool.map(value));
  const top = pool.filter((r) => value(r) === best);
  return top.length === 1 ? top[0].optionId : null;
}

export function prosConsLeader(d: Dilemma): string | null {
  const rows = prosConsSummary(d);
  if (rows.every((r) => r.pros === 0 && r.cons === 0)) return null;
  return leader(rows, (r) => r.net, (r) => !isRuledOut(d, r.optionId));
}

export function weightedLeader(d: Dilemma): string | null {
  if (!d.criteria.some((c) => c.label.trim())) return null;
  return leader(weightedSummary(d), (r) => r.percent, (r) => !r.ruledOut);
}

export function labelOf(options: Option[], id: string | null | undefined): string {
  return options.find((o) => o.id === id)?.label ?? "—";
}

/* ---------- 2×2 matrix ---------- */

export type MatrixPreset = {
  id: string;
  name: string;
  /** Axis ends: [worse, better] */
  x: [string, string];
  y: [string, string];
  /** Quadrant names: top-right, top-left, bottom-right, bottom-left */
  q: { tr: string; tl: string; br: string; bl: string };
};

export const MATRIX_PRESETS: MatrixPreset[] = [
  { id: "effort", name: "Effort vs. Payoff", x: ["More effort", "Less effort"], y: ["Low payoff", "High payoff"],
    q: { tr: "Quick win", tl: "Big bet", br: "Easy filler", bl: "Not worth it" } },
  { id: "risk", name: "Risk vs. Reward", x: ["Riskier", "Safer"], y: ["Small reward", "Big reward"],
    q: { tr: "Safe bet", tl: "Long shot", br: "Play it safe", bl: "Avoid" } },
  { id: "cost", name: "Cost vs. Fun", x: ["Pricier", "Cheaper"], y: ["Less fun", "More fun"],
    q: { tr: "Best value", tl: "Splurge", br: "Budget pick", bl: "Skip it" } },
];

export function matrixPreset(m: Dilemma["matrix"]): MatrixPreset {
  const p = MATRIX_PRESETS.find((x) => x.id === m.preset);
  if (p) return p;
  const xl = m.xLabel?.trim() || "X";
  const yl = m.yLabel?.trim() || "Y";
  return {
    id: "custom", name: "Custom",
    x: [`Worse ${xl.toLowerCase()}`, `Better ${xl.toLowerCase()}`],
    y: [`Worse ${yl.toLowerCase()}`, `Better ${yl.toLowerCase()}`],
    q: { tr: "Sweet spot", tl: `Strong on ${yl.toLowerCase()}`, br: `Strong on ${xl.toLowerCase()}`, bl: "Skip it" },
  };
}

export function quadrantOf(p: MatrixPreset, pos: { x: number; y: number }): string {
  const right = pos.x >= 0.5;
  const top = pos.y >= 0.5;
  return top ? (right ? p.q.tr : p.q.tl) : right ? p.q.br : p.q.bl;
}

/** Option closest to the best corner (top-right), among placed options that aren't ruled out. */
export function matrixLeader(d: Dilemma): string | null {
  const rows = d.options
    .filter((o) => d.matrix.pos[o.id])
    .map((o) => ({ optionId: o.id, v: d.matrix.pos[o.id].x + d.matrix.pos[o.id].y }));
  if (rows.length < 2) return null;
  return leader(rows, (r) => Math.round(r.v * 100), (r) => !isRuledOut(d, r.optionId));
}

/* ---------- decision tree ---------- */

export const FEELINGS = [
  { value: -2, emoji: "😫", label: "Awful" },
  { value: -1, emoji: "🙁", label: "Bad" },
  { value: 0, emoji: "😐", label: "Meh" },
  { value: 1, emoji: "🙂", label: "Good" },
  { value: 2, emoji: "🤩", label: "Great" },
];

export function feelingFor(v: number) {
  return FEELINGS.reduce((best, f) => (Math.abs(f.value - v) < Math.abs(best.value - v) ? f : best));
}

/** Probability-weighted average feeling (-2…+2). Chances are scaled so they sum to 100%. */
export function expectedValue(outcomes: { chance: number; value: number }[]): number | null {
  const valid = outcomes.filter((o) => o.chance > 0);
  const total = valid.reduce((s, o) => s + o.chance, 0);
  if (!total) return null;
  return valid.reduce((s, o) => s + (o.chance / total) * o.value, 0);
}

export function treeLeader(d: Dilemma): string | null {
  const rows = d.options
    .map((o) => ({ optionId: o.id, ev: expectedValue((d.tree[o.id] ?? []).filter((x) => x.text.trim())) }))
    .filter((r): r is { optionId: string; ev: number } => r.ev !== null);
  if (rows.length < 2) return null;
  return leader(rows, (r) => Math.round(r.ev * 100), (r) => !isRuledOut(d, r.optionId));
}

/** The analysis Findings compare peers against: the most structured method you've used. */
export function analysisLeader(d: Dilemma): { id: string | null; name: string } {
  const tries: [string | null, string][] = [
    [weightedLeader(d), "weighted comparison"],
    [treeLeader(d), "decision tree"],
    [prosConsLeader(d), "pros & cons list"],
    [matrixLeader(d), "2×2 matrix"],
  ];
  const hit = tries.find(([id]) => id);
  return hit ? { id: hit[0], name: hit[1] } : { id: null, name: "analysis" };
}
