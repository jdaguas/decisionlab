import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Option, PollResults } from "../types";

/**
 * Poll persistence. Uses Supabase when SUPABASE_URL + SUPABASE_SECRET_KEY are
 * set (server-side only; RLS is on with no public policies, so the browser can
 * never talk to these tables directly). Otherwise falls back to an in-memory
 * store so the app runs locally with zero setup.
 */

type PollRow = {
  id: string;
  share_token: string;
  question: string;
  options: Option[];
  dealbreakers: string[];
  owner_key_hash: string | null;
  created_at: string;
};
type VoteRow = { poll_id: string; option_id: string | null; voter_id: string; reason: string | null; created_at: string };
type PollPatch = { options: Option[]; dealbreakers: string[] };

export interface PollStore {
  create(question: string, patch: PollPatch, ownerKeyHash: string): Promise<string>;
  get(token: string): Promise<PollRow | null>;
  update(pollId: string, patch: PollPatch): Promise<void>;
  vote(pollId: string, optionId: string | null, voterId: string, reason: string | null): Promise<void>;
  votes(pollId: string): Promise<VoteRow[]>;
}

function randomToken(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}

/** 128-bit share token (public, for voting) and 192-bit owner key (private, for editing). */
export const newShareToken = () => randomToken(16);
export const newOwnerKey = () => randomToken(24);

export function hashKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function ownerKeyMatches(key: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  const a = Buffer.from(hashKey(key), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

class MemoryStore implements PollStore {
  polls = new Map<string, PollRow>();
  byId = new Map<string, PollRow>();
  voteRows = new Map<string, Map<string, VoteRow>>();

  async create(question: string, patch: PollPatch, ownerKeyHash: string) {
    const token = newShareToken();
    const row: PollRow = {
      id: crypto.randomUUID(), share_token: token, question, ...patch,
      owner_key_hash: ownerKeyHash, created_at: new Date().toISOString(),
    };
    this.polls.set(token, row);
    this.byId.set(row.id, row);
    this.voteRows.set(row.id, new Map());
    return token;
  }
  async get(token: string) {
    return this.polls.get(token) ?? null;
  }
  async update(pollId: string, patch: PollPatch) {
    const row = this.byId.get(pollId);
    if (row) Object.assign(row, patch);
  }
  async vote(pollId: string, optionId: string | null, voterId: string, reason: string | null) {
    // One response per voter per poll; responding again replaces the old one.
    this.voteRows.get(pollId)?.set(voterId, {
      poll_id: pollId, option_id: optionId, voter_id: voterId, reason, created_at: new Date().toISOString(),
    });
  }
  async votes(pollId: string) {
    return [...(this.voteRows.get(pollId)?.values() ?? [])];
  }
}

class SupabaseStore implements PollStore {
  constructor(private db: SupabaseClient) {}

  async create(question: string, patch: PollPatch, ownerKeyHash: string) {
    const token = newShareToken();
    const { error } = await this.db
      .from("polls")
      .insert({ share_token: token, question, ...patch, owner_key_hash: ownerKeyHash });
    if (error) throw error;
    return token;
  }
  async get(token: string) {
    const { data, error } = await this.db
      .from("polls").select("id, share_token, question, options, dealbreakers, owner_key_hash, created_at")
      .eq("share_token", token).maybeSingle();
    if (error) throw error;
    return data ? ({ ...data, dealbreakers: data.dealbreakers ?? [] } as PollRow) : null;
  }
  async update(pollId: string, patch: PollPatch) {
    const { error } = await this.db.from("polls").update(patch).eq("id", pollId);
    if (error) throw error;
  }
  async vote(pollId: string, optionId: string | null, voterId: string, reason: string | null) {
    const { error } = await this.db.from("votes").upsert(
      { poll_id: pollId, option_id: optionId, voter_id: voterId, reason, created_at: new Date().toISOString() },
      { onConflict: "poll_id,voter_id" },
    );
    if (error) throw error;
  }
  async votes(pollId: string) {
    const { data, error } = await this.db
      .from("votes").select("poll_id, option_id, voter_id, reason, created_at")
      .eq("poll_id", pollId).order("created_at", { ascending: false }).limit(1000);
    if (error) throw error;
    return (data ?? []) as VoteRow[];
  }
}

const g = globalThis as unknown as { __pollStore?: PollStore };

export function pollStore(): PollStore {
  if (g.__pollStore) return g.__pollStore;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  g.__pollStore = url && key
    ? new SupabaseStore(createClient(url, key, { auth: { persistSession: false } }))
    : new MemoryStore();
  return g.__pollStore;
}

export async function results(token: string): Promise<PollResults | null> {
  const store = pollStore();
  const poll = await store.get(token);
  if (!poll) return null;
  const votes = await store.votes(poll.id);
  const tallies: Record<string, number> = Object.fromEntries(poll.options.map((o) => [o.id, 0]));
  const open = poll.options.length === 0;
  let total = 0;
  for (const v of votes) {
    if (v.option_id && v.option_id in tallies) {
      tallies[v.option_id]++;
      total++;
    } else if (open && v.reason) {
      total++;
    }
  }
  return {
    token: poll.share_token,
    question: poll.question,
    options: poll.options,
    dealbreakers: poll.dealbreakers,
    createdAt: poll.created_at,
    tallies,
    totalVotes: total,
    // voter_id and owner_key_hash are deliberately NOT returned.
    reasons: votes
      .filter((v) => v.reason)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((v) => ({
        optionId: v.option_id && v.option_id in tallies ? v.option_id : null,
        reason: v.reason!,
        createdAt: v.created_at,
      })),
  };
}
