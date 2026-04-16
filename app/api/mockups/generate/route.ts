import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { garmentTemplates, printZones, generatedMockups, tenants, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { generateMockup } from '@/lib/mockup/compositor';
import { synthTemplate } from '@/lib/mockup/synthetic-template';
import { z } from 'zod';
import sharp from 'sharp';

const Schema = z.object({
  templateId: z.string(),
  zoneId: z.string(),
  garmentColor: z.string(),
  inkColors: z.array(z.string()).min(1),
  hqJobId: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid', detail: parsed.error.flatten() }, { status: 400 });
  }

  const { templateId, zoneId, garmentColor, inkColors, hqJobId } = parsed.data;

  const template = await db.query.garmentTemplates.findFirst({
    where: eq(garmentTemplates.id, templateId),
    with: { zones: true },
  });
  if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

  const zone = template.zones.find(z => z.id === zoneId);
  if (!zone) return NextResponse.json({ error: 'Zone not found' }, { status: 404 });

  // For Phase 1.5 scaffold: use synthetic placeholder art (a colored box with text)
  // Real impl: pull artwork from Drive based on hqJobId
  const placeholderArt = await sharp({
    create: {
      width: zone.width,
      height: zone.height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0.95 },
    },
  })
    .composite([{
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${zone.width} ${zone.height}">
        <rect width="100%" height="100%" fill="${inkColors[0]}" opacity="0.85"/>
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
              font-family="Montserrat, sans-serif" font-size="${Math.min(zone.width, zone.height) / 8}"
              font-weight="700" fill="white">CRAFT MFG</text>
      </svg>`),
      top: 0, left: 0,
    }])
    .png()
    .toBuffer();

  // Resolve template image
  const url = new URL(template.baseImageUrl, 'http://localhost').searchParams;
  const templateInput: Buffer | { style: 'tee' | 'hoodie'; color: string } =
    template.baseImageUrl.startsWith('/api/synthetic-template')
      ? {
          style: (url.get('style') ?? 'tee') as 'tee' | 'hoodie',
          color: url.get('color') ?? 'black',
        }
      : await synthTemplate({ style: 'tee', color: 'black' });

  const png = await generateMockup({
    template: templateInput,
    garmentColor,
    zones: [{
      zoneId: zone.id,
      artBytes: placeholderArt,
      x: zone.x,
      y: zone.y,
      width: zone.width,
      height: zone.height,
      primaryInkHex: inkColors[0],
    }],
  });

  // Persist as a data URL for now (Phase 1.5+ pushes to Vercel Blob or Drive subfolder)
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`;

  const [tenant] = await db.select().from(tenants).limit(1);
  const [admin] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);

  await db.insert(generatedMockups).values({
    tenantId: tenant.id,
    hqJobId: hqJobId || null,
    templateId,
    zonesJson: [{
      zoneId: zone.id,
      artUrl: 'placeholder',
      inkColors,
      widthIn: zone.maxPrintWidthIn,
      heightIn: zone.maxPrintHeightIn,
    }],
    garmentColor,
    outputUrl: dataUrl.slice(0, 100) + '…(truncated for DB)',
    generatedById: admin?.id,
  });

  return NextResponse.json({ url: dataUrl });
}
