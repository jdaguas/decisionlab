"use client";

import { useCallback, useEffect, useState } from "react";
import type { PollResults } from "./types";

/** Fetches poll results and refreshes every few seconds while the tab is visible. */
export function usePoll(token: string | undefined, intervalMs = 4000) {
  const [data, setData] = useState<PollResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/polls/${token}`, { cache: "no-store" });
      if (res.status === 404) {
        setError("This jury link doesn't exist (or the server forgot it).");
        return;
      }
      if (!res.ok) throw new Error();
      setData(await res.json());
      setError(null);
    } catch {
      setError("Couldn't reach the courthouse. Retrying…");
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), intervalMs);
    return () => clearInterval(t);
  }, [token, intervalMs, refresh]);

  return { data, error, refresh };
}

export function juryLeader(p: PollResults | null): string | null {
  if (!p || p.totalVotes === 0) return null;
  const best = Math.max(...Object.values(p.tallies));
  const top = Object.entries(p.tallies).filter(([, n]) => n === best);
  return top.length === 1 ? top[0][0] : null;
}
