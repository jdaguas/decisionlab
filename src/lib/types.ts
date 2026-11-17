export type Option = { id: string; label: string };

export type Factor = {
  id: string;
  optionId: string;
  type: "pro" | "con";
  text: string;
  /** 1 = minor, 2 = matters, 3 = big deal */
  weight: 1 | 2 | 3;
};

export type Criterion = {
  id: string;
  label: string;
  /** 1–5 */
  weight: number;
  /** If true, any option scoring 1 on this criterion is ruled out. */
  dealbreaker: boolean;
};

export type Mode = "think" | "settle";
export type Method = "proscons" | "weighted";

export type Dilemma = {
  id: string;
  question: string;
  options: Option[];
  factors: Factor[];
  criteria: Criterion[];
  /** scores[optionId][criterionId] = 1–5 */
  scores: Record<string, Record<string, number>>;
  mode: Mode;
  method: Method;
  poll?: { token: string; createdAt: string };
  outcome?: { optionId: string; note: string; decidedAt: string };
  createdAt: string;
  updatedAt: string;
};

/** Shape returned by the poll API. */
export type PollResults = {
  token: string;
  question: string;
  options: Option[];
  createdAt: string;
  tallies: Record<string, number>;
  totalVotes: number;
  reasons: { optionId: string; reason: string; createdAt: string }[];
};
