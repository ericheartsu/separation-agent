# Drive Safety Guarantees

The Craft MFG Google Drive is the company's source of truth. The Separation Agent must never overwrite, delete, move, or rename anything in it.

This doc explains the **three independent layers** that make that guarantee enforceable, not just promised.

---

## Layer 1 — OAuth scope (the technical lock)

When the app authenticates with Google Drive, it requests **only** this scope:

```
https://www.googleapis.com/auth/drive.readonly
```

This is a Google-enforced permission boundary. With this scope:

- ✅ The app can list files
- ✅ The app can download file contents
- ✅ The app can read file metadata
- ❌ The app **cannot** create files
- ❌ The app **cannot** update or overwrite files
- ❌ The app **cannot** delete files
- ❌ The app **cannot** move or rename files
- ❌ The app **cannot** change permissions

If our code tried to call a write API, **Google itself returns a 403 error**. It's not a "we promise" — the lock is on Google's side.

### Phase 1.5 exception — Mockup output

The Mockup Generator (Phase 1.5) needs to *write* its output somewhere. We have two options:

**Option A — Drive write, narrowly scoped (recommended):**
- Use the `https://www.googleapis.com/auth/drive.file` scope alongside `drive.readonly`
- `drive.file` only grants access to **files the app itself created** — it cannot touch any pre-existing file
- All generated mockups go into a single dedicated subfolder (`/Separation Agent/Generated Mockups/`)
- Original art, separations, and everything else remain untouchable

**Option B — No Drive write at all:**
- Mockups are stored in the app's own blob storage (Vercel Blob or S3)
- Eric/team download from the app, manually drop in Drive if they want to
- Zero risk to Drive, slightly more friction

**Default recommendation: Option A**, because `drive.file` is also Google-enforced — even with that scope, the app can't touch pre-existing files. Decision deferred to Eric.

---

## Layer 2 — Folder scope (the blast-radius lock)

The app is configured with a single root folder ID:

```
DRIVE_ROOT_FOLDER_ID = <the "Separation Agent Training" folder>
```

Every Drive file ID the app reads is **validated** before download:

```typescript
// pseudo-code
async function readDriveFile(fileId: string) {
  const path = await getDriveAncestors(fileId)
  if (!path.includes(DRIVE_ROOT_FOLDER_ID)) {
    throw new Error('Refused: file is outside the configured root folder')
  }
  return drive.files.get(fileId, { alt: 'media' })
}
```

This means even if a malicious or buggy request came in with a Drive file ID for, say, the company's tax records, the app would **refuse to read it**. The app is blind to anything outside its assigned folder.

---

## Layer 3 — Code shape (the codebase lock)

The codebase contains **zero** calls to write/delete Drive APIs. Specifically banned:

- `drive.files.create`
- `drive.files.update`
- `drive.files.delete`
- `drive.files.copy`
- `drive.permissions.*`
- `drive.files.emptyTrash`

A CI check greps the codebase for these strings on every PR. If any appear, the build fails. They cannot be added without a deliberate, reviewed PR that updates this doc.

(Phase 1.5 mockup-write code, if Option A is chosen, will use `drive.files.create` *only* inside a single, audited `mockupWriter.ts` module. The CI grep allowlists that one file path.)

---

## Layer 4 — Audit log (the accountability lock)

Every Drive read the app performs is logged with:

- Timestamp
- User who triggered the read (their Google email)
- Drive file ID + filename
- Reason (job ingest, mockup generation, etc.)

Eric can review the log at any time at `/admin/drive-audit`. This means even legitimate reads are traceable — if someone says "what did the app touch yesterday?" we have a complete answer.

---

## What happens if a team member's Google account has more permissions than we want?

Doesn't matter. The OAuth scope **the app requests** is the ceiling. Even if a team member is a Drive admin with delete-everything power, when they log into the Separation Agent the session is downgraded to read-only. The app cannot exceed the scope it asked for, regardless of who's logged in.

---

## What about backups?

Independent of this app, Eric should make sure Google Drive has:

- **Version history** turned on (default for Workspace) — even if something *did* get overwritten, prior versions are recoverable for 30 days
- **Periodic Drive export** to an external backup if the data is truly irreplaceable

This isn't the Separation Agent's job, but it's worth noting because no software stack is 100% — defense in depth includes an off-app backup.

---

## Summary

| Layer | What it stops | Who enforces it |
|---|---|---|
| OAuth scope (`drive.readonly`) | Any write/delete API call | Google |
| Folder scope (root folder ID validation) | Reading files outside the training folder | Our app code |
| Code shape (no write APIs imported) | Writes existing in the codebase at all | CI / PR review |
| Audit log | Untraceable access | Our app code |

The Drive stays a vault.
