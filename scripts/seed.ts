/**
 * Seed local SQLite with realistic mock data so the UI is demoable
 * without any real Drive / Anthropic / OAuth credentials.
 *
 * Run: npm run db:seed
 */
import { db } from '../lib/db';
import {
  tenants, users, jobs, jobFiles, tags, jobTags,
  critiques, corrections, garmentTemplates, printZones, generatedMockups,
  driveAudit,
} from '../lib/db/schema';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Seeding local SQLite…');

  // wipe existing
  await db.delete(driveAudit);
  await db.delete(generatedMockups);
  await db.delete(printZones);
  await db.delete(garmentTemplates);
  await db.delete(corrections);
  await db.delete(critiques);
  await db.delete(jobTags);
  await db.delete(jobFiles);
  await db.delete(jobs);
  await db.delete(tags);
  await db.delete(users);
  await db.delete(tenants);

  // ─── Tenant ───────────────────────────────────────────────
  const [craft] = await db.insert(tenants).values({
    name: 'Craft MFG',
    driveRootFolderId: null,
  }).returning();

  // ─── Users ────────────────────────────────────────────────
  const [eric, val, separator] = await db.insert(users).values([
    { tenantId: craft.id, email: 'eric@craft-mfg.com', name: 'Eric Beier', role: 'admin' },
    { tenantId: craft.id, email: 'val@craft-mfg.com', name: 'Val', role: 'trainer' },
    { tenantId: craft.id, email: 'sep@craft-mfg.com', name: 'Senior Separator', role: 'trainer' },
  ]).returning();

  // ─── Tags ────────────────────────────────────────────────
  const tagSeeds = [
    // techniques
    { category: 'technique' as const, name: 'simulated-process', description: 'Halftone dot mixing of opaque inks' },
    { category: 'technique' as const, name: 'spot-color', description: 'Solid spot ink, no halftones' },
    { category: 'technique' as const, name: 'four-color-process', description: 'CMYK halftones' },
    { category: 'technique' as const, name: 'index', description: 'Indexed/random dither separation' },
    { category: 'technique' as const, name: 'discharge', description: 'Discharge underbase on dyed cotton' },
    { category: 'technique' as const, name: 'halftones', description: 'Any halftone treatment' },
    { category: 'technique' as const, name: 'gradients', description: 'Smooth tonal transitions' },
    { category: 'technique' as const, name: 'white-underbase', description: 'White ink underbase layer' },
    { category: 'technique' as const, name: 'metallic', description: 'Metallic ink (silver/gold)' },
    // problems
    { category: 'problem' as const, name: 'moire-risk', description: 'Halftone angle interference risk' },
    { category: 'problem' as const, name: 'fine-line-loss', description: 'Lines too thin for press registration' },
    { category: 'problem' as const, name: 'tight-registration', description: 'Requires precise multi-color alignment' },
    { category: 'problem' as const, name: 'low-res-source', description: 'Customer file too low resolution' },
    { category: 'problem' as const, name: 'rgb-conversion', description: 'RGB colors that don\'t convert cleanly to ink' },
    { category: 'problem' as const, name: 'banding-risk', description: 'Gradients that may show banding on press' },
    // garments
    { category: 'garment' as const, name: 'dark-garment', description: 'Dark base requiring underbase' },
    { category: 'garment' as const, name: 'fashion-fit', description: 'Fashion-fit garment' },
    { category: 'garment' as const, name: 'heather', description: 'Heathered fabric texture' },
    { category: 'garment' as const, name: 'tri-blend', description: 'Tri-blend fabric' },
    // art styles
    { category: 'art_style' as const, name: 'photorealistic', description: 'Photo-realistic imagery' },
    { category: 'art_style' as const, name: 'illustrated', description: 'Hand-drawn / illustrated art' },
    { category: 'art_style' as const, name: 'typography-heavy', description: 'Lots of fine type' },
    { category: 'art_style' as const, name: 'distressed', description: 'Distressed / vintage texture' },
  ];

  const insertedTags = await db.insert(tags).values(
    tagSeeds.map(t => ({ ...t, tenantId: craft.id }))
  ).returning();
  const tagByName = Object.fromEntries(insertedTags.map(t => [t.name, t]));

  // ─── Jobs (realistic Craft scenarios) ───────────────────
  const jobSeeds = [
    {
      customer: 'Mountain West Brewing',
      jobName: 'Smoke Series Tee',
      po: 'MWB-2026-0142',
      garmentColor: 'Black',
      garmentStyle: 'Bella+Canvas 3001',
      colorCount: 5,
      method: 'simulated_process' as const,
      difficulty: 4,
      notes: 'Customer sent low-res JPG of smoke effect. Rebuilt smoke from scratch. Used 55-line halftone at 22.5° on grey to avoid moire with white underbase. Sim-process palette: white base, light grey, mid grey, dark grey, accent orange.',
      tags: ['simulated-process', 'halftones', 'white-underbase', 'dark-garment', 'low-res-source', 'moire-risk'],
    },
    {
      customer: 'Houston Astros Charity Run',
      jobName: '5K 2026 Long Sleeve',
      po: 'HAC-26-005',
      garmentColor: 'Athletic Heather',
      garmentStyle: 'Next Level 6411',
      colorCount: 3,
      method: 'spot_color' as const,
      difficulty: 2,
      notes: 'Clean vector art from event organizer. Three spot colors: navy, orange, white. No underbase — heather is light enough. Slight 1px choke on the white.',
      tags: ['spot-color', 'heather', 'illustrated'],
    },
    {
      customer: 'Static Wave Records',
      jobName: 'Album Drop Tee — Side A',
      po: 'SWR-DROP-A',
      garmentColor: 'Natural',
      garmentStyle: 'Comfort Colors 1717',
      colorCount: 4,
      method: 'discharge' as const,
      difficulty: 5,
      notes: 'Discharge base on dyed natural cotton. Halftone gradients in the synthwave background needed to be broken into 3 spot tones — would have banded as a true halftone. Tight registration on the typography overlay.',
      tags: ['discharge', 'gradients', 'tight-registration', 'banding-risk', 'typography-heavy'],
    },
    {
      customer: 'Bayou City Coffee Co.',
      jobName: 'Logo Pocket Tee',
      po: 'BCC-2026-A',
      garmentColor: 'White',
      garmentStyle: 'Bella+Canvas 3001',
      colorCount: 1,
      method: 'spot_color' as const,
      difficulty: 1,
      notes: 'Single color black on white. Easiest job we run all year. Vector logo, no surprises.',
      tags: ['spot-color', 'illustrated'],
    },
    {
      customer: 'Iron Bayou Crossfit',
      jobName: 'Open 2026 Hoodie',
      po: 'IBC-OPEN-26',
      garmentColor: 'Charcoal Heather',
      garmentStyle: 'Independent SS4500',
      colorCount: 6,
      method: 'simulated_process' as const,
      difficulty: 5,
      notes: 'Photo of athlete mid-lift converted to sim-process. Six colors including white underbase, two greys, flesh tone, accent red, and metallic silver highlight. Metallic at 35° to avoid moire stack with the greys.',
      tags: ['simulated-process', 'halftones', 'white-underbase', 'metallic', 'photorealistic', 'heather', 'moire-risk'],
    },
    {
      customer: 'Galveston Surf Co.',
      jobName: 'Sunset Pocket Tee',
      po: 'GSC-SS26-12',
      garmentColor: 'Sand',
      garmentStyle: 'Comfort Colors 1717',
      colorCount: 4,
      method: 'four_color_process' as const,
      difficulty: 4,
      notes: 'CMYK process print of sunset photo. Sand garment color affects yellow ink — pulled the yellow channel back 8% to compensate. 65 LPI all four channels at standard angles.',
      tags: ['four-color-process', 'halftones', 'photorealistic', 'gradients'],
    },
  ];

  for (const s of jobSeeds) {
    const [job] = await db.insert(jobs).values({
      tenantId: craft.id,
      customerName: s.customer,
      jobName: s.jobName,
      poNumber: s.po,
      garmentColor: s.garmentColor,
      garmentStyle: s.garmentStyle,
      colorCount: s.colorCount,
      printMethod: s.method,
      difficulty: s.difficulty,
      notes: s.notes,
      createdById: separator.id,
    }).returning();

    // 3 mock files per job
    await db.insert(jobFiles).values([
      {
        jobId: job.id, kind: 'CUSTOMER',
        driveFileId: `mock-${job.id}-customer`,
        driveFileName: `${s.customer} - customer art.psd`,
        mimeType: 'image/vnd.adobe.photoshop',
        byteSize: 24_500_000,
        previewUrl: `/api/mock-preview?seed=${job.id}-customer`,
      },
      {
        jobId: job.id, kind: 'MOCKUP',
        driveFileId: `mock-${job.id}-mockup`,
        driveFileName: `${s.customer} - mockup.png`,
        mimeType: 'image/png',
        byteSize: 1_800_000,
        previewUrl: `/api/mock-preview?seed=${job.id}-mockup`,
      },
      {
        jobId: job.id, kind: 'SEPARATION',
        driveFileId: `mock-${job.id}-sep`,
        driveFileName: `${s.customer} - SEP HIRES.psd`,
        mimeType: 'image/vnd.adobe.photoshop',
        byteSize: 142_000_000,
        previewUrl: `/api/mock-preview?seed=${job.id}-sep`,
      },
    ]);

    // tags
    for (const tagName of s.tags) {
      const tag = tagByName[tagName];
      if (tag) {
        await db.insert(jobTags).values({ jobId: job.id, tagId: tag.id });
      }
    }

    // mock critique on the first 3 jobs
    if (jobSeeds.indexOf(s) < 3) {
      const [crit] = await db.insert(critiques).values({
        jobId: job.id,
        modelVersion: 'claude-opus-4-6',
        promptVersion: 'critique-v1',
        text: `Looking at this job — ${s.customer}'s ${s.jobName} on ${s.garmentColor.toLowerCase()} ${s.garmentStyle}.\n\nThe customer file shows ${s.tags.includes('photorealistic') ? 'a photographic source that needs sim-process treatment' : s.tags.includes('illustrated') ? 'clean vector linework' : 'mixed art elements'}. The mockup we sent the client matches the final separation closely, which is a good sign.\n\nKey observations:\n${s.tags.includes('halftones') ? '- Halftone strategy looks sound. Watch the angle stack to avoid moire — the separator chose 22.5° for the grey channel, which clears the white underbase angle.\n' : ''}${s.tags.includes('white-underbase') ? '- White underbase is correctly sized; small 1px choke would tighten registration further on the fine elements.\n' : ''}${s.tags.includes('discharge') ? '- Discharge base on dyed cotton is the right call here — direct print would dull the brights.\n' : ''}${s.tags.includes('low-res-source') ? '- Customer art was low-res; the rebuild was necessary and well executed.\n' : ''}\nOverall difficulty rating I\'d give this: ${s.difficulty}/5. ${s.difficulty >= 4 ? 'This was real work.' : 'A clean run.'}`,
        findings: {
          summary: `${s.method.replace('_', ' ')} separation on ${s.garmentColor} ${s.garmentStyle}, ${s.colorCount} colors`,
          color_palette: Array.from({ length: s.colorCount }, (_, i) => ({
            name: ['White underbase', 'Light Grey', 'Mid Grey', 'Dark Grey', 'Accent', 'Highlight'][i] || `Color ${i+1}`,
            role: i === 0 ? 'underbase' : 'top color',
          })),
          underbase_strategy: s.tags.includes('discharge') ? 'discharge base' : s.tags.includes('white-underbase') ? 'white underbase, 1px choke' : 'no underbase needed',
          halftones: s.tags.includes('halftones') ? [
            { color: 'Grey', lpi: 55, angle: 22.5 },
            { color: 'Top White', lpi: 55, angle: 75 },
          ] : undefined,
          risks: [
            ...(s.tags.includes('moire-risk') ? [{ area: 'Halftone angle stack', severity: 'med' as const, explanation: 'Watch overlapping angles between grey and underbase' }] : []),
            ...(s.tags.includes('banding-risk') ? [{ area: 'Gradient transitions', severity: 'high' as const, explanation: 'Smooth gradient may band on press; consider stepping into spots' }] : []),
            ...(s.tags.includes('fine-line-loss') ? [{ area: 'Fine typography', severity: 'med' as const, explanation: 'Lines below 0.5pt may not hold' }] : []),
          ],
          overall_difficulty: s.difficulty,
        },
      }).returning();

      // a correction on the first one
      if (jobSeeds.indexOf(s) === 0) {
        await db.insert(corrections).values({
          critiqueId: crit.id,
          userId: separator.id,
          verdict: 'partial',
          whatAgentMissed: 'The agent didn\'t mention that the orange accent is a Pantone-matched ink, not a process build. That matters for repeat orders.',
          whatAgentGotWrong: null,
        });
      }
    }
  }

  // ─── Garment Templates (Phase 1.5) ──────────────────────
  const [bcTemplate] = await db.insert(garmentTemplates).values({
    tenantId: craft.id,
    garmentStyleSku: 'BC-3001',
    name: 'Bella+Canvas 3001 — Unisex Tee',
    baseImageUrl: '/api/synthetic-template?style=tee&color=black',
    defaultColor: '#0A0A0A',
  }).returning();

  await db.insert(printZones).values([
    {
      templateId: bcTemplate.id,
      name: 'Full Front',
      x: 320, y: 280, width: 360, height: 440,
      rotationDeg: 0,
      maxPrintWidthIn: 12, maxPrintHeightIn: 14,
      pixelsPerInch: 30,
    },
    {
      templateId: bcTemplate.id,
      name: 'Left Chest',
      x: 380, y: 290, width: 140, height: 140,
      rotationDeg: 0,
      maxPrintWidthIn: 4, maxPrintHeightIn: 4,
      pixelsPerInch: 35,
    },
  ]);

  const [hoodieTemplate] = await db.insert(garmentTemplates).values({
    tenantId: craft.id,
    garmentStyleSku: 'IND-SS4500',
    name: 'Independent SS4500 — Heavyweight Hoodie',
    baseImageUrl: '/api/synthetic-template?style=hoodie&color=charcoal',
    defaultColor: '#36454F',
  }).returning();

  await db.insert(printZones).values([
    {
      templateId: hoodieTemplate.id,
      name: 'Full Front',
      x: 320, y: 360, width: 360, height: 380,
      rotationDeg: 0,
      maxPrintWidthIn: 12, maxPrintHeightIn: 13,
      pixelsPerInch: 30,
    },
  ]);

  // ─── Drive audit log entries ─────────────────────────────
  await db.insert(driveAudit).values([
    { userId: separator.id, driveFileId: 'mock-1', driveFileName: 'sample-customer.psd', reason: 'job_ingest', successful: true },
    { userId: val.id, driveFileId: 'mock-2', driveFileName: 'sample-mockup.png', reason: 'preview_regen', successful: true },
    { userId: eric.id, driveFileId: 'mock-3', driveFileName: 'unauthorized.pdf', reason: 'job_ingest', successful: false, errorMessage: 'Refused: file outside configured root folder' },
  ]);

  console.log('✅ Seed complete.');
  console.log(`   ${jobSeeds.length} jobs, ${tagSeeds.length} tags, 2 templates seeded.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
