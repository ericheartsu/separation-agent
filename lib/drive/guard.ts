import type { drive_v3 } from 'googleapis';

/**
 * SAFETY LAYER 2 (see SAFETY.md): every file ID we try to read must
 * have the configured root folder somewhere in its ancestor chain.
 *
 * If GOOGLE_DRIVE_ROOT_FOLDER_ID is unset, all reads are refused —
 * we never want a misconfigured production env to read arbitrary files.
 */
export async function assertWithinRoot(fileId: string, drive: drive_v3.Drive): Promise<void> {
  const root = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!root) {
    throw new Error(
      'GOOGLE_DRIVE_ROOT_FOLDER_ID is not configured. Refusing all Drive reads. ' +
      'See SAFETY.md and SETUP.md.'
    );
  }

  // Root itself is always within itself
  if (fileId === root) return;

  const ancestors = await collectAncestors(fileId, drive, new Set());
  if (!ancestors.has(root)) {
    throw new Error(
      `Refused: file ${fileId} is outside the configured root folder. ` +
      `This is a SAFETY LAYER 2 protection (see SAFETY.md).`
    );
  }
}

async function collectAncestors(
  fileId: string,
  drive: drive_v3.Drive,
  seen: Set<string>,
): Promise<Set<string>> {
  if (seen.has(fileId)) return seen;
  seen.add(fileId);

  const res = await drive.files.get({ fileId, fields: 'parents', supportsAllDrives: true });
  const parents = res.data.parents ?? [];
  for (const p of parents) {
    await collectAncestors(p, drive, seen);
  }
  return seen;
}
