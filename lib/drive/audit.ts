import { db } from '@/lib/db';
import { driveAudit } from '@/lib/db/schema';

export async function recordAudit(entry: {
  userId?: string;
  driveFileId: string;
  driveFileName?: string | null;
  reason: string;
  successful: boolean;
  errorMessage?: string;
}) {
  try {
    await db.insert(driveAudit).values({
      userId: entry.userId ?? null,
      driveFileId: entry.driveFileId,
      driveFileName: entry.driveFileName ?? null,
      reason: entry.reason,
      successful: entry.successful,
      errorMessage: entry.errorMessage ?? null,
    });
  } catch (err) {
    // audit failures must never break the calling code — log and continue
    console.error('[drive audit] failed to record:', err);
  }
}
