"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveDilemma, uid } from "@/lib/storage";
import type { Dilemma } from "@/lib/types";
import { parseOptionText } from "@/lib/links";
import { nextPhotoLabel, PhotoPicker } from "./DilemmaDetails";
import { isUsefulDrag, readTransfer, type Dropped } from "@/lib/drop";

const EXAMPLES = [
  "Should I go to the concert Wednesday even though my project is due Friday?",
  "Where should we get dinner tonight?",
  "Which apartment should I take?",
];
const DEALBREAKER_IDEAS = ["Has to fit my budget", "Can't miss a deadline", "Has to work for everyone", "Nothing I'd regret tomorrow"];
const STEPS = ["Dilemma", "Options", "Dealbreakers"] as const;

/** One text box: type, press Enter, it becomes a removable chip. Nothing is pre-filled. */
function ChipInput({
  items, setItems, draft, setDraft, placeholder, max, maxLength, label, suggestions, display = (v) => v, cards = false, images = {}, extra, onPasteItems,
}: {
  items: string[];
  setItems: (v: string[]) => void;
  draft: string;
  setDraft: (v: string) => void;
  placeholder: string;
  max: number;
  maxLength: number;
  label: string;
  suggestions: string[];
  /** How to display an item (e.g. strip a pasted link down to its name). */
  display?: (v: string) => string;
  /** Show items as roomy cards (options) instead of small chips (dealbreakers). */
  cards?: boolean;
  /** Photos by item text, shown on cards. */
  images?: Record<string, string>;
  /** Extra control under the input (e.g. "Add photos"). */
  extra?: React.ReactNode;
  /** Called when a photo (not text) is pasted into the box. */
  onPasteItems?: (items: Dropped[]) => void;
}) {
  const has = (v: string) => items.some((x) => x.toLowerCase() === v.toLowerCase());
  const add = (v: string) => {
    const t = v.trim();
    if (!t || has(t) || items.length >= max) return;
    setItems([...items, t]);
    setDraft("");
  };
  const open = suggestions.filter((x) => !has(x));
  return (
    <div className="space-y-3">
      {items.length > 0 && cards && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((v) => {
            const shown = display(v);
            const linked = shown.endsWith(" 🔗");
            return (
              <li key={v} title={v} className="relative flex min-h-20 flex-col justify-between gap-2 rounded-lg border border-ink/10 bg-white p-4">
                {images[v] && (
                  // eslint-disable-next-line @next/next/no-img-element -- local data: URL preview
                  <img src={images[v]} alt={v} className="-mx-1 -mt-1 aspect-[4/3] w-[calc(100%+0.5rem)] rounded-md object-cover" />
                )}
                <button
                  className={`absolute top-2 right-2 z-10 rounded px-1.5 hover:text-ink ${images[v] ? "bg-white/90 text-ink/60 shadow-sm" : "text-ink/30 hover:bg-ink/5"}`}
                  aria-label={`Remove ${label.toLowerCase()} ${v}`}
                  onClick={() => setItems(items.filter((x) => x !== v))}
                >
                  ✕
                </button>
                <span className="pr-6 font-display text-lg font-semibold leading-snug">{linked ? shown.slice(0, -3) : shown}</span>
                {linked && <span className="text-xs font-medium text-grape">🔗 Link attached</span>}
              </li>
            );
          })}
        </ul>
      )}
      {items.length > 0 && !cards && (
        <div className="flex flex-wrap gap-2">
          {items.map((v) => (
            <span key={v} className="chip gap-1 bg-white pr-1" title={v}>
              {display(v)}
              <button
                className="rounded px-1 text-ink/40 hover:bg-ink/5 hover:text-ink"
                aria-label={`Remove ${label.toLowerCase()} ${v}`}
                onClick={() => setItems(items.filter((x) => x !== v))}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      {items.length < max && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add(draft);
          }}
        >
          <input
            autoFocus
            aria-label={`Add ${label.toLowerCase()}`}
            className="input"
            maxLength={maxLength}
            placeholder={placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPaste={async (e) => {
              if (!onPasteItems || ![...e.clipboardData.files].some((f) => f.type.startsWith("image/"))) return;
              e.preventDefault();
              onPasteItems(await readTransfer(e.clipboardData));
            }}
          />
          <button type="submit" className="btn-secondary shrink-0" disabled={!draft.trim()}>
            Add
          </button>
        </form>
      )}
      {extra && items.length < max && extra}
      {open.length > 0 && items.length < max && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink/40">Suggestions:</span>
          {open.map((x) => (
            <button key={x} className="chip border-dashed bg-white text-xs text-ink/60 hover:bg-grape-soft hover:text-ink" onClick={() => add(x)}>
              + {x}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** "Should I…?" / "Is it…?" questions get Yes / No suggested. */
function isYesNo(q: string) {
  return /^(should|is|are|do|does|did|can|could|would|will|am)\b/i.test(q.trim());
}

export function NewDilemmaWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [dealbreakers, setDealbreakers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [optDraft, setOptDraft] = useState("");
  const [dbDraft, setDbDraft] = useState("");
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [dropping, setDropping] = useState(false);

  /** Dropped/pasted photos, links, or text become option cards (6 max). */
  const addItems = (items: Dropped[]) => {
    const next = [...options];
    const nextPhotos: Record<string, string> = {};
    for (const it of items) {
      if (next.length >= 6) break;
      if (it.kind === "photo") {
        const label = nextPhotoLabel(next.map((t) => parseOptionText(t).label));
        // Keep a page link with the photo by storing "Label https://…", which is parsed on create.
        const raw = it.url ? `${label} ${it.url}` : label;
        next.push(raw);
        nextPhotos[raw] = it.image;
      } else {
        const t = it.text.trim().slice(0, 600);
        const label = parseOptionText(t).label.toLowerCase();
        if (t && !next.some((x) => parseOptionText(x).label.toLowerCase() === label)) next.push(t);
      }
    }
    setOptions(next);
    setPhotos((p) => ({ ...p, ...nextPhotos }));
  };

  // Whatever is still typed in the box counts too, so clicking Next never loses it.
  const withDraft = (items: string[], draft: string, max: number) => {
    const t = draft.trim();
    return t && items.length < max && !items.some((x) => x.toLowerCase() === t.toLowerCase()) ? [...items, t] : items;
  };
  const filledOptions = withDraft(options, optDraft, 6);
  const filledDb = withDraft(dealbreakers, dbDraft, 6);

  function next() {
    setError(null);
    if (step === 0 && !question.trim()) return setError("Write down your dilemma first.");
    if (step === 1) {
      setOptions(filledOptions);
      setOptDraft("");
      if (filledOptions.length === 1) return setError("Add a second option, or remove it to just gather opinions.");
    }
    if (step < 2) setStep(step + 1);
    else create();
  }

  function create() {
    const now = new Date().toISOString();
    const d: Dilemma = {
      id: uid(),
      question: question.trim(),
      options: filledOptions.map((t) => ({ id: uid(), ...parseOptionText(t), ...(photos[t] ? { image: photos[t] } : {}) })),
      dealbreakers: filledDb.map((text) => ({ id: uid(), text })),
      fails: {},
      factors: [],
      criteria: [],
      scores: {},
      matrices: [],
      tree: {},
      // No options yet? Start where you can actually do something: asking friends.
      tool: filledOptions.length ? "proscons" : "jury",
      createdAt: now,
      updatedAt: now,
    };
    saveDilemma(d);
    router.push(`/d/${d.id}`);
  }

  return (
    <div className="card space-y-5">
      <ol className="flex items-center gap-2 text-xs font-medium text-ink/50">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <button
              disabled={i > step}
              onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 ${i === step ? "text-ink" : i < step ? "hover:text-ink" : ""}`}
            >
              <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${i <= step ? "bg-grape text-white" : "bg-ink/10"}`}>
                {i < step ? "✓" : i + 1}
              </span>
              {s}
              {i > 0 && <span className="font-normal text-ink/40">(optional)</span>}
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-ink/15" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-3">
          <label htmlFor="q" className="block font-display text-xl font-semibold">What are you trying to decide?</label>
          <textarea
            id="q" rows={2} maxLength={200} autoFocus
            className="input resize-none text-lg"
            placeholder="Should I…? Where should we…? Which one…?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                next();
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink/50">Try one:</span>
            {EXAMPLES.map((ex) => (
              <button key={ex} className="chip bg-white text-left text-xs hover:bg-grape-soft" onClick={() => setQuestion(ex)}>
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div
          className={`relative -m-2 space-y-3 rounded-lg p-2 transition ${dropping ? "bg-grape-soft/40 outline-2 outline-dashed outline-grape" : ""}`}
          onDragOver={(e) => {
            if (!isUsefulDrag(e.dataTransfer)) return;
            e.preventDefault();
            setDropping(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropping(false);
          }}
          onDrop={async (e) => {
            e.preventDefault();
            setDropping(false);
            addItems(await readTransfer(e.dataTransfer));
          }}
        >
          {dropping && (
            <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center rounded-lg text-sm font-semibold text-grape">
              <span className="rounded-md bg-white px-3 py-1.5 shadow-sm">Drop photos or links to add them as options</span>
            </div>
          )}
          <div>
            <h2 className="font-display text-xl font-semibold">What are your options?</h2>
            <p className="text-sm text-ink/60">
              Type them, paste a link, or <strong>drag in photos or links</strong> from another tab. Don&apos;t have
              any yet? Skip this. Your friends can suggest some, and you can add them later.
            </p>
          </div>
          <ChipInput
            items={options}
            setItems={setOptions}
            draft={optDraft}
            setDraft={setOptDraft}
            max={6}
            maxLength={600}
            label="Option"
            cards
            images={photos}
            onPasteItems={addItems}
            extra={
              <PhotoPicker
                multiple
                label="Add photos as options"
                className="inline-flex text-sm font-medium text-grape hover:underline"
                onPhotos={(dataUrls) => {
                  const room = 6 - options.length;
                  const taken = [...options];
                  const next: Record<string, string> = {};
                  for (const img of dataUrls.slice(0, room)) {
                    const l = nextPhotoLabel(taken);
                    taken.push(l);
                    next[l] = img;
                  }
                  setOptions(taken);
                  setPhotos((p) => ({ ...p, ...next }));
                }}
              >
                📷 Choosing between things you can see, like outfits? Add photos as options
              </PhotoPicker>
            }
            display={(v) => {
              const p = parseOptionText(v);
              return p.url ? `${p.label} 🔗` : p.label;
            }}
            placeholder={options.length ? "Another option, or paste a link…" : "Type an option or paste a link (Zillow, a menu…), then press Enter"}
            suggestions={isYesNo(question) ? ["Yes", "No"] : []}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div>
            <h2 className="font-display text-xl font-semibold">Any dealbreakers?</h2>
            <p className="text-sm text-ink/60">
              Things that are non-negotiable. Any option that breaks one gets ruled out, in every tool.
            </p>
          </div>
          <ChipInput
            items={dealbreakers}
            setItems={setDealbreakers}
            draft={dbDraft}
            setDraft={setDbDraft}
            max={6}
            maxLength={100}
            label="Dealbreaker"
            placeholder={dealbreakers.length ? "Another dealbreaker…" : "Type one, e.g. Can't miss the Friday deadline, and press Enter"}
            suggestions={DEALBREAKER_IDEAS}
          />
        </div>
      )}

      {error && <p role="status" className="text-sm font-medium text-coral">{error}</p>}

      <div className="flex items-center justify-between border-t border-ink/10 pt-4">
        {step > 0 ? (
          <button className="btn-ghost" onClick={() => { setError(null); setStep(step - 1); }}>← Back</button>
        ) : <span />}
        <div className="flex items-center gap-2">
          {step === 1 && !filledOptions.length && (
            <span className="text-xs text-ink/50">No options: you&apos;ll gather opinions first</span>
          )}
          <button className="btn-primary" onClick={next}>
            {step === 2 ? "Open the lab →" : step === 1 && !filledOptions.length ? "Skip →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
