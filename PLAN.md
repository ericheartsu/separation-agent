# Separation Agent — Architecture & Roadmap

## Goal

Build an in-house expert system that learns how Craft MFG separates artwork for screen printing, then helps the team review (and eventually produce) separations for new jobs.

---

## High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Team browser (any device)                 │
│   Login w/ Google · Drop files · Tag · Review · Correct      │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────┐
│            Separation Agent web app (Next.js / Vercel)       │
│                                                              │
│  ┌──────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │  UI / API    │→ │ Job ingest     │→ │ Vision pipeline│  │
│  │  routes      │  │ (queue worker) │  │ (Claude API)   │  │
│  └──────┬───────┘  └────────┬───────┘  └────────┬───────┘  │
│         │                   │                    │          │
│         ▼                   ▼                    ▼          │
│   ┌──────────────────────────────────────────────────┐      │
│   │     Postgres DB                                   │      │
│   │     · jobs · files (Drive IDs) · tags             │      │
│   │     · critiques · corrections · embeddings        │      │
│   └──────────────────────────────────────────────────┘      │
└────┬─────────────────────────────────────┬───────────────────┘
     │ READ-ONLY OAuth                      │ Anthropic API
     ▼                                      ▼
┌─────────────────┐                   ┌──────────────────┐
│  Google Drive   │                   │  Claude (vision) │
│  /Separation    │                   │  Opus 4.6 + cache│
│   Agent/        │                   └──────────────────┘
│  (folder-scoped)│
└─────────────────┘
```

**Originals never leave Drive. Generated outputs never go back to Drive.**

---

## Stack decisions

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Same as HQ Print — Eric's team already familiar |
| Language | TypeScript | Type safety for Drive/AI integration code |
| Hosting | Vercel | Same pipeline as HQ Print, no new infra |
| DB | Vercel Postgres or Neon | Serverless, low ops |
| ORM | Drizzle | Lightweight, matches HQ Print pattern |
| Auth | NextAuth (Google provider) | Team logs in with their Craft Google account |
| File storage | Google Drive (read-only API) | Originals stay where they are |
| Previews | Sharp / `psd.js` server-side | Flatten PSD/AI to PNG for vision |
| Background jobs | Vercel Queues or Inngest | Ingestion shouldn't block UI |
| AI | Anthropic SDK, Claude Opus 4.6 (vision) | Best vision model + prompt caching for the reference library |

---

## Data model (initial)

```
Tenant            // future-proofed for Phase 5 (other shops)
  id, name, drive_root_folder_id

User
  id, email, name, role (admin/trainer/operator)

Job                                  // one separation case study
  id, tenant_id, customer_name, job_name, po_number
  garment_color, color_count, print_method
  difficulty (1-5), notes, created_by, created_at

JobFile                              // 3 per job: customer / mockup / sep
  id, job_id, kind (CUSTOMER|MOCKUP|SEPARATION)
  drive_file_id, drive_file_name, mime_type, byte_size
  preview_url (in our blob storage), preview_generated_at

Tag                                  // taxonomy of separation challenges
  id, name, category
  // e.g. category=technique: halftones, gradients, sim-process, spot
  //      category=problem:   moire-risk, fine-line-loss, registration

JobTag
  job_id, tag_id

Critique                             // agent's analysis of a job
  id, job_id, model_version, prompt_version
  text, structured_findings (JSON), created_at

Correction                           // trainer feedback on a critique
  id, critique_id, user_id
  verdict (correct/wrong/partial)
  what_agent_missed, what_agent_got_wrong
  created_at

JobEmbedding                         // for similarity search later
  id, job_id, embedding (vector)
```

---

## Phases

### Phase 1 — Reference library + reviewer agent (MVP)

**Scope:**
- Auth (Google login, role per user)
- Drive folder configuration (admin sets the root folder)
- "Add new job" form (3 file pickers, tags, notes)
- Background job ingests files: pulls from Drive, generates flat PNG previews, stores in DB
- Job detail page: side-by-side viewer of customer/mockup/sep
- "Run critique" button: Claude analyzes the triplet, writes a critique
- Trainers can mark critiques correct/wrong + add what was missed
- Job library (search by tag, customer, technique)

**Done when:** Eric can drop in 20+ past jobs, see real critiques, and correct them.

### Phase 1.5 — Mockup Generator (NEW — added by Eric)

**Why this fits:** mockup generation is *much* easier than full separation. Templates are repeatable, art just needs compositing onto the right garment at the right size/location. It also dovetails with the agent's vision training — once it can both *make* a mockup and *critique* a mockup, it's learning the full pipeline.

**Scope:**
- Pull job specs from HQ Print via API: garment style + color, print size, print location(s), ink colors, print method
- Pull the customer-supplied art (or a working file the operator points to)
- Composite the art onto Craft's mockup template for that garment style
  - Apply garment color
  - Place art at correct size + print location (chest, full front, sleeve, back, etc.)
  - Color-shift art to use the specified ink colors
  - Multi-location support (e.g. front + back + sleeve in one mockup)
- Output: a flat PNG/PDF mockup ready to send to client
- Save back to the job in HQ Print (or just to a Drive folder — Eric's call)

**HQ Print integration:**
- New endpoint in HQ Print: `GET /api/jobs/:id/mockup-spec` → returns garment, colors, print spec JSON
- Separation Agent reads that spec, never writes back to HQ DB
- Generated mockup either: (a) attached to HQ job via existing file-upload endpoint, or (b) dropped into the job's Drive folder (read+write to a *specific* "Mockups" subfolder only — see SAFETY.md for scope expansion notes)

**Template system:**
- Each garment style needs a mockup template (PSD or PNG with a marked print zone)
- Admin UI: upload template, define print zones (chest, full front, sleeve, etc.) by drawing rectangles on the template
- Templates live in DB with the print-zone coordinates

**Tech approach:**
- Server-side compositing with Sharp (Node) — fast, no Photoshop required
- Color shifting via `sharp().linear()` or LUT for ink color application
- For garment color: pre-rendered template variants per color (cleanest) OR overlay blend mode (flexible but lower quality)
- Stretch: fabric-aware compositing using a displacement map per template (gives the art that "follows the wrinkles" look)

**Data model additions:**

```
GarmentTemplate
  id, garment_style_sku, name
  base_image_url, mask_image_url (where art goes)
  displacement_map_url (optional, for fabric realism)

PrintZone
  id, template_id, name (chest/full-front/sleeve-left/etc.)
  x, y, width, height, rotation
  max_print_width_in, max_print_height_in
  pixels_per_inch (so we can scale art correctly)

GeneratedMockup
  id, hq_job_id, template_id
  zones (JSON: which art went in which zone, what colors, what size)
  output_url, generated_at, generated_by
```

**Done when:** team can take an HQ Print job, click "Generate Mockup," and get back a usable mockup that matches Craft's house style 80%+ of the time without touching Photoshop.

---

### Phase 2 — Issue spotting on new client art

**Scope:**
- "Analyze new art" page: drop a single client file
- Agent retrieves the 5–10 most similar past jobs (embedding search)
- Returns: predicted color count, predicted technique, list of likely problem areas, references to past jobs that taught it those lessons
- Trainer can mark predictions accurate/inaccurate

**Done when:** the agent's predictions match Craft's separator's intuition ≥70% of the time on a held-out set.

### Phase 3 — Photoshop action / instruction generation

**Scope:**
- Agent outputs a step-by-step separation plan formatted as:
  - Color palette to extract
  - Underbase strategy
  - Halftone angle/LPI per color
  - Trap/choke recommendations
  - Order of operations
- (Stretch) Generate a PS JSX action script the separator can run

**Done when:** the separator can follow the agent's plan and produce a usable starting point in PS.

### Phase 4 — Semi-automated separations

**Scope:**
- For well-understood job types, agent produces a draft separation directly
- Always reviewed by a human before press
- Limited to specific job archetypes the library covers densely

**Done when:** for the easiest 20% of incoming jobs, the agent's draft is the starting point.

### Phase 5 — Multi-tenant (other shops)

Per `feedback_craft_first` — Craft pilot first, multi-tenant rollout later.

---

## Drive safety design (see SAFETY.md for full detail)

Three layers:

1. **OAuth scope:** `https://www.googleapis.com/auth/drive.readonly` — Google itself blocks any write/delete with this scope.
2. **Folder scope:** App is configured with a single root folder ID. All file IDs are validated against that subtree before any read.
3. **Code shape:** No `drive.files.update`, `delete`, `move`, or `create` calls exist anywhere in the codebase. PR check enforces this.

---

## Cost model (rough)

- **Vercel:** ~$20/mo (Pro plan, same as HQ Print)
- **Postgres:** ~$10–25/mo
- **Anthropic API:** depends on usage. With prompt caching on the reference library:
  - Critique of one job: ~$0.05–0.20 (vision input + text out)
  - Library context cached → second+ call same hour is ~10x cheaper
  - 50 jobs/day analyzed = ~$3–10/day
- **Google Drive API:** free at our scale

---

## Open questions for Eric

1. **Drive folder structure** — does each job already have a folder in Drive with the 3 files together, or are they scattered? Affects ingestion UX.
2. **Existing past jobs** — how many separations do we have to seed the library? 50? 500? 5,000?
3. **Who's on the trainer team** — names + Google emails for initial access list
4. **Job naming convention** — is there a customer/PO format we can auto-parse from filenames or folder names?
5. **PS file flattening** — are sep files always PSDs with channels, or sometimes flat TIFFs? Affects preview pipeline.
6. **Mockup template inventory** — do we already have PSD/PNG templates per garment style? How many garment styles need a template Day 1?
7. **Mockup output destination** — back into HQ Print as an attachment, or into Drive only, or both?
8. **Garment color rendering** — do we want pre-rendered template-per-color (cleanest, more storage) or live color overlay (flexible, slightly lower quality)?
