import { google, drive_v3 } from 'googleapis';
import { isMockMode } from '@/lib/utils';
import { assertWithinRoot } from './guard';
import { recordAudit } from './audit';

let _drive: drive_v3.Drive | null = null;

function getDrive(): drive_v3.Drive {
  if (_drive) return _drive;
  // In production this OAuth client is hydrated from the user's NextAuth session.
  // For the scaffold we lazily build it; it's only invoked when MOCK_MODE is false.
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  // Real impl: pull access token from session and call auth.setCredentials({ access_token })
  _drive = google.drive({ version: 'v3', auth });
  return _drive;
}

/**
 * Read a file from Drive after validating it's inside the configured root folder.
 *
 * Returns base64-encoded bytes. Caller is responsible for processing
 * (e.g. PSD → flattened PNG via lib/mockup/compositor.ts).
 */
export async function fetchDriveFile(
  fileId: string,
  opts: { userId?: string; reason: string } = { reason: 'unspecified' },
): Promise<{ bytes: Buffer; mimeType: string; name: string }> {
  if (isMockMode()) {
    await recordAudit({ ...opts, driveFileId: fileId, driveFileName: 'mock', successful: true });
    return { bytes: Buffer.from(''), mimeType: 'image/png', name: 'mock' };
  }

  // SAFETY: validate this file is within the configured root folder
  await assertWithinRoot(fileId, getDrive());

  try {
    const meta = await getDrive().files.get({ fileId, fields: 'id,name,mimeType' });
    const data = await getDrive().files.get(
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
    // Surface the real error per feedback_surface_real_errors
    throw new Error(`Drive read failed for ${fileId}: ${err?.message ?? 'unknown error'}`);
  }
}

/**
 * Convenience: returns a base64-encoded PNG preview for vision API consumption.
 * In mock mode, returns a deterministic placeholder.
 */
export async function fetchDrivePreview(fileId: string): Promise<string> {
  if (isMockMode()) {
    // 1x1 transparent PNG as placeholder — real impl uses Sharp to flatten
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  }
  const file = await fetchDriveFile(fileId, { reason: 'preview' });
  // TODO: PSD/AI flattening via Sharp + psd parser. For now assume already an image.
  return file.bytes.toString('base64');
}
