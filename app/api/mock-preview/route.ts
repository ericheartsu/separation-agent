import { NextRequest } from 'next/server';

/**
 * Returns a deterministic SVG placeholder so the UI has something
 * to render in mock mode (no real Drive image fetches yet).
 */
export async function GET(req: NextRequest) {
  const seed = new URL(req.url).searchParams.get('seed') ?? 'default';
  const hue = hashHue(seed);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
  <rect width="400" height="400" fill="hsl(${hue}, 30%, 12%)"/>
  <circle cx="200" cy="170" r="80" fill="hsl(${hue}, 50%, 35%)" opacity="0.6"/>
  <rect x="80" y="240" width="240" height="80" fill="hsl(${(hue + 60) % 360}, 50%, 35%)" opacity="0.6" rx="8"/>
  <text x="200" y="380" text-anchor="middle" font-family="monospace" font-size="14" fill="hsl(${hue}, 30%, 60%)">${seed}</text>
</svg>`;
  return new Response(svg, {
    headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=86400' },
  });
}

function hashHue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}
