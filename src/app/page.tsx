"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteDilemma, listDilemmas } from "@/lib/storage";
import { labelOf } from "@/lib/analysis";
import type { Dilemma } from "@/lib/types";

export default function Home() {
  const [dilemmas, setDilemmas] = useState<Dilemma[] | null>(null);

  useEffect(() => {
    // localStorage is only available after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDilemmas(listDilemmas());
  }, []);

  return (
    <div className="space-y-10">
      <section className="card relative overflow-hidden bg-grape-soft">
        <div className="max-w-2xl space-y-4">
          <h1 className="font-display text-4xl font-semibold tracking-tight leading-tight sm:text-5xl">
            Too complicated for a coin flip.
            <br />
            <span className="text-grape">Too silly for a spreadsheet.</span>
          </h1>
          <p className="text-lg text-ink/70">
            Enter a dilemma, weigh it with pros &amp; cons or criteria, then put it before a jury of
            your friends. You still make the call.
          </p>
          <Link href="/new" className="btn-primary text-lg">
            + Start a dilemma
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-display text-2xl font-bold">Your dilemmas</h2>
        {dilemmas === null ? null : dilemmas.length === 0 ? (
          <p className="text-ink/60">
            Nothing here yet. Your dilemmas are saved in this browser, so you can come back to them.
          </p>
        ) : (
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
    </div>
  );
}
