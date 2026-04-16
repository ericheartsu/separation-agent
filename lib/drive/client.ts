import { google, drive_v3 } from 'googleapis';
import { isMockMode } from '@/lib/utils';
import { assertWithinRoot } from './guard';
import { recordAudit } from './audit';

/**
 * Build a Drive client authorized as the calling user.
 *
 * NextAuth puts the user's Google access_token on the session JWT
 * (see lib/auth.ts). We pass it in here so every Drive read is
 * attributed to the actual logged-in human, not a service account.
 *
 * In mock mode we return null and callers fall back to stub data.
 */
export function driveClient(accessToken: string): drive_v3.Drive {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth });
}

/**
 * List immediate children of a Drive folder.
 * Validates the folder is within the configured root before reading.
 */
export async function listFolderChildren(
  folderId: string,
  accessToken: string,
  opts: { userId?: string; reason: string },
): Promise<{
  folders: { id: string; name: string }[];
  files: { id: string; name: string; mimeType: string; size: number; modifiedTime: string }[];
}> {
  if (isMockMode()) {
    await recordAudit({ ...opts, driveFileId: folderId, driveFileName: 'mock-list', successful: true });
    return { folders: [], files: [] };
  }

  const drive = driveClient(accessToken);
  await assertWithinRoot(folderId, drive);

  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id,name,mimeType,size,modifiedTime)',
      pageSize: 1000,
      orderBy: 'name',
    });
    const items = res.data.files ?? [];
    const folders = items
      .filter(f => f.mimeType === 'application/vnd.google-apps.folder')
      .map(f => ({ id: f.id!, name: f.name! }));
    const files = items
      .filter(f => f.mimeType !== 'application/vnd.google-apps.folder')
      .map(f => ({
        id: f.id!,
        name: f.name!,
        mimeType: f.mimeType ?? 'application/octet-stream',
        size: Number(f.size ?? 0),
        modifiedTime: f.modifiedTime ?? new Date().toISOString(),
      }));
    await recordAudit({ ...opts, driveFileId: folderId, driveFileName: 'list', successful: true });
    return { folders, files };
  } catch (err: any) {
    await recordAudit({
      ...opts,
      driveFileId: folderId,
      driveFileName: null,
      successful: false,
      errorMessage: err?.message,
    });
    throw new Error(`Drive list failed for ${folderId}: ${err?.message ?? 'unknown error'}`);
  }
}

/**
 * Read a file from Drive after validating it's inside the configured root folder.
 *
 * Returns base64-encoded bytes. Caller is responsible for processing
 * (e.g. PSD → flattened PNG via lib/mockup/compositor.ts).
 */
export async function fetchDriveFile(
  fileId: string,
  accessToken: string,
  opts: { userId?: string; reason: string } = { reason: 'unspecified' },
): Promise<{ bytes: Buffer; mimeType: string; name: string }> {
  if (isMockMode()) {
    await recordAudit({ ...opts, driveFileId: fileId, driveFileName: 'mock', successful: true });
    return { bytes: Buffer.from(''), mimeType: 'image/png', name: 'mock' };
  }

  const drive = driveClient(accessToken);
  await assertWithinRoot(fileId, drive);

  try {
    const meta = await drive.files.get({ fileId, fields: 'id,name,mimeType' });
    const data = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' },
    );
    await recordAudit({
      ...opts,
      driveFileId: fileId,
      driveFileName: meta.data.name ?? null,
      successful: true,
    });
    return {
      bytes: Buffer.from(data.data as ArrayBuffer),
      mimeType: meta.data.mimeType ?? 'application/octet-stream',
      name: meta.data.name ?? fileId,
    };
  } catch (err: any) {
    await recordAudit({
      ...opts,
      driveFileId: fileId,
      driveFileName: null,
      successful: false,
      errorMessage: err?.message,
    });
    throw new Error(`Drive read failed for ${fileId}: ${err?.message ?? 'unknown error'}`);
  }
}

/**
 * Detect the canonical triplet inside a design folder.
 * Walks subfolders looking for "Customer Supplied Files" / "Mockups" / "Seps"
 * variants, then picks the most-recent file in each.
 */
export interface DetectedTriplet {
  customer: { id: string; name: string; mimeType: string; size: number } | null;
  mockup:   { id: string; name: string; mimeType: string; size: number } | null;
  separation: { id: string; name: string; mimeType: string; size: number } | null;
  diagnostics: {
    customerSubfolderId: string | null;
    mockupSubfolderId: string | null;
    sepSubfolderId: string | null;
    customerCandidates: number;
    mockupCandidates: number;
    sepCandidates: number;
  };
}

const KIND_PATTERNS: Record<'CUSTOMER' | 'MOCKUP' | 'SEPARATION', RegExp> = {
  CUSTOMER: /^(customer\s*supplied\s*files?|customer\s*files?|customer|client|original)$/i,
  MOCKUP: /^(mockups?|mock-?ups?|proofs?)$/i,
  SEPARATION: /^(seps?|separations?|sep|hi[\s-]?res|print[\s-]?ready)$/i,
};

export async function detectTriplet(
  designFolderId: string,
  accessToken: string,
  opts: { userId?: string },
): Promise<DetectedTriplet> {
  const { folders } = await listFolderChildren(designFolderId, accessToken, {
    ...opts,
    reason: 'triplet_detect',
  });

  const find = (kind: keyof typeof KIND_PATTERNS) =>
    folders.find(f => KIND_PATTERNS[kind].test(f.name.trim()));

  const customerFolder = find('CUSTOMER');
  const mockupFolder = find('MOCKUP');
  const sepFolder = find('SEPARATION');

  const pickNewest = async (folderId: string | undefined) => {
    if (!folderId) return { file: null, count: 0 };
    const { files } = await listFolderChildren(folderId, accessToken, {
      ...opts,
      reason: 'triplet_pick',
    });
    if (files.length === 0) return { file: null, count: 0 };
    const sorted = [...files].sort(
      (a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime(),
    );
    return { file: sorted[0], count: files.length };
  };

  const [c, m, s] = await Promise.all([
    pickNewest(customerFolder?.id),
    pickNewest(mockupFolder?.id),
    pickNewest(sepFolder?.id),
  ]);

  return {
    customer: c.file && { id: c.file.id, name: c.file.name, mimeType: c.file.mimeType, size: c.file.size },
    mockup: m.file && { id: m.file.id, name: m.file.name, mimeType: m.file.mimeType, size: m.file.size },
    separation: s.file && { id: s.file.id, name: s.file.name, mimeType: s.file.mimeType, size: s.file.size },
    diagnostics: {
      customerSubfolderId: customerFolder?.id ?? null,
      mockupSubfolderId: mockupFolder?.id ?? null,
      sepSubfolderId: sepFolder?.id ?? null,
      customerCandidates: c.count,
      mockupCandidates: m.count,
      sepCandidates: s.count,
    },
  };
}

/**
 * Convenience: returns a base64-encoded PNG preview for vision API consumption.
 * Falls back to a placeholder if no access token is available (e.g. running
 * a critique on a mock-seeded job).
 */
export async function fetchDrivePreview(fileId: string, accessToken?: string): Promise<string> {
  if (isMockMode() || !accessToken) {
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  }
  const file = await fetchDriveFile(fileId, accessToken, { reason: 'preview' });
  return file.bytes.toString('base64');
}
