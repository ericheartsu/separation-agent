import { NextRequest } from 'next/server';
import { synthTemplate } from '@/lib/mockup/synthetic-template';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const style = (searchParams.get('style') ?? 'tee') as 'tee' | 'hoodie';
  const color = searchParams.get('color') ?? 'black';

  const png = await synthTemplate({ style, color });
  return new Response(new Uint8Array(png), {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=86400',
    },
  });
}
