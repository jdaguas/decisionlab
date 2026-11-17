/**
 * Playful, clearly nonbinding "findings" written in lab-report voice.
 * Deterministic given a seed so they don't flicker on every poll refresh;
 * "re-run" bumps the seed.
 */

type Input = {
  jury: string | null; // option the peer reviewers favor, or null (tie / no responses)
  juryVotes: number;
  analysis: string | null; // leading option from Think It Through (weighted, else pros/cons)
  analysisName: string; // "weighted comparison" | "pros & cons list"
  ruledOut: string[]; // labels of options eliminated by dealbreakers
  open: boolean; // no options yet: reviewers are giving opinions, not votes
  seed: number;
};

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

export function verdict(i: Input): { headline: string; detail: string } {
  const s = i.seed;

  if (i.juryVotes === 0) {
    return {
      headline: "No data yet. The sample size is zero.",
      detail: "Send the peer review link to a few friends. Every good experiment needs more than one observer.",
    };
  }

  if (i.open) {
    const n = i.juryVotes;
    return {
      headline: pick(
        [
          `Early observations: ${n} reviewer${n === 1 ? " has" : "s have"} weighed in.`,
          `Qualitative data is coming in (n\u00a0=\u00a0${n}).`,
          `${n} peer${n === 1 ? "" : "s"} submitted notes. Hypotheses forming…`,
        ],
        s,
      ),
      detail: "There are no options to test yet. Turn the best suggestions into options, then ask reviewers to vote.",
    };
  }

  if (!i.jury) {
    return {
      headline: pick(
        [
          "Inconclusive. The reviewers split evenly.",
          "Results are a statistical tie. More data needed.",
          "Your peers are exactly as torn as you are. Fascinating.",
        ],
        s,
      ),
      detail: i.analysis
        ? `Tiebreaker on file: your ${i.analysisName} leans “${i.analysis}.”`
        : "Try a tiebreaker: run a Think It Through method, or recruit one more reviewer.",
    };
  }

  const J = i.jury.toUpperCase();

  if (i.ruledOut.includes(i.jury)) {
    return {
      headline: pick(
        [
          `Reviewers favor ${J}, but it fails one of your dealbreakers.`,
          `Peer consensus: ${J}. Your safety protocol: absolutely not.`,
        ],
        s,
      ),
      detail: "Your friends picked an option you marked as a dealbreaker. Maybe they don't know about it, or maybe it matters less than you think. You decide.",
    };
  }

  if (!i.analysis) {
    return {
      headline: pick(
        [
          `Peer review is in: ${J}.`,
          `The reviewers recommend ${J}.`,
          `Preliminary finding: your peers lean ${J}.`,
        ],
        s,
      ),
      detail: "There's no analysis to compare against yet. Run a Think It Through method to see if your own reasoning replicates this result.",
    };
  }

  if (i.analysis === i.jury) {
    return {
      headline: pick(
        [
          `Replicated! Your peers AND your ${i.analysisName} both point to ${J}.`,
          `Strong agreement: two independent methods favor ${J}.`,
          `The results hold up. Head and heart both say ${J}.`,
        ],
        s,
      ),
      detail: "When your own reasoning and your friends agree, that's a pretty good sign.",
    };
  }

  const A = i.analysis.toUpperCase();
  return {
    headline: pick(
      [
        `Conflicting results: reviewers say ${J}, your ${i.analysisName} says ${A}.`,
        `Failed to replicate. Your peers favor ${J}; your priorities favor ${A}.`,
        `${J} wins peer review. ${A} wins your own analysis.`,
      ],
      s,
    ),
    detail: "Your friends and your analysis disagree. Read their comments: are they weighing something you aren't, or the other way around?",
  };
}
