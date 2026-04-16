import sharp from 'sharp';

/**
 * Generates a placeholder garment template SVG → PNG. Used in Phase 1.5
 * scaffold so the mockup pipeline is testable without real garment templates.
 *
 * Replace with real template upload + management once Eric provides PSD/PNG
 * templates per garment style.
 */
export async function synthTemplate({
  style, color,
}: { style: 'tee' | 'hoodie'; color: string }): Promise<Buffer> {
  const fill = colorMap[color] ?? '#0A0A0A';
  const accent = color === 'white' ? '#E5E5E5' : 'rgba(255,255,255,0.05)';

  const svg = style === 'tee' ? teeSvg(fill, accent) : hoodieSvg(fill, accent);

  return sharp(Buffer.from(svg)).resize(1000, 1000).png().toBuffer();
}

const colorMap: Record<string, string> = {
  black: '#0A0A0A',
  white: '#F5F5F5',
  charcoal: '#36454F',
  navy: '#1B2A4E',
  red: '#A02020',
  natural: '#E8E0CC',
  sand: '#D8C99B',
  heather: '#A5A5A5',
};

function teeSvg(fill: string, accent: string): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
  <rect width="1000" height="1000" fill="#0A0A0A"/>
  <!-- tee silhouette -->
  <path d="M 250 200
           L 380 180
           Q 500 240 620 180
           L 750 200
           L 850 320
           L 750 400
           L 720 380
           L 720 850
           L 280 850
           L 280 380
           L 250 400
           L 150 320 Z" fill="${fill}" stroke="${accent}" stroke-width="2"/>
  <!-- collar -->
  <ellipse cx="500" cy="195" rx="65" ry="22" fill="#0A0A0A" stroke="${accent}" stroke-width="2"/>
  <!-- print zone marker (faint) -->
  <rect x="320" y="280" width="360" height="440" fill="none" stroke="${accent}" stroke-width="1" stroke-dasharray="6 6"/>
</svg>`;
}

function hoodieSvg(fill: string, accent: string): string {
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
  <rect width="1000" height="1000" fill="#0A0A0A"/>
  <!-- hood -->
  <path d="M 380 220 Q 500 100 620 220 L 600 280 Q 500 240 400 280 Z" fill="${fill}" stroke="${accent}" stroke-width="2"/>
  <!-- hoodie body -->
  <path d="M 280 280
           L 380 260
           Q 500 320 620 260
           L 720 280
           L 870 420
           L 760 480
           L 720 460
           L 720 880
           L 280 880
           L 280 460
           L 240 480
           L 130 420 Z" fill="${fill}" stroke="${accent}" stroke-width="2"/>
  <!-- pouch pocket -->
  <path d="M 320 700 L 400 660 L 600 660 L 680 700 L 660 800 L 340 800 Z" fill="none" stroke="${accent}" stroke-width="1"/>
  <!-- print zone marker -->
  <rect x="320" y="360" width="360" height="380" fill="none" stroke="${accent}" stroke-width="1" stroke-dasharray="6 6"/>
</svg>`;
}
