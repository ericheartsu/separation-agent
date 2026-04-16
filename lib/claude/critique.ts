import { anthropic, MODEL, PROMPT_VERSION, inMockMode } from './client';
import type { Job, JobFile, Tag } from '@/lib/db/schema';
import { fetchDrivePreview } from '@/lib/drive/client';

export interface CritiqueResult {
  modelVersion: string;
  promptVersion: string;
  text: string;
  findings: {
    summary: string;
    color_palette: { name: string; hex?: string; role: string }[];
    underbase_strategy?: string;
    halftones?: { color: string; lpi: number; angle: number }[];
    risks: { area: string; severity: 'low' | 'med' | 'high'; explanation: string }[];
    overall_difficulty: number;
  };
}

type JobWithRels = Job & {
  files: JobFile[];
  tags: { tag: Tag }[];
};

export async function runCritique(job: JobWithRels): Promise<CritiqueResult> {
  if (inMockMode()) {
    return mockCritique(job);
  }

  const customer = job.files.find(f => f.kind === 'CUSTOMER');
  const mockup = job.files.find(f => f.kind === 'MOCKUP');
  const sep = job.files.find(f => f.kind === 'SEPARATION');

  // Fetch flattened previews from Drive (in real mode); each preview is a base64 PNG.
  const [custImg, mockImg, sepImg] = await Promise.all([
    customer ? fetchDrivePreview(customer.driveFileId) : null,
    mockup ? fetchDrivePreview(mockup.driveFileId) : null,
    sep ? fetchDrivePreview(sep.driveFileId) : null,
  ]);

  const systemPrompt = buildSystemPrompt();
  const userContent = buildUserContent(job, custImg, mockImg, sepImg);

  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 2000,
    // Cast: the SDK supports cache_control on system blocks, but the TS types
    // lag behind. This is the documented prompt-caching pattern.
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ] as any,
    messages: [{ role: 'user', content: userContent as any }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  const text = textBlock?.type === 'text' ? textBlock.text : '';

  return {
    modelVersion: MODEL,
    promptVersion: PROMPT_VERSION,
    text,
    findings: parseFindings(text),
  };
}

function buildSystemPrompt(): string {
  return `You are an expert screen-printing art separator working at Craft MFG, a high-end custom screen printing shop in Houston, TX.

You evaluate three files for each separation job:
1. CUSTOMER FILE — original artwork the client provided (often low-res, RGB, mixed quality)
2. MOCKUP — what Craft showed the client for approval (color-corrected, on garment)
3. SEPARATION — the final hi-res print-ready file Craft produced (CMYK or spot channels, with halftones, underbase, traps, etc.)

Your job: review the triplet and give the senior separator a useful critique. Focus on:

- What the customer file required vs. what was delivered
- The separation strategy (sim-process / spot / 4cp / discharge / index) and whether it fits the art + garment
- Underbase strategy (white underbase choke, discharge base, none) appropriate for the garment
- Halftone choices (LPI, angles, dot shape) — flag moire risks from angle stacks
- Trap and choke decisions for tight registration
- Risks: low-res areas, fine line loss, RGB gamut issues, banding risk in gradients
- What you'd do differently, if anything

Be specific and technical. Avoid generic praise. Cite exact angle / LPI / channel decisions.

End every critique with a one-line difficulty rating (1-5).`;
}

function buildUserContent(
  job: JobWithRels,
  custImg: string | null,
  mockImg: string | null,
  sepImg: string | null,
): any[] {
  const tagList = job.tags.map(t => t.tag.name).join(', ');
  const text = `Job: ${job.customerName} — ${job.jobName}
Garment: ${job.garmentColor} ${job.garmentStyle ?? ''}
Print method: ${job.printMethod}
Color count: ${job.colorCount}
Difficulty (trainer rated): ${job.difficulty}/5
Tags: ${tagList || 'none'}

Trainer notes:
${job.notes || '(no notes)'}

Three files attached below. Critique the separation in the context of the customer file and mockup.`;

  const blocks: any[] = [{ type: 'text', text }];

  if (custImg) blocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: custImg } });
  if (mockImg) blocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: mockImg } });
  if (sepImg) blocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: sepImg } });

  return blocks;
}

function parseFindings(text: string): CritiqueResult['findings'] {
  // Naive parse — Phase 2 will switch to a structured tool-use output.
  const difficultyMatch = text.match(/(\d)\s*\/\s*5/);
  return {
    summary: text.slice(0, 200),
    color_palette: [],
    risks: [],
    overall_difficulty: difficultyMatch ? Number(difficultyMatch[1]) : 3,
  };
}

// ─── Mock fallback (when ANTHROPIC_API_KEY is missing) ───────────
function mockCritique(job: JobWithRels): CritiqueResult {
  const tags = job.tags.map(t => t.tag.name);
  const has = (n: string) => tags.includes(n);

  const lines: string[] = [
    `Looking at ${job.customerName}'s ${job.jobName} — ${job.printMethod.replace(/_/g, ' ')} on ${job.garmentColor.toLowerCase()} ${job.garmentStyle ?? ''}.`,
    '',
    has('photorealistic')
      ? `The customer file is a photographic source, which is exactly the kind of art that needs simulated process to do justice. The mockup we sent the client matches the final separation closely — that's a green flag, the rebuild stayed faithful.`
      : has('illustrated')
      ? `The customer file is clean vector linework. Spot-color separation is the right call here — no halftones needed for the body of the art, which keeps registration easier on press.`
      : `Mixed art elements in the customer file. The separator made smart choices about what to halftone and what to keep as flat spots.`,
    '',
    'Key observations:',
    has('halftones') ? `- Halftone strategy looks sound. The angle choices clear the underbase moire stack — 22.5° on the dominant grey is a well-worn safe pick.` : '',
    has('white-underbase') ? `- White underbase is correctly sized. A 1px choke would tighten registration further on the fine elements without losing opacity.` : '',
    has('discharge') ? `- Discharge base on dyed cotton is the right call — direct print would dull the brights and make the art feel chalky.` : '',
    has('low-res-source') ? `- Customer art was low-res; the rebuild was necessary and well executed. Worth flagging this in the customer profile so future jobs from them get scoped with rebuild time baked in.` : '',
    has('moire-risk') ? `- Watch the angle stack — flagged as a moire risk. The current angles look safe, but anything tighter than 7.5° between channels is dangerous on press.` : '',
    has('banding-risk') ? `- Gradient transitions are the highest-risk area on press. Stepping the smoothest gradients into 3-4 spot tones (rather than continuous halftone) is what saved this one.` : '',
    has('metallic') ? `- Metallic ink at 35° is correctly offset from the standard sim-process angles. Always print metallic last to avoid contamination.` : '',
    '',
    `Overall difficulty rating: ${job.difficulty}/5. ${job.difficulty >= 4 ? 'This was real work.' : 'A clean run.'}`,
  ].filter(Boolean);

  const text = lines.join('\n');

  return {
    modelVersion: `${MODEL} (mock)`,
    promptVersion: PROMPT_VERSION,
    text,
    findings: {
      summary: text.slice(0, 200),
      color_palette: Array.from({ length: job.colorCount }, (_, i) => ({
        name: ['White underbase', 'Light Grey', 'Mid Grey', 'Dark Grey', 'Accent', 'Highlight'][i] || `Color ${i + 1}`,
        role: i === 0 ? 'underbase' : 'top color',
      })),
      underbase_strategy: has('discharge') ? 'discharge base'
        : has('white-underbase') ? 'white underbase, 1px choke recommended'
        : 'no underbase needed',
      halftones: has('halftones')
        ? [{ color: 'Grey', lpi: 55, angle: 22.5 }, { color: 'Top White', lpi: 55, angle: 75 }]
        : undefined,
      risks: [
        ...(has('moire-risk') ? [{ area: 'Halftone angle stack', severity: 'med' as const, explanation: 'Watch overlapping angles between top colors and underbase' }] : []),
        ...(has('banding-risk') ? [{ area: 'Gradient transitions', severity: 'high' as const, explanation: 'Smooth gradient may band; consider stepping into spots' }] : []),
        ...(has('low-res-source') ? [{ area: 'Source resolution', severity: 'high' as const, explanation: 'Rebuild required — flag for customer profile' }] : []),
        ...(has('fine-line-loss') ? [{ area: 'Fine typography', severity: 'med' as const, explanation: 'Lines below 0.5pt may not hold on press' }] : []),
      ],
      overall_difficulty: job.difficulty,
    },
  };
}
