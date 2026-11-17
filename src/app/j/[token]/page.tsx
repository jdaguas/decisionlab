import type { Metadata } from "next";
import { Suspense } from "react";
import JuryVote from "./JuryVote";

export const metadata: Metadata = { title: "You have been summoned for jury duty · DecisionLab" };

export default function Page() {
  return (
    <Suspense>
      <JuryVote />
    </Suspense>
  );
}
