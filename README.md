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

🚧 **Scaffolding phase** — docs and folder skeleton only. No code yet.

Branch: `scaffold/initial-plan`

## Read these first

- [PLAN.md](./PLAN.md) — full architecture and roadmap
- [TRAINING.md](./TRAINING.md) — how the team trains the agent (plain English)
- [SAFETY.md](./SAFETY.md) — how Google Drive stays untouched
- [SETUP.md](./SETUP.md) — what Eric needs to do before the app can run

## Stack (planned)

- Next.js 15 (App Router) + TypeScript + Tailwind
- Vercel (hosting) + Vercel Postgres (or Neon)
- NextAuth (Google login for team)
- Google Drive API — **read-only scope, folder-scoped**
- Anthropic SDK (Claude with vision) + prompt caching

## Sister projects

- [HQ Print](../hq-print) — internal shop OS
- [Ink Lab](../ink-lab) — ink formula management
