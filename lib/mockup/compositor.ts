import sharp from 'sharp';
import { synthTemplate } from './synthetic-template';

export interface MockupZoneInput {
  zoneId: string;
  /** PNG bytes of the artwork to place in this zone. */
  artBytes: Buffer;
  /** Pixel position + size of the zone within the template image. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Hex color of the dominant ink. Used to tint the art if it's a 1-color print. */
  primaryInkHex?: string;
}

export interface CompositeInput {
  /** PNG bytes of the garment template OR a synthetic spec. */
  template: Buffer | { style: 'tee' | 'hoodie'; color: string };
  zones: MockupZoneInput[];
  /** Hex color of the garment. If template is synthetic, this overrides the synth color. */
  garmentColor?: string;
}

/**
 * Composite art into the print zones of a garment template.
 *
 * Phase 1.5 implementation: flat compositing with optional ink tinting.
 * Phase 1.5+ stretch: displacement-map based fabric-following composite.
 */
export async function generateMockup(input: CompositeInput): Promise<Buffer> {
  // 1. resolve the base template
  const baseBytes = Buffer.isBuffer(input.template)
    ? input.template
    : await synthTemplate(input.template);

  let composite = sharp(baseBytes);
  const meta = await composite.metadata();
  const tw = meta.width ?? 1000;
  const th = meta.height ?? 1000;

  // 2. apply garment color if requested (multiply over base)
  if (input.garmentColor) {
    const tint = await sharp({
      create: {
        width: tw, height: th, channels: 4,
        background: { ...hexToRgb(input.garmentColor), alpha: 0.4 },
      },
    }).png().toBuffer();
    composite = composite.composite([{ input: tint, blend: 'multiply' }]);
  }

  // 3. for each zone, prepare and overlay the art
  const layers: sharp.OverlayOptions[] = [];
  for (const zone of input.zones) {
    let art = sharp(zone.artBytes).resize(zone.width, zone.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });

    if (zone.primaryInkHex) {
      // tint the art toward the primary ink color
      const { r, g, b } = hexToRgb(zone.primaryInkHex);
      art = art.tint({ r, g, b });
    }

    const buf = await art.png().toBuffer();
    layers.push({ input: buf, top: zone.y, left: zone.x });
  }

  return composite.composite(layers).png().toBuffer();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m) return { r: 0, g: 0, b: 0 };
  const [r, g, b] = m.map(h => parseInt(h, 16));
  return { r, g, b };
}
