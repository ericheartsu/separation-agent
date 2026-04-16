import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { corrections, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const Schema = z.object({
  critiqueId: z.string(),
  verdict: z.enum(['correct', 'partial', 'wrong']),
  whatAgentMissed: z.string().nullable().optional(),
  whatAgentGotWrong: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid', detail: parsed.error.flatten() }, { status: 400 });
  }

  // mock: pin to first admin user; NextAuth wires real user later
  const [admin] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);

  const [c] = await db.insert(corrections).values({
    critiqueId: parsed.data.critiqueId,
    userId: admin.id,
    verdict: parsed.data.verdict,
    whatAgentMissed: parsed.data.whatAgentMissed || null,
    whatAgentGotWrong: parsed.data.whatAgentGotWrong || null,
  }).returning();

  return NextResponse.json({ id: c.id });
}
