# DecisionLab

**Overthink it, but make it fun.** Describe a dilemma once (options and dealbreakers optional), weigh it with Pros & Cons or a Weighted Comparison, send it out for Peer Review by friends, and record your conclusion.

## Core task (v1)

1. **Describe it once.** The landing page asks for the dilemma, then options (optional: paste a Zillow or restaurant link and it's named for you), then dealbreakers (optional).
2. **Think it through.** *Pros & Cons* with importance (●/●●/●●●), or a *Weighted Comparison* of criteria and 1–5 ratings. Options and dealbreakers are shared by every tool. Mark an option as breaking a dealbreaker once, and it's ruled out everywhere.
3. **Ask others with Peer Review.** Share a link, no sign-up needed. With options, friends vote and leave comments. Without options, they share opinions, and you can turn a suggestion into an option with one click. The live link picks up your edits automatically.
4. **Findings.** A playful, clearly **nonbinding** lab-report summary of whether your own analysis and your peers agree.
5. **Your conclusion.** See where each method landed, pick an option, and add a note for future you.

## Architecture

| Piece | Where it lives | Why |
|---|---|---|
| Dilemmas, pros/cons, criteria, outcome | Browser `localStorage` | No login for v1; private reasoning never leaves your device |
| Peer Review polls and responses | `/api/polls/*` → Supabase (or in-memory fallback) | Has to be shared across people |

- Share links use 128-bit random tokens, so they can't be guessed.
- Only the question, options (with links), and, if you allow it, dealbreakers are sent to the server. Pros, cons, and ratings stay local.
- Only the creator can edit a live poll: creating one returns a private owner key, and only its SHA-256 hash is stored.
- Option links must be `http(s)`. They are checked on the server and again before display.
- One vote per browser per poll (an anonymous random voter id). Re-voting replaces the earlier vote. `voter_id` is never returned by the API.
- Inputs are validated server-side, and each IP is rate-limited (best-effort, per instance).
- Supabase has **RLS enabled with no policies**, so the public key can't touch the tables. Only the server, using the secret key, can.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

With no env vars set, polls are kept in memory. That's fine for local use, but they reset on restart.

## Persist polls with Supabase (needed for a real deploy)

1. Create a free Supabase project.
2. Run the files in [`supabase/migrations/`](supabase/migrations/) (`001`, then `002`) in the SQL editor.
3. Copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (Project Settings → API keys → secret key). **Never** prefix them with `NEXT_PUBLIC_`.
4. Add the same two variables in Vercel → Project → Settings → Environment Variables.

## Deploy

```bash
npx vercel        # preview
npx vercel --prod
```

## Security checklist

- [x] Keys only in env vars; `.env*` is gitignored (except `.env.example`).
- [x] `.claude/settings.json` denies agent reads and edits of `.env` files.
- [x] RLS on for `polls` and `votes`.
- [ ] Run `/security-review` before sharing the link.
