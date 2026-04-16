import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jobs, jobFiles, jobTags, tenants } from '@/lib/db/schema';
import { z } from 'zod';
import { requireSession } from '@/lib/auth-helpers';

const FileSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  byteSize: z.number(),
});

const PayloadSchema = z.object({
  customerName: z.string().min(1),
  jobName: z.string().min(1),
  poNumber: z.string().nullable().optional(),
  garmentColor: z.string().min(1),
  garmentStyle: z.string().nullable().optional(),
  colorCount: z.number().int().min(1).max(12),
  printMethod: z.enum(['spot_color', 'simulated_process', 'four_color_process', 'index', 'discharge', 'other']),
  difficulty: z.number().int().min(1).max(5),
  notes: z.string().nullable().optional(),
  files: z.object({
    CUSTOMER: FileSchema,
    MOCKUP: FileSchema,
    SEPARATION: FileSchema,
  }),
  tagIds: z.array(z.string()),
});

export async function POST(req: NextRequest) {
  let user;
  try {
    ({ user } = await requireSession());
  } catch {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', detail: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const [tenant] = await db.select().from(tenants).limit(1);
  if (!tenant) return NextResponse.json({ error: 'No tenant. Run seed.' }, { status: 500 });

  const [job] = await db.insert(jobs).values({
    tenantId: tenant.id,
    customerName: data.customerName,
    jobName: data.jobName,
    poNumber: data.poNumber || null,
    garmentColor: data.garmentColor,
    garmentStyle: data.garmentStyle || null,
    colorCount: data.colorCount,
    printMethod: data.printMethod,
    difficulty: data.difficulty,
    notes: data.notes || null,
    createdById: user.id,
  }).returning();

  await db.insert(jobFiles).values(
    (Object.entries(data.files) as ['CUSTOMER' | 'MOCKUP' | 'SEPARATION', z.infer<typeof FileSchema>][]).map(
      ([kind, f]) => ({
        jobId: job.id,
        kind,
        driveFileId: f.id,
        driveFileName: f.name,
        mimeType: f.mimeType,
        byteSize: f.byteSize,
        previewUrl: `/api/mock-preview?seed=${f.id}`,
      })
    )
  );

  if (data.tagIds.length > 0) {
    await db.insert(jobTags).values(data.tagIds.map(tagId => ({ jobId: job.id, tagId })));
  }

  return NextResponse.json({ id: job.id });
}
