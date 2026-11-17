"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveDilemma, uid } from "@/lib/storage";
import type { Dilemma } from "@/lib/types";

const EXAMPLES = [
  { q: "Should I go to the concert Wednesday even though my project is due Friday?", o: ["Go to the concert", "Stay home and work"] },
  { q: "Where should we get dinner tonight?", o: ["Tacos", "Ramen", "Cook at home"] },
  { q: "Which apartment should I take?", o: ["Cheaper one, far away", "Pricier one, close to campus"] },
];

export default function NewDilemma() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [touched, setTouched] = useState(false);

  const filled = options.map((o) => o.trim()).filter(Boolean);
  const dupes = new Set(filled.map((o) => o.toLowerCase())).size !== filled.length;
  const valid = question.trim().length > 0 && filled.length >= 2 && !dupes;

  function create() {
    setTouched(true);
    if (!valid) return;
    const now = new Date().toISOString();
    const d: Dilemma = {
      id: uid(),
      question: question.trim(),
      options: filled.map((label) => ({ id: uid(), label })),
      factors: [],
      criteria: [],
      scores: {},
      mode: "think",
      method: "proscons",
      createdAt: now,
      updatedAt: now,
    };
    saveDilemma(d);
    router.push(`/d/${d.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-3xl font-extrabold">What are you deciding?</h1>

      <div className="card space-y-5">
        <div>
          <label htmlFor="q" className="label">Your dilemma</label>
          <input
            id="q"
            className="input text-lg"
            placeholder="Should I…?"
            maxLength={200}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <span className="label">Your options (at least two)</span>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input
                  aria-label={`Option ${i + 1}`}
                  className="input"
                  placeholder={i === 0 ? "e.g. Go to the concert" : i === 1 ? "e.g. Stay home and work" : "Another option"}
                  maxLength={80}
                  value={o}
                  onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
                  onKeyDown={(e) => e.key === "Enter" && create()}
                />
                {options.length > 2 && (
                  <button
                    className="btn-ghost"
                    aria-label={`Remove option ${i + 1}`}
                    onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button className="btn-ghost mt-2" onClick={() => setOptions([...options, ""])}>
              + Add option
            </button>
          )}
        </div>

        {touched && !valid && (
          <p role="alert" className="text-sm font-medium text-coral">
            {!question.trim()
              ? "Write down your dilemma first."
              : dupes
                ? "Two of your options are the same."
                : "Add at least two options."}
          </p>
        )}

        <button className="btn-primary w-full text-lg" onClick={create}>
          Let&apos;s overthink this →
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-ink/60">Or start from an example:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.q}
              className="chip bg-white text-left hover:bg-sun"
              onClick={() => {
                setQuestion(ex.q);
                setOptions(ex.o);
              }}
            >
              {ex.q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
