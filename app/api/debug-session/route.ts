import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Debug helper — shows what the server sees about the current session.
 * Safe: returns sanitized info only (no tokens). Visit /api/debug-session.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  return NextResponse.json({
    hasSession: !!session,
    userEmail: session?.user?.email ?? null,
    userName: session?.user?.name ?? null,
    hasDriveAccessToken: !!(session as any)?.driveAccessToken,
    nextAuthSecretSet: !!process.env.NEXTAUTH_SECRET,
    nextAuthUrlSet: !!process.env.NEXTAUTH_URL,
    googleClientIdSet: !!process.env.GOOGLE_CLIENT_ID,
    driveRootFolderIdSet: !!process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
  });
}
