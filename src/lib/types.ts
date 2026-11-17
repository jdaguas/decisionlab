export type Option = { id: string; label: string; /** optional http(s) link, e.g. a listing or menu */ url?: string };

/** A non-negotiable condition, e.g. "Can't miss the deadline". Shared by every tool. */
export type Dealbreaker = { id: string; text: string };

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
};

export type Tool = "proscons" | "weighted" | "matrix" | "tree" | "jury";

/** 2×2 matrix: each option placed on two axes. x and y are 0–1, where 1 is the "better" end. */
export type Matrix = {
  preset: string;
  /** Only used when preset is "custom". */
  xLabel?: string;
  yLabel?: string;
  pos: Record<string, { x: number; y: number }>;
};

/** One possible result of choosing an option. */
export type Outcome = {
  id: string;
  text: string;
  /** 0–100, how likely */
  chance: number;
  /** -2 (awful) … +2 (great) */
  value: number;
};

export type Dilemma = {
  id: string;
  question: string;
  /** May be empty: sometimes you're just gathering opinions. */
  options: Option[];
  dealbreakers: Dealbreaker[];
  /** fails[optionId][dealbreakerId] = true when that option breaks that dealbreaker */
  fails: Record<string, Record<string, boolean>>;
  factors: Factor[];
  criteria: Criterion[];
  /** scores[optionId][criterionId] = 1–5 */
  scores: Record<string, Record<string, number>>;
  matrix: Matrix;
  /** tree[optionId] = possible outcomes of that option */
  tree: Record<string, Outcome[]>;
  tool: Tool;
  poll?: { token: string; ownerKey?: string; shareDealbreakers?: boolean; createdAt: string };
  outcome?: { optionId: string; note: string; decidedAt: string };
  createdAt: string;
  updatedAt: string;
};

/** Shape returned by the poll API. */
export type PollResults = {
  token: string;
  question: string;
  options: Option[];
  dealbreakers: string[];
  createdAt: string;
  tallies: Record<string, number>;
  /** Votes for a current option (options mode) or opinions (open mode). */
  totalVotes: number;
  reasons: { optionId: string | null; reason: string; createdAt: string }[];
};
