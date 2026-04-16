import { NextRequest, NextResponse } from 'next/server';
import { detectTriplet } from '@/lib/drive/client';
import { requireSession } from '@/lib/auth-helpers';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ designId: string }> }) {
  try {
    const { designId } = await params;
    const { user, driveAccessToken } = await requireSession();
    if (!driveAccessToken) {
      return NextResponse.json(
        { error: 'No Drive access token on session. Sign out and back in.' },
        { status: 401 },
      );
    }
    const result = await detectTriplet(designId, driveAccessToken, { userId: user.id });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Triplet detect failed' }, { status: 500 });
  }
}
