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

/**
 * One 2×2 grid. Every label is the user's own (presets just pre-fill them).
 * Positions are 0–1 on each axis, where 1 is the "better" end (right / top).
 */
export type Matrix = {
  id: string;
  /** Axis ends: [worse end, better end] */
  x: [string, string];
  y: [string, string];
  /** Quadrant names: top-right (best), top-left, bottom-right, bottom-left */
  q: { tr: string; tl: string; br: string; bl: string };
  pos: Record<string, { x: number; y: number }>;
};

/** One branch of the decision tree. Branches nest to any depth. */
export type TreeNode = {
  id: string;
  text: string;
  note?: string;
  /** 0–100: set when this branch is a "what if" scenario */
  chance?: number | null;
  /** -2 (awful) … +2 (great): how you'd feel */
  value?: number | null;
  children: TreeNode[];
  collapsed?: boolean;
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
  /** Several 2×2s can compare the same options on different variables. */
  matrices: Matrix[];
  /** tree[optionId] = that option's branches */
  tree: Record<string, TreeNode[]>;
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
