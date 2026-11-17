# DecisionLab

**Overthink it, but make it fun.** Describe a dilemma once, look at it through several lenses (pros & cons, a weighted comparison, 2×2 matrices, a decision tree), send it out for peer review by friends, and record your conclusion. DecisionLab helps you see your tradeoffs. It never claims to know the right answer.

- **Live prototype:** https://decisionlab-lac.vercel.app
- **Project proposal:** https://decisionlab-lac.vercel.app/proposal.html ([source](public/proposal.html))

## Core task (v1)

1. **Describe it once.** The landing page asks three short questions: the dilemma, your options, and any dealbreakers. Options and dealbreakers are both optional. Nothing is pre-filled, and suggestions are tap-to-add chips.
   - Options can be typed, **pasted links** (a Zillow or restaurant URL is named for you), or **photos**, for choices you judge by eye, like outfits.
   - **Drag photos or links** in from another tab, or paste a copied photo.
2. **Think it through.** Every tool reads the same options and dealbreakers, so nothing is entered twice. Mark an option as breaking a dealbreaker once, and it's ruled out in every tool.
3. **Ask others with Peer Review.** Share a link, no sign-up needed. With options, friends vote (photo options show as big cards) and leave comments. Without options, they share opinions, and you can turn a suggestion into an option with one click. The live link picks up your edits automatically.
4. **Findings.** A playful, clearly **nonbinding** lab-report summary of whether your own analysis and your peers agree: "Replicated!", "Inconclusive", "Conflicting results".
5. **Your conclusion.** See where every method landed side by side, pick an option, and add a note for future you.

### The tools

| Tool | What you do | What it gives you |
|---|---|---|
| **Pros & Cons** | List good and bad points per option, marked minor (●), matters (●●), or big deal (●●●) | A net score per option |
| **Weighted** | Pick criteria, set how much each matters, and rate each option 1–5 | % of the best possible score |
| **2×2 Matrix** | Drag options onto two axes (presets or your own). Rename any label, and make several grids to compare different variables | A quadrant per option, plus an overall standing across grids |
| **Decision Tree** | Break each option down to any depth (*Cost → Short term → Adoption fees*). Any branch can be a **what if** (chance %) and/or have a **feeling** (😫 −2 … 🤩 +2) | Scores that roll up the tree: what-if siblings by chance, categories by plain average |
| **Peer Review** | Share a link with friends | Live votes or opinions, with comments |

## Architecture

| Piece | Where it lives | Why |
|---|---|---|
| Dilemmas, options, every tool's data, conclusion | Browser `localStorage` | No login for v1, and private reasoning never leaves your device |
| Option photos | Shrunk in the browser (≤ 900 px JPEG); stored locally | Small enough for browser storage |
| Peer Review polls and responses | `/api/polls/*` → Supabase Postgres (or in-memory fallback) | Has to be shared across people |
| Shared option photos | `/api/images/*` → Supabase Postgres (or in-memory fallback) | Uploaded only when you share for peer review |

```
src/
  app/
    page.tsx                 landing page + "describe it once" wizard
    d/[id]/                  the dilemma workspace (tools, details panel, conclusion)
    j/[token]/               the reviewer's voting page
    api/polls/               create, read, update (creator only), and vote
    api/images/              upload and serve shared option photos
  components/                one file per tool, plus shared UI
  lib/                       types, scoring (analysis.ts, tree.ts), links, photos, drag & drop
  lib/server/                poll and photo storage, validation, rate limiting
supabase/migrations/         001 polls & votes · 002 open polls, dealbreakers, owner keys · 003 images
public/proposal.html         the project proposal page
```

### Security and privacy

- **Unguessable ids.** Share links are 128-bit random tokens, and photo ids are 144-bit.
- **Only what reviewers need goes to the server:** the question, options (with links and photos), and dealbreakers only if you allow it. Pros, cons, ratings, matrices, and trees stay local.
- **Only the creator can edit a live poll.** Creating one returns a private owner key, and only its SHA-256 hash is stored.
- **Links must be `http(s)`.** They're checked on the server and again before display, so `javascript:` links can't run.
- **Photos must really be JPEG, PNG, or WebP.** The server checks the file's actual contents, not its name, so SVG or HTML disguised as an image is rejected. Size is capped. Photos are served with `nosniff` and a sandboxing Content-Security-Policy.
- **One vote per browser per poll**, using an anonymous random voter id. Re-voting replaces the earlier vote, and `voter_id` is never returned by the API.
- **Inputs are validated on the server**, and creates, edits, votes, and uploads are rate-limited per IP (best-effort, per instance).
- **Supabase has RLS enabled with no policies** on `polls`, `votes`, and `images`, so the public key can't touch them. Only the server, using the secret key, can.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

With no env vars set, polls and shared photos are kept in memory. That's fine for local use, but they reset when the server restarts, and links only work on your own computer. Share links from the live site, not `localhost`.

## Persist polls with Supabase (needed for a real deploy)

1. Create a free Supabase project.
2. Run the files in [`supabase/migrations/`](supabase/migrations/) in order (`001`, `002`, `003`) in the SQL editor.
3. Copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (Project Settings → API keys → secret key). **Never** prefix them with `NEXT_PUBLIC_`.
4. Add the same two variables in Vercel → Project → Settings → Environment Variables (Production and Preview).

## Deploy

The Vercel project is connected to this repository, so every push to `main` deploys to production. To deploy by hand:

```bash
npx vercel        # preview
npx vercel --prod
```

## Security checklist

- [x] Keys only in env vars; `.env*` is gitignored (except `.env.example`).
- [x] `.claude/settings.json` denies agent reads and edits of `.env` files.
- [x] RLS on for `polls`, `votes`, and `images`; Supabase security advisor shows no issues beyond the intended "RLS enabled, no policies".
- [x] Free tiers only; no paid APIs or model calls.
- [ ] Run `/security-review` before sharing the link.
