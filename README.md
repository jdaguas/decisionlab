# DecisionLab

**Overthink it, but make it fun.** Enter a dilemma, weigh it with Pros & Cons or a Weighted Comparison, put it before a Friend Jury, and record what you decided.

## Core task (v1)

1. **Create a dilemma:** a question plus 2–6 options (or start from an example).
2. **Think It Through:** Pros & Cons with importance (●/●●/●●●), or a Weighted Comparison where you set criteria, weights, and dealbreakers. An option rated 1 on a dealbreaker is ruled out.
3. **Settle This:** convene a Friend Jury and copy the link. Friends vote on their phones, no sign-up, and can leave a short "closing argument."
4. **Verdict:** a playful, clearly **nonbinding** verdict comparing the jury with your own analysis.
5. **Make the call:** see where each method landed, pick an option, and add a note for future you.

## Architecture

| Piece | Where it lives | Why |
|---|---|---|
| Dilemmas, pros/cons, criteria, outcome | Browser `localStorage` | No login for v1; private reasoning never leaves your device |
| Friend Jury polls and votes | `/api/polls/*` → Supabase (or in-memory fallback) | Has to be shared across people |

- Share links use 128-bit random tokens, so they can't be guessed.
- Only the question and options are sent to the server. Pros, cons, and ratings stay local.
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
2. Run [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) in the SQL editor.
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
