# Build Status — Overnight Phase 1 + 1.5 Scaffold

**Branch:** `phase-1-scaffold`
**Date:** 2026-04-16 (built overnight 04-15 → 04-16)
**Result:** ✅ runnable locally with mock data

---

## What's working (in mock mode, no creds needed)

### Training pipeline
- ✅ Dashboard with live stats from DB (jobs, critiques, corrections, mockups)
- ✅ Job library with search + filter (by customer, tag, print method)
- ✅ Add Past Job form: customer + job + garment spec + difficulty + notes + tags
- ✅ Mock Drive file picker (3 files per job — customer/mockup/separation)
- ✅ Job detail page with side-by-side viewer
- ✅ Overlay view with opacity slider (mockup vs. separation comparison)
- ✅ Pin-drop annotation tool on artwork (problem area tagging)
- ✅ Critique panel: "Run Critique" button → generates structured analysis
- ✅ Correction UI: ✅ / ⚠️ / ❌ verdicts + free-text missed/wrong feedback
- ✅ Previous corrections displayed with trainer name + timestamp

### Mockup generator (Phase 1.5)
- ✅ Template picker (Bella+Canvas 3001 tee, Independent SS4500 hoodie — pre-seeded synthetic templates)
- ✅ Print zone selector per template
- ✅ Garment color picker (hex + color wheel)
- ✅ Ink color palette picker (9 common inks pre-wired)
- ✅ HQ Print job # field (ready to wire to HQ API)
- ✅ Real Sharp-based compositor produces actual PNG output
- ✅ Generated mockups list with history

### Admin
- ✅ Garment templates list + detail view with print zone overlay
- ✅ Drive audit log with refused/successful reads + filters
- ✅ Team roster page (3 seeded users: Eric/admin, Val/trainer, Separator/trainer)
- ✅ Settings page with integration status

### Safety (all 4 layers of SAFETY.md)
- ✅ Layer 1: NextAuth config requests `drive.readonly` only
- ✅ Layer 2: `assertWithinRoot()` guard walks ancestor chain before any read
- ✅ Layer 3: `scripts/ban-drive-writes.mjs` — CI grep check, passing
- ✅ Layer 4: audit log table + admin view

---

## What's NOT working yet (blocked on Eric's setup)

- ❌ Real Google login — needs OAuth Client ID + Secret (`SETUP.md` step 1)
- ❌ Real Drive reads — needs `GOOGLE_DRIVE_ROOT_FOLDER_ID` (`SETUP.md` step 2)
- ❌ Real Claude critiques — needs `ANTHROPIC_API_KEY` (`SETUP.md` step 3)
- ❌ Production Postgres — needs Neon/Vercel connection string (`SETUP.md` step 4)
- ❌ Vercel deploy — needs GitHub push first (`SETUP.md` step 5)
- ❌ Real garment templates — currently using synthetic SVG placeholders
- ❌ HQ Print integration — `GET /api/jobs/:id/mockup-spec` endpoint needs to land in HQ Print repo

The minute env vars are set, mock mode auto-disables (or force with `MOCK_MODE=false`).

---

## Verification performed

```
npm install          → 487 packages, 0 errors
npm run db:push      → schema applied
npm run db:seed      → 6 jobs, 23 tags, 2 templates, 3 users, 3 audit entries
npm run typecheck    → 0 errors
npm run build        → 11 routes built, 0 errors
npm run ban-drive-writes → 0 violations

Runtime probe (all 12 routes + 2 API POSTs):
  200  /
  200  /jobs
  200  /jobs/new
  200  /jobs/{id}
  200  /mockups
  200  /mockups/new
  200  /admin/templates
  200  /admin/templates/{id}
  200  /admin/drive-audit
  200  /admin/users
  200  /admin/settings
  200  /analyze
  200  /api/synthetic-template  (PNG output)
  200  /api/mock-preview         (SVG output)
  200  POST /api/mockups/generate (20KB PNG data URL)
  200  POST /api/jobs/{id}/critique (mock critique saved to DB)
```

---

## File count

```
app/             16 pages + 8 API routes
components/      2 (Nav, UI primitives)
lib/
  db/           schema.ts + index.ts
  claude/       client.ts + critique.ts (with mock fallback)
  drive/        client.ts + guard.ts + audit.ts
  mockup/       compositor.ts + synthetic-template.ts
  auth.ts       NextAuth config
  utils.ts      formatting, mock-mode detection
scripts/
  seed.ts                    realistic seed data
  ban-drive-writes.mjs       CI safety guard
docs/            (reserved)
training-data/   (gitignored — local cache only)
```

---

## Open decisions for Eric (carried from PLAN.md)

1. Drive folder layout — do past jobs already group customer/mockup/sep?
2. How many past separations to seed the library?
3. Trainer + operator team list (Google emails)
4. Mockup output destination: HQ Print attachment, Drive, or both?
5. Garment template source format: PSD or PNG?
6. Garment color: pre-rendered per-color or live overlay?

Answer these and Phase 1 → production is ~1-2 working sessions away.
