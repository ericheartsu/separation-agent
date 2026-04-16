import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jobs, critiques } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { runCritique } from '@/lib/claude/critique';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, id),
    with: { files: true, tags: { with: { tag: true } } },
  });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  const result = await runCritique(job);

  const [crit] = await db.insert(critiques).values({
    jobId: id,
    modelVersion: result.modelVersion,
    promptVersion: result.promptVersion,
    text: result.text,
    findings: result.findings,
  }).returning();

  return NextResponse.json({ id: crit.id });
}
