"use client";

import type { Dilemma, Matrix, Tool, TreeNode } from "./types";

const KEY = "decisionlab:dilemmas:v1";
const VOTER_KEY = "decisionlab:voter-id";

export function uid(): string {
  return crypto.randomUUID();
}

/** Fill in fields added after a dilemma was first saved, so older saves keep working. */
type OldMatrix = { preset?: string; xLabel?: string; yLabel?: string; pos?: Matrix["pos"] };

const OLD_PRESETS: Record<string, Omit<Matrix, "id" | "pos">> = {
  effort: { x: ["More effort", "Less effort"], y: ["Low payoff", "High payoff"], q: { tr: "Quick win", tl: "Big bet", br: "Easy filler", bl: "Not worth it" } },
  risk: { x: ["Riskier", "Safer"], y: ["Small reward", "Big reward"], q: { tr: "Safe bet", tl: "Long shot", br: "Play it safe", bl: "Avoid" } },
  cost: { x: ["Pricier", "Cheaper"], y: ["Less fun", "More fun"], q: { tr: "Best value", tl: "Splurge", br: "Budget pick", bl: "Skip it" } },
};

/** Earlier saves had one `matrix` with a preset id; convert it to the new `matrices` list. */
function migrateMatrix(old: OldMatrix | undefined): Matrix[] {
  if (!old || !old.pos || !Object.keys(old.pos).length) return [];
  const base = OLD_PRESETS[old.preset ?? ""] ?? {
    x: [`Worse ${old.xLabel || "X"}`, `Better ${old.xLabel || "X"}`] as [string, string],
    y: [`Worse ${old.yLabel || "Y"}`, `Better ${old.yLabel || "Y"}`] as [string, string],
    q: { tr: "Sweet spot", tl: "Top-left", br: "Bottom-right", bl: "Skip it" },
  };
  return [{ id: uid(), ...base, pos: old.pos }];
}

/** Earlier trees were flat outcome lists without `children`. */
function toNode(n: Partial<TreeNode> & { id: string }): TreeNode {
  return { ...n, text: n.text ?? "", children: (n.children ?? []).map(toNode) };
}

function normalize(raw: Dilemma & { mode?: string; method?: string; matrix?: OldMatrix }): Dilemma {
  const tool: Tool = raw.tool ?? (raw.mode === "settle" ? "jury" : raw.method === "weighted" ? "weighted" : "proscons");
  const { matrix: _old, ...rest } = raw;
  void _old;
  return {
    ...rest,
    options: raw.options ?? [],
    dealbreakers: raw.dealbreakers ?? [],
    fails: raw.fails ?? {},
    factors: raw.factors ?? [],
    criteria: (raw.criteria ?? []).map(({ id, label, weight }) => ({ id, label, weight })),
    scores: raw.scores ?? {},
    matrices: raw.matrices ?? migrateMatrix(raw.matrix),
    tree: Object.fromEntries(Object.entries(raw.tree ?? {}).map(([k, list]) => [k, (list ?? []).map(toNode)])),
    tool,
  };
}

function readAll(): Record<string, Dilemma> {
  if (typeof window === "undefined") return {};
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || "{}");
    for (const k of Object.keys(all)) all[k] = normalize(all[k]);
    return all;
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, Dilemma>) {
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function listDilemmas(): Dilemma[] {
  return Object.values(readAll()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getDilemma(id: string): Dilemma | undefined {
  return readAll()[id];
}

let warnedFull = false;

export function saveDilemma(d: Dilemma): Dilemma {
  const all = readAll();
  const next = { ...d, updatedAt: new Date().toISOString() };
  all[d.id] = next;
  try {
    writeAll(all);
  } catch (e) {
    // Browser storage is ~5 MB; photos are the usual culprit.
    if (!warnedFull) {
      warnedFull = true;
      alert("This browser's storage is full, so your latest change couldn't be saved. Try removing a few photos or old dilemmas.");
    }
    console.error(e);
  }
  return next;
}

export function deleteDilemma(id: string) {
  const all = readAll();
  delete all[id];
  writeAll(all);
}

/** Anonymous, per-browser identifier so a friend can change (not stack) their vote. */
export function getVoterId(): string {
  let id = localStorage.getItem(VOTER_KEY);
  if (!id) {
    id = uid();
    localStorage.setItem(VOTER_KEY, id);
  }
  return id;
}
