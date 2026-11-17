"use client";

import { useState } from "react";
import { uid } from "@/lib/storage";
import type { Dilemma } from "@/lib/types";
import { parseOptionText, safeUrl } from "@/lib/links";
import { brokenBy } from "@/lib/analysis";
import { OptionLink } from "./OptionLink";
import { OptionImage } from "./OptionImage";
import { compressImage } from "@/lib/image";
import { isUsefulDrag, readTransfer, type Dropped } from "@/lib/drop";
import type { Option } from "@/lib/types";

type Props = { d: Dilemma; update: (p: Partial<Dilemma>) => void };

/** Removes an option and everything attached to it, so no tool keeps stale data. */
export function removeOption(d: Dilemma, optionId: string): Partial<Dilemma> {
  const { [optionId]: _s, ...scores } = d.scores;
  const { [optionId]: _f, ...fails } = d.fails;
  const { [optionId]: _t, ...tree } = d.tree;
  void _s;
  void _f;
  void _t;
  return {
    options: d.options.filter((o) => o.id !== optionId),
    factors: d.factors.filter((f) => f.optionId !== optionId),
    scores,
    fails,
    matrices: d.matrices.map((m) => {
      const { [optionId]: _p, ...pos } = m.pos;
      void _p;
      return { ...m, pos };
    }),
    tree,
    outcome: d.outcome?.optionId === optionId ? undefined : d.outcome,
  };
}

/** Adds an option from free text; a pasted link becomes the option's link. */
export function addOption(d: Dilemma, text: string): Partial<Dilemma> | null {
  const { label: l, url } = parseOptionText(text);
  if (!l || d.options.length >= 6 || d.options.some((o) => o.label.toLowerCase() === l.toLowerCase())) return null;
  return { options: [...d.options, url ? { id: uid(), label: l, url } : { id: uid(), label: l }] };
}

/** "Option A", "Option B"… skipping names already taken. */
export function nextPhotoLabel(taken: string[]): string {
  const used = new Set(taken.map((t) => t.toLowerCase()));
  for (let i = 0; i < 26; i++) {
    const l = `Option ${String.fromCharCode(65 + i)}`;
    if (!used.has(l.toLowerCase())) return l;
  }
  return `Option ${taken.length + 1}`;
}

/** Hidden file input + a trigger. Shrinks each photo before handing it over. */
export function PhotoPicker({
  multiple, onPhotos, children, className, label,
}: { multiple?: boolean; onPhotos: (dataUrls: string[]) => void; children: React.ReactNode; className?: string; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className={`cursor-pointer ${className ?? ""}`} aria-label={label}>
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        className="sr-only"
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          if (!files.length) return;
          setBusy(true);
          try {
            onPhotos(await Promise.all(files.map(compressImage)));
          } catch (err) {
            alert(err instanceof Error ? err.message : "Couldn't add that photo.");
          } finally {
            setBusy(false);
          }
        }}
      />
      {busy ? <span className="text-xs text-ink/50">Adding…</span> : children}
    </label>
  );
}

/** New options from dropped/pasted photos, links, or text. Skips duplicates; max 6 options total. */
export function optionsFromDropped(existing: Option[], items: Dropped[]): { added: Option[]; skipped: number } {
  const taken = existing.map((x) => x.label);
  const added: Option[] = [];
  let skipped = 0;
  for (const it of items) {
    if (existing.length + added.length >= 6) {
      skipped++;
      continue;
    }
    if (it.kind === "photo") {
      const label = nextPhotoLabel(taken);
      taken.push(label);
      added.push({ id: uid(), label, image: it.image, ...(it.url ? { url: it.url } : {}) });
    } else {
      const { label, url } = parseOptionText(it.text);
      if (!label || taken.some((t) => t.toLowerCase() === label.toLowerCase())) continue;
      taken.push(label);
      added.push(url ? { id: uid(), label, url } : { id: uid(), label });
    }
  }
  return { added, skipped };
}

const withoutUrl = ({ url: _u, ...rest }: Option): Option => (void _u, rest);
const withoutImage = ({ image: _i, imageId: _id, ...rest }: Option): Option => (void _i, void _id, rest);

function AddInline({
  placeholder, onAdd, max, onPastePhotos,
}: { placeholder: string; onAdd: (v: string) => boolean; max: number; onPastePhotos?: (items: Dropped[]) => void }) {
  const [v, setV] = useState("");
  const submit = () => {
    if (onAdd(v)) setV("");
  };
  return (
    <form
      className="flex w-full items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        className="input py-1 text-sm"
        placeholder={placeholder}
        maxLength={max}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onPaste={async (e) => {
          // A copied photo (not text) becomes a photo option.
          if (!onPastePhotos || ![...e.clipboardData.files].some((f) => f.type.startsWith("image/"))) return;
          e.preventDefault();
          onPastePhotos(await readTransfer(e.clipboardData));
        }}
        aria-label={placeholder}
      />
      <button type="submit" className="btn-ghost" disabled={!v.trim()}>Add</button>
    </form>
  );
}

/** A roomy card for one option: name, link, and dealbreaker status at a glance. */
function OptionCard({ d, update, optionId, onRemove }: Props & { optionId: string; onRemove: () => void }) {
  const o = d.options.find((x) => x.id === optionId)!;
  const [editingLink, setEditingLink] = useState(false);
  const [linkDraft, setLinkDraft] = useState(o.url ?? "");
  const [linkError, setLinkError] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(o.label);
  const [dragOver, setDragOver] = useState(false);
  const broken = brokenBy(d, o.id);
  const patchOption = (fn: (x: Option) => Option) => update({ options: d.options.map((x) => (x.id === o.id ? fn(x) : x)) });
  // A new photo gets a new upload id later, so drop the old one.
  const setPhoto = (dataUrl: string) => patchOption((x) => ({ ...withoutImage(x), image: dataUrl }));
  const saveName = () => {
    const v = nameDraft.trim().slice(0, 80);
    const taken = d.options.some((x) => x.id !== o.id && x.label.toLowerCase() === v.toLowerCase());
    if (v && !taken) patchOption((x) => ({ ...x, label: v }));
    else setNameDraft(o.label);
    setRenaming(false);
  };

  const saveLink = () => {
    const v = linkDraft.trim();
    const url = v ? safeUrl(v) : null;
    if (v && !url) return setLinkError(true);
    update({ options: d.options.map((x) => (x.id === o.id ? (url ? { ...x, url } : withoutUrl(x)) : x)) });
    setEditingLink(false);
    setLinkError(false);
  };

  return (
    <li
      className={`group relative flex min-h-28 flex-col justify-between gap-3 rounded-lg border bg-white p-4 transition ${
        dragOver ? "border-grape ring-2 ring-grape/20" : broken.length ? "border-coral/40" : "border-ink/10 hover:border-ink/25"
      }`}
      onDragOver={(e) => {
        if (!isUsefulDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation(); // this card, not the "add new options" area
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        const [first] = await readTransfer(e.dataTransfer);
        if (!first) return;
        if (first.kind === "photo") {
          patchOption((x) => ({ ...withoutImage(x), image: first.image, ...(first.url && !x.url ? { url: first.url } : {}) }));
          return;
        }
        // A dropped link becomes this option's link.
        const url = safeUrl(parseOptionText(first.text).url ?? first.text);
        if (url) patchOption((x) => ({ ...x, url }));
      }}
    >
      <button
        className="absolute top-2 right-2 rounded px-1.5 text-ink/30 hover:bg-ink/5 hover:text-ink"
        aria-label={`Remove option ${o.label}`}
        onClick={onRemove}
      >
        ✕
      </button>
      {(o.image || o.imageId) && (
        <div className="relative -mx-1 -mt-1">
          <OptionImage o={o} size="card" className={broken.length ? "opacity-50 grayscale" : ""} />
          <div className="absolute right-1.5 bottom-1.5 flex gap-1 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
            <PhotoPicker label={`Replace photo for ${o.label}`} onPhotos={([p]) => setPhoto(p)} className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium shadow-sm hover:bg-white">
              Replace
            </PhotoPicker>
            <button className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium shadow-sm hover:bg-white hover:text-coral" onClick={() => patchOption(withoutImage)}>
              Remove
            </button>
          </div>
        </div>
      )}
      {renaming ? (
        <input
          autoFocus
          className="input mr-6 py-1 font-display text-lg font-semibold"
          value={nameDraft}
          maxLength={80}
          aria-label={`Rename ${o.label}`}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveName();
            if (e.key === "Escape") {
              setNameDraft(o.label);
              setRenaming(false);
            }
          }}
        />
      ) : (
        <button
          className={`pr-6 text-left font-display text-lg font-semibold leading-snug decoration-dotted underline-offset-4 hover:underline ${broken.length ? "text-ink/40 line-through" : ""}`}
          title="Click to rename"
          aria-label={`${o.label}. Click to rename.`}
          onClick={() => {
            setNameDraft(o.label);
            setRenaming(true);
          }}
        >
          {o.label}
        </button>
      )}

      <div className="space-y-1.5">
        {editingLink ? (
          <form
            className="flex gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              saveLink();
            }}
          >
            <input
              autoFocus
              className={`input py-1 text-xs ${linkError ? "border-coral" : ""}`}
              placeholder="https://…"
              maxLength={500}
              value={linkDraft}
              onChange={(e) => {
                setLinkDraft(e.target.value);
                setLinkError(false);
              }}
              onKeyDown={(e) => e.key === "Escape" && setEditingLink(false)}
              aria-label={`Link for ${o.label}`}
            />
            <button type="submit" className="btn-ghost text-xs">Save</button>
          </form>
        ) : o.url ? (
          <div className="flex items-center gap-2">
            <OptionLink url={o.url} />
            <button className="text-xs text-ink/40 hover:text-ink" onClick={() => setEditingLink(true)}>Edit</button>
          </div>
        ) : (
          <span className="flex gap-3">
            <button className="text-xs font-medium text-ink/40 hover:text-grape" onClick={() => setEditingLink(true)}>
              🔗 Add link
            </button>
            {!o.image && !o.imageId && (
              <PhotoPicker label={`Add a photo to ${o.label}`} onPhotos={([p]) => setPhoto(p)} className="text-xs font-medium text-ink/40 hover:text-grape">
                📷 Add photo
              </PhotoPicker>
            )}
          </span>
        )}
        {linkError && <p className="text-xs text-coral">That doesn&apos;t look like a web link (http or https).</p>}
        {broken.length > 0 && (
          <p className="text-xs font-medium text-coral">🚫 Breaks: {broken.join(", ")}</p>
        )}
      </div>
    </li>
  );
}

export function DilemmaDetails({ d, update }: Props) {
  const [dropping, setDropping] = useState(false);
  const [dropNote, setDropNote] = useState<string | null>(null);
  const addDropped = (items: Dropped[]) => {
    const { added, skipped } = optionsFromDropped(d.options, items);
    if (added.length) update({ options: [...d.options, ...added] });
    setDropNote(
      skipped ? `Added ${added.length}; ${skipped} didn't fit (6 options max).` : added.length ? null : "Nothing new to add from that.",
    );
  };
  const hasData = (optionId: string) =>
    d.factors.some((f) => f.optionId === optionId && f.text.trim()) || !!d.scores[optionId] || !!d.fails[optionId] ||
    d.matrices.some((m) => m.pos[optionId]) || !!d.tree[optionId]?.length;

  return (
    <div className="card space-y-5 p-4">
      <div
        className={`relative -m-2 rounded-lg p-2 transition ${dropping ? "bg-grape-soft/40 outline-2 outline-dashed outline-grape" : ""}`}
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
          addDropped(await readTransfer(e.dataTransfer));
        }}
      >
        {dropping && (
          <div className="pointer-events-none absolute inset-x-0 top-1 z-20 text-center text-xs font-semibold text-grape">
            Drop photos or links to add options
          </div>
        )}
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">
          Options <span className="font-normal normal-case tracking-normal text-ink/35">· drag in photos or links</span>
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {d.options.map((o) => (
            <OptionCard
              key={o.id}
              d={d}
              update={update}
              optionId={o.id}
              onRemove={() => {
                if (!hasData(o.id) || confirm(`Remove “${o.label}”? Its pros, cons, and ratings will be deleted.`)) {
                  update(removeOption(d, o.id));
                }
              }}
            />
          ))}
          {d.options.length < 6 && (
            <li className="flex min-h-28 flex-col justify-center gap-2 rounded-lg border border-dashed border-ink/20 p-4">
              <span className="text-sm text-ink/50">
                {d.options.length === 0 ? "No options yet. You're gathering opinions." : d.options.length === 1 ? "Add one more to compare." : "Another option?"}
              </span>
              <PhotoPicker
                multiple
                label="Add photos as options"
                className="text-xs font-medium text-ink/50 hover:text-grape"
                onPhotos={(photos) => {
                  const room = 6 - d.options.length;
                  const taken = d.options.map((x) => x.label);
                  const added = photos.slice(0, room).map((image) => {
                    const label = nextPhotoLabel(taken);
                    taken.push(label);
                    return { id: uid(), label, image };
                  });
                  if (photos.length > room) alert(`Only ${room} more option${room === 1 ? "" : "s"} fit (6 max).`);
                  update({ options: [...d.options, ...added] });
                }}
              >
                📷 Add photos as options
              </PhotoPicker>
              <AddInline
                placeholder="Add an option or paste a link"
                max={600}
                onPastePhotos={addDropped}
                onAdd={(v) => {
                  const p = addOption(d, v);
                  if (p) update(p);
                  return !!p;
                }}
              />
            </li>
          )}
        </ul>
        {dropNote && <p className="mt-2 text-xs text-ink/50">{dropNote}</p>}
      </div>

      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">Dealbreakers</h2>
        <div className="flex flex-wrap items-center gap-2">
          {d.dealbreakers.map((b) => (
            <span key={b.id} className="chip gap-1 border-coral/30 bg-coral-soft/50 pr-1">
              🚫 {b.text}
              <button
                className="rounded px-1 text-ink/40 hover:bg-ink/5 hover:text-ink"
                aria-label={`Remove dealbreaker ${b.text}`}
                onClick={() => {
                  const fails = Object.fromEntries(
                    Object.entries(d.fails).map(([oid, m]) => {
                      const { [b.id]: _x, ...rest } = m;
                      void _x;
                      return [oid, rest];
                    }),
                  );
                  update({ dealbreakers: d.dealbreakers.filter((x) => x.id !== b.id), fails });
                }}
              >
                ✕
              </button>
            </span>
          ))}
          {d.dealbreakers.length === 0 && <span className="text-sm text-ink/50">None.</span>}
          {d.dealbreakers.length < 6 && (
            <div className="w-full max-w-xs">
            <AddInline
              placeholder="Add a dealbreaker"
              max={100}
              onAdd={(v) => {
                const t = v.trim();
                if (!t || d.dealbreakers.some((b) => b.text.toLowerCase() === t.toLowerCase())) return false;
                update({ dealbreakers: [...d.dealbreakers, { id: uid(), text: t }] });
                return true;
              }}
            />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** One option's pass/fail against one dealbreaker. The same data shows up in every tool. */
export function DealbreakerToggle({
  d, update, optionId, dealbreakerId,
}: Props & { optionId: string; dealbreakerId: string }) {
  const failed = !!d.fails[optionId]?.[dealbreakerId];
  const b = d.dealbreakers.find((x) => x.id === dealbreakerId);
  const o = d.options.find((x) => x.id === optionId);
  return (
    <button
      aria-pressed={failed}
      aria-label={`${o?.label} ${failed ? "breaks" : "is OK with"} “${b?.text}”. Click to toggle.`}
      className={`rounded-md border px-2 py-0.5 text-xs font-medium transition ${
        failed ? "border-coral/40 bg-coral-soft text-coral" : "border-ink/15 bg-white text-ink/60 hover:border-ink/30"
      }`}
      onClick={() =>
        update({ fails: { ...d.fails, [optionId]: { ...d.fails[optionId], [dealbreakerId]: !failed } } })
      }
    >
      {failed ? "✗ Breaks it" : "✓ OK"}
    </button>
  );
}
