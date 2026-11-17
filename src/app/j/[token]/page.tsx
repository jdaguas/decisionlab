import type { Metadata } from "next";
import { Suspense } from "react";
import JuryVote from "./JuryVote";

export const metadata: Metadata = { title: "You've been asked to peer review · DecisionLab" };

export default function Page() {
  return (
    <Suspense>
      <JuryVote />
    </Suspense>
  );
}
