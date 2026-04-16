import { NextRequest, NextResponse } from 'next/server';
import { listFolderChildren } from '@/lib/drive/client';
import { requireSession } from '@/lib/auth-helpers';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user, driveAccessToken } = await requireSession();
    if (!driveAccessToken) {
      return NextResponse.json(
        { error: 'No Drive access token on session. Sign out and back in.' },
        { status: 401 },
      );
    }
    const result = await listFolderChildren(id, driveAccessToken, {
      userId: user.id,
      reason: 'browse',
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Drive list failed' }, { status: 500 });
  }
}
