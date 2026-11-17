import type { Dilemma, Option } from "./types";

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
    const ruledOutBy: string[] = [];
    for (const c of crit) {
      const s = scoreFor(d, o.id, c.id);
      total += s * c.weight;
      if (c.dealbreaker && s <= 1) ruledOutBy.push(c.label);
    }
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
  return leader(rows, (r) => r.net);
}

export function weightedLeader(d: Dilemma): string | null {
  if (!d.criteria.some((c) => c.label.trim())) return null;
  return leader(weightedSummary(d), (r) => r.percent, (r) => !r.ruledOut);
}

export function labelOf(options: Option[], id: string | null | undefined): string {
  return options.find((o) => o.id === id)?.label ?? "—";
}
