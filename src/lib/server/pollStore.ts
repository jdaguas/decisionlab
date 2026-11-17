import "server-only";
import { randomBytes } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Option, PollResults } from "../types";

/**
 * Poll persistence. Uses Supabase when SUPABASE_URL + SUPABASE_SECRET_KEY are
 * set (server-side only; RLS is on with no public policies, so the browser can
 * never talk to these tables directly). Otherwise falls back to an in-memory
 * store so the app runs locally with zero setup.
 */

type PollRow = { id: string; share_token: string; question: string; options: Option[]; created_at: string };
type VoteRow = { poll_id: string; option_id: string; voter_id: string; reason: string | null; created_at: string };

export interface PollStore {
  create(question: string, options: Option[]): Promise<string>;
  get(token: string): Promise<PollRow | null>;
  vote(pollId: string, optionId: string, voterId: string, reason: string | null): Promise<void>;
  votes(pollId: string): Promise<VoteRow[]>;
}

export function newToken(): string {
  // 128 bits, URL-safe: unguessable share links.
  return randomBytes(16).toString("base64url");
}

class MemoryStore implements PollStore {
  polls = new Map<string, PollRow>();
  voteRows = new Map<string, Map<string, VoteRow>>();

  async create(question: string, options: Option[]) {
    const token = newToken();
    const id = crypto.randomUUID();
    this.polls.set(token, { id, share_token: token, question, options, created_at: new Date().toISOString() });
    this.voteRows.set(id, new Map());
    return token;
  }
  async get(token: string) {
    return this.polls.get(token) ?? null;
  }
  async vote(pollId: string, optionId: string, voterId: string, reason: string | null) {
    // One vote per voter per poll; re-voting replaces the old vote.
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

  async create(question: string, options: Option[]) {
    const token = newToken();
    const { error } = await this.db.from("polls").insert({ share_token: token, question, options });
    if (error) throw error;
    return token;
  }
  async get(token: string) {
    const { data, error } = await this.db
      .from("polls").select("id, share_token, question, options, created_at")
      .eq("share_token", token).maybeSingle();
    if (error) throw error;
    return data as PollRow | null;
  }
  async vote(pollId: string, optionId: string, voterId: string, reason: string | null) {
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
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
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
  for (const v of votes) if (v.option_id in tallies) tallies[v.option_id]++;
  return {
    token: poll.share_token,
    question: poll.question,
    options: poll.options,
    createdAt: poll.created_at,
    tallies,
    totalVotes: votes.length,
    // voter_id is deliberately NOT returned.
    reasons: votes
      .filter((v) => v.reason)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((v) => ({ optionId: v.option_id, reason: v.reason!, createdAt: v.created_at })),
  };
}
