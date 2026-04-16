# Separation Agent

An expert artwork separator for screen printing — built and trained by the Craft MFG team.

## What it is

A standalone web app where Craft MFG team members upload three files for every separation job:

1. **Customer file** — the original art the client sent us
2. **Mockup** — what we showed the client
3. **Separation** — the high-res, print-ready separation we produced

Over time, the agent learns how Craft separates art and becomes able to:

- Critique a new separation against the original art
- Flag problem areas before they hit the press
- Eventually propose separations on its own for new client files
- **Generate mockups** from HQ Print job specs (garment color, print size, print location, ink colors) on Craft's house templates

## Who uses it

- **Trainers** (Craft staff) — drop in past jobs, tag them, review the agent's critique, correct it when wrong
- **Operators** (any team member) — drop in a new client file, get back a written analysis of how to approach the separation
- **Eric** — admin, owns the Drive folder, owns the model

## Status

✅ **Phase 1 + 1.5 scaffold — runnable locally with mock data.**

Branch: `phase-1-scaffold`. Every page renders, critique flow works (with stub responses), mockup generator produces real PNGs. Wire real Google/Anthropic creds to go live — see `SETUP.md`.

## Quick start (local dev)

```bash
npm install
npm run db:push        # create SQLite schema at ./local.db
npm run db:seed        # 6 realistic past jobs, 23 tags, 2 templates
npm run dev            # http://localhost:3000 (or :3001 if HQ Print is running)
```

No env vars needed for mock mode — the app auto-detects missing keys and stubs Drive / Anthropic / Google auth. An orange banner across the top reminds you.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript strict check |
| `npm run db:push` | Create/update SQLite schema |
| `npm run db:seed` | Wipe + reseed mock data |
| `npm run db:studio` | Drizzle Studio (visual DB browser) |
| `npm run ban-drive-writes` | CI safety check — fails if Drive write APIs appear in code |

## Read these first

- [PLAN.md](./PLAN.md) — full architecture and roadmap
- [TRAINING.md](./TRAINING.md) — how the team trains the agent (plain English)
- [SAFETY.md](./SAFETY.md) — how Google Drive stays untouched
- [SETUP.md](./SETUP.md) — what Eric needs to do before the app can run

## Stack (in place)

- Next.js 15 (App Router) + TypeScript + Tailwind — ✅ built
- SQLite (local dev) → Postgres (production) via Drizzle ORM — ✅ schema + seeds
- NextAuth (Google login for team) — ✅ scaffolded, not active in mock mode
- Google Drive API — **read-only scope, folder-scoped** — ✅ wrapper + guard + audit
- Anthropic SDK (Claude with vision) + prompt caching — ✅ wired, with mock fallback
- Sharp (server-side image compositing for mockup generator) — ✅ working

## Sister projects

- [HQ Print](../hq-print) — internal shop OS
- [Ink Lab](../ink-lab) — ink formula management
