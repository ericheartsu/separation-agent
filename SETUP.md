# Setup Checklist — Things Eric Needs To Do

Tomorrow morning, before Claude can write actual code for this app, you'll need to set a few things up. None of these are hard — most are clicking through web UIs.

Estimated time: **~45 minutes total** if you go through it in order.

---

## 1. Google Cloud project (10 min)

We need a Google Cloud project so the app can talk to Drive.

1. Go to https://console.cloud.google.com
2. Click the project dropdown (top left) → **New Project**
3. Name it: `separation-agent`
4. Hit **Create**, wait, then switch into it
5. Left menu → **APIs & Services** → **Library**
6. Search for **"Google Drive API"** → click **Enable**
7. Left menu → **APIs & Services** → **OAuth consent screen**
   - User type: **Internal** (since you're on Google Workspace)
   - App name: `Separation Agent`
   - Support email: eric@craft-mfg.com
   - Hit **Save and Continue** through the rest
8. Left menu → **APIs & Services** → **Credentials**
   - **Create Credentials** → **OAuth client ID**
   - Application type: **Web application**
   - Name: `Separation Agent Web`
   - Authorized redirect URIs: leave blank for now, we'll fill in once we have a Vercel URL
   - Hit **Create**
   - **Save the Client ID and Client Secret** somewhere safe (you'll paste them into the app later)

---

## 2. Designate the Drive folder (2 min)

1. Go to Google Drive
2. Create a new folder at the root: **`Separation Agent Training`**
3. Right-click → **Get link** → **Copy link**
4. From that link, grab the folder ID (the long string after `folders/` in the URL)
5. Save the folder ID alongside your OAuth credentials

Optional but recommended: inside that folder, create the structure:
```
Separation Agent Training/
├── Past Jobs/
│   ├── 2024/
│   ├── 2025/
│   └── 2026/
├── Templates/           ← garment mockup templates go here
└── Generated Mockups/   ← Phase 1.5 output (created by app)
```

---

## 3. Anthropic API key (3 min)

1. Go to https://console.anthropic.com
2. Use the existing Craft MFG account (same one HQ Print uses)
3. **API Keys** → **Create Key**
4. Name: `separation-agent-prod`
5. **Save the key** — you can't view it again after closing the dialog
6. (Optional) Set a monthly budget alert at, say, $200/mo until we know real usage

---

## 4. Database (5 min)

Two options:

**Option A — Neon (recommended, free tier is plenty for Phase 1):**
1. Go to https://neon.tech
2. Sign in with Google
3. New Project → name `separation-agent`
4. Region: closest to you (probably US East)
5. Copy the connection string

**Option B — Vercel Postgres:**
1. We'll set this up from the Vercel dashboard once the app is deployed (skip for now)

---

## 5. Vercel project (5 min, do this AFTER first commit is pushed)

1. Push the repo to GitHub (Claude will help — see below)
2. Go to https://vercel.com → **Add New** → **Project**
3. Import the GitHub repo
4. Framework: **Next.js** (auto-detected)
5. Don't deploy yet — we need to add env vars first
6. Settings → Environment Variables — add:

   ```
   GOOGLE_CLIENT_ID=<from step 1>
   GOOGLE_CLIENT_SECRET=<from step 1>
   GOOGLE_DRIVE_ROOT_FOLDER_ID=<from step 2>
   ANTHROPIC_API_KEY=<from step 3>
   DATABASE_URL=<from step 4>
   NEXTAUTH_SECRET=<generate one with: openssl rand -base64 32>
   NEXTAUTH_URL=https://<your-vercel-url>
   ```

7. **Deploy**
8. Copy the deployed URL → go back to **Google Cloud Console → Credentials → your OAuth client → Authorized redirect URIs**, add:
   ```
   https://<your-vercel-url>/api/auth/callback/google
   ```

---

## 6. Push the repo to GitHub (5 min)

When you wake up, ask Claude to:
- Create a new GitHub repo named `separation-agent` under your account
- Push the `scaffold/initial-plan` branch
- Open a PR for review (so the docs get a code-review pass before going to main)

---

## 7. Team access list (you decide)

Before Claude builds the auth/login pages, decide:

- **Admins** (full access, manage templates, see audit log): Eric + ?
- **Trainers** (add jobs, correct critiques, drop tags): names + Google emails
- **Operators** (read library, run mockups, run analyses): names + Google emails

---

## You're done with setup when you have:

- [ ] Google Cloud Client ID + Secret
- [ ] Drive root folder ID
- [ ] Anthropic API key
- [ ] Postgres connection string
- [ ] (Once code exists) Vercel project deployed with all env vars
- [ ] Team access list ready
- [ ] Answers to the open questions in PLAN.md

Once those are in hand, Claude can start building Phase 1 for real.
