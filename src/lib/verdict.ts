/**
 * Playful, clearly nonbinding verdicts. Deterministic given a seed so the
 * verdict doesn't flicker on every poll refresh; "reroll" bumps the seed.
 */

type Input = {
  jury: string | null; // leading option label from votes, or null (tie / no votes)
  juryVotes: number;
  analysis: string | null; // leading option from Think It Through (weighted, else pros/cons)
  analysisName: string; // "weighted comparison" | "pros & cons list"
  ruledOut: string[]; // labels of options eliminated by dealbreakers
  open: boolean; // no options yet: friends are giving opinions, not votes
  seed: number;
};

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

export function verdict(i: Input): { headline: string; detail: string } {
  const s = i.seed;

  if (i.juryVotes === 0) {
    return {
      headline: "The courtroom is empty.",
      detail: "Share the jury link. Even a judge needs someone to bang the gavel at.",
    };
  }

  if (i.open) {
    const n = i.juryVotes;
    return {
      headline: pick(
        [
          `Open hearing: ${n} witness${n === 1 ? " has" : "es have"} testified.`,
          `The jury has thoughts. ${n} of them, to be exact.`,
          `Testimony is pouring in (${n} so far).`,
        ],
        s,
      ),
      detail: "No options on the table yet. Turn the best suggestions into options, then let the jury vote.",
    };
  }

  if (!i.jury) {
    return {
      headline: pick(
        [
          "Hung jury! The court is in shambles.",
          "The jury is deadlocked and has ordered pizza.",
          "Mistrial: your friends are exactly as torn as you are.",
        ],
        s,
      ),
      detail: i.analysis
        ? `Tiebreaker on file: your ${i.analysisName} leans “${i.analysis}.”`
        : "Consider a tiebreaker: try Think It Through, or recruit one more juror.",
    };
  }

  const J = i.jury.toUpperCase();

  if (i.ruledOut.includes(i.jury)) {
    return {
      headline: pick(
        [
          `The jury votes ${J}, but one of your dealbreakers has stormed the courtroom.`,
          `Popular opinion says ${J}. Your own dealbreaker says absolutely not.`,
        ],
        s,
      ),
      detail: "Your friends picked an option you said was a dealbreaker. Who's right? (You are. You're the judge.)",
    };
  }

  if (!i.analysis) {
    return {
      headline: pick(
        [
          `The jury has spoken: ${J}.`,
          `Order in the court! The people demand ${J}.`,
          `By popular decree: ${J}. The gavel has dropped.`,
        ],
        s,
      ),
      detail: "No analysis on file yet. Switch to Think It Through to cross-examine this verdict.",
    };
  }

  if (i.analysis === i.jury) {
    return {
      headline: pick(
        [
          `Unanimous-ish: the jury AND your ${i.analysisName} both say ${J}.`,
          `Head and heart agree. ${J} it is (probably).`,
          `Case closed? Your friends and your spreadsheet-brain both back ${J}.`,
        ],
        s,
      ),
      detail: "When your reasoning and your friends line up, that's a pretty good sign.",
    };
  }

  const A = i.analysis.toUpperCase();
  return {
    headline: pick(
      [
        `The jury votes ${J}, but your ${i.analysisName} has filed a formal objection for ${A}.`,
        `Objection! Your friends say ${J}; your priorities say ${A}.`,
        `${J} wins the popular vote. ${A} wins the debate in your head.`,
      ],
      s,
    ),
    detail: "Your friends and your own analysis disagree. Read their reasons: are they weighing something you aren't, or the other way around?",
  };
}
