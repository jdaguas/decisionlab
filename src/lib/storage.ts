"use client";

import type { Dilemma, Tool } from "./types";

const KEY = "decisionlab:dilemmas:v1";
const VOTER_KEY = "decisionlab:voter-id";

export function uid(): string {
  return crypto.randomUUID();
}

/** Fill in fields added after a dilemma was first saved, so older saves keep working. */
function normalize(raw: Dilemma & { mode?: string; method?: string }): Dilemma {
  const tool: Tool = raw.tool ?? (raw.mode === "settle" ? "jury" : raw.method === "weighted" ? "weighted" : "proscons");
  return {
    ...raw,
    options: raw.options ?? [],
    dealbreakers: raw.dealbreakers ?? [],
    fails: raw.fails ?? {},
    factors: raw.factors ?? [],
    criteria: (raw.criteria ?? []).map(({ id, label, weight }) => ({ id, label, weight })),
    scores: raw.scores ?? {},
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

export function saveDilemma(d: Dilemma): Dilemma {
  const all = readAll();
  const next = { ...d, updatedAt: new Date().toISOString() };
  all[d.id] = next;
  writeAll(all);
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
