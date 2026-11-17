import type { TreeNode } from "./types";

/**
 * Nested decision tree helpers. Every option is the root of its own list of
 * branches; a branch can hold more branches, to any depth.
 *
 * Scoring (all optional):
 *  - a branch can carry a feeling (-2 … +2) and/or a chance (0–100%)
 *  - a branch's score comes from its children: "what if" siblings (with a
 *    chance) are combined into one chance-weighted expected score, which is
 *    then averaged with plain category siblings (Cost, Time…); a branch with
 *    no scored children uses its own feeling
 */

export function scoreOf(node: TreeNode): number | null {
  const kids = node.children
    .map((c) => ({ c, s: scoreOf(c) }))
    .filter((k): k is { c: TreeNode; s: number } => k.s !== null);
  if (!kids.length) return node.value ?? null;

  // "What if" siblings are alternatives: combine them into one expected score…
  const scenarios = kids.filter((k) => k.c.chance != null && k.c.chance > 0);
  const total = scenarios.reduce((t, k) => t + k.c.chance!, 0);
  const expected = total ? scenarios.reduce((t, k) => t + (k.c.chance! / total) * k.s, 0) : null;
  // …and average that with plain categories (Cost, Time…), which each count once.
  const parts = [...kids.filter((k) => k.c.chance == null).map((k) => k.s), ...(expected !== null ? [expected] : [])];
  return parts.length ? parts.reduce((t, v) => t + v, 0) / parts.length : null;
}

/** An option's overall score: its top-level branches combined the same way. */
export function scoreOfBranches(list: TreeNode[]): number | null {
  return scoreOf({ id: "root", text: "", children: list });
}

/** Sum of chances among a node's children that have one (to warn when it isn't 100%). */
export function chanceSum(list: TreeNode[]): number | null {
  const c = list.filter((n) => n.chance != null);
  return c.length ? c.reduce((t, n) => t + (n.chance ?? 0), 0) : null;
}

export function countNodes(list: TreeNode[]): number {
  return list.reduce((t, n) => t + 1 + countNodes(n.children), 0);
}

export function mapNode(list: TreeNode[], id: string, fn: (n: TreeNode) => TreeNode): TreeNode[] {
  return list.map((n) => (n.id === id ? fn(n) : { ...n, children: mapNode(n.children, id, fn) }));
}

export function removeNode(list: TreeNode[], id: string): TreeNode[] {
  return list.filter((n) => n.id !== id).map((n) => ({ ...n, children: removeNode(n.children, id) }));
}

export function addChild(list: TreeNode[], parentId: string, child: TreeNode): TreeNode[] {
  return mapNode(list, parentId, (n) => ({ ...n, collapsed: false, children: [...n.children, child] }));
}

export function insertAfter(list: TreeNode[], id: string, node: TreeNode): TreeNode[] {
  const i = list.findIndex((n) => n.id === id);
  if (i >= 0) return [...list.slice(0, i + 1), node, ...list.slice(i + 1)];
  return list.map((n) => ({ ...n, children: insertAfter(n.children, id, node) }));
}
