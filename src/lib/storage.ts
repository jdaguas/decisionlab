"use client";

import type { Dilemma } from "./types";

const KEY = "decisionlab:dilemmas:v1";
const VOTER_KEY = "decisionlab:voter-id";

export function uid(): string {
  return crypto.randomUUID();
}

function readAll(): Record<string, Dilemma> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, Dilemma>) {
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function listDilemmas(): Dilemma[] {
  return Object.values(readAll()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
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
