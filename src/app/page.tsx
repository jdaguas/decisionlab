"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteDilemma, listDilemmas } from "@/lib/storage";
import { labelOf } from "@/lib/analysis";
import type { Dilemma } from "@/lib/types";
import { NewDilemmaWizard } from "@/components/NewDilemmaWizard";

export default function Home() {
  const [dilemmas, setDilemmas] = useState<Dilemma[] | null>(null);

  useEffect(() => {
    // localStorage is only available after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDilemmas(listDilemmas());
  }, []);

  return (
    <div className="space-y-10">
      <section className="mx-auto max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Too complicated for a coin flip. <span className="text-grape">Too silly for a spreadsheet.</span>
          </h1>
          <p className="text-ink/60">
            Describe it once, then try it through pros &amp; cons, a weighted comparison, or a jury of friends.
            You still make the call.
          </p>
        </div>
        <NewDilemmaWizard />
      </section>

      {dilemmas && dilemmas.length > 0 && (
      <section>
        <h2 className="mb-1 font-display text-xl font-semibold">Your dilemmas</h2>
        <p className="mb-3 text-sm text-ink/50">Saved in this browser.</p>
        {(
          <ul className="grid gap-4 sm:grid-cols-2">
            {dilemmas.map((d) => (
              <li key={d.id} className="card flex flex-col gap-3">
                <Link href={`/d/${d.id}`} className="font-display text-lg font-bold hover:text-grape">
                  {d.question}
                </Link>
                <div className="flex flex-wrap gap-2">
                  {d.options.map((o) => (
                    <span key={o.id} className="chip bg-white text-xs">
                      {o.label}
                    </span>
                  ))}
                </div>
                <div className="mt-auto flex items-center justify-between text-sm text-ink/60">
                  <span>
                    {d.outcome ? (
                      <>✅ Decided: <strong className="text-ink">{labelOf(d.options, d.outcome.optionId)}</strong></>
                    ) : !d.options.length ? (
                      "💬 Gathering opinions"
                    ) : d.poll ? (
                      "🧪 Jury in session"
                    ) : (
                      "🧠 Thinking it through"
                    )}
                  </span>
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      if (confirm("Delete this dilemma?")) {
                        deleteDilemma(d.id);
                        setDilemmas(listDilemmas());
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}
    </div>
  );
}
