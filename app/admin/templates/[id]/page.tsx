import { db } from '@/lib/db';
import { garmentTemplates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { PageHeader, Breadcrumbs, Card } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function TemplateDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await db.query.garmentTemplates.findFirst({
    where: eq(garmentTemplates.id, id),
    with: { zones: true },
  });
  if (!template) notFound();

  return (
    <div className="p-8 max-w-5xl">
      <Breadcrumbs items={[
        { href: '/admin/templates', label: 'Templates' },
        { label: template.name },
      ]} />
      <PageHeader title={template.name} subtitle={template.garmentStyleSku} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-medium mb-3">Template Image</h3>
          <div className="aspect-square bg-[#0A0A0A] rounded border border-[#2A2A2A] overflow-hidden relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={template.baseImageUrl} alt={template.name} className="w-full h-full object-contain" />
            {template.zones.map(z => {
              // assume template renders at 1000x1000 for marker overlay
              const left = (z.x / 1000) * 100;
              const top = (z.y / 1000) * 100;
              const width = (z.width / 1000) * 100;
              const height = (z.height / 1000) * 100;
              return (
                <div
                  key={z.id}
                  className="absolute border-2 border-craft-cyan/60 bg-craft-cyan/5"
                  style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                >
                  <div className="absolute -top-5 left-0 text-[10px] text-craft-cyan font-mono bg-black/80 px-1.5 py-0.5 rounded">
                    {z.name}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-medium mb-3">Print Zones ({template.zones.length})</h3>
          <div className="space-y-3">
            {template.zones.map(z => (
              <div key={z.id} className="border border-[#2A2A2A] rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-sm">{z.name}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{z.id.slice(0, 8)}</div>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="flex justify-between"><dt className="text-gray-500">Position</dt><dd>{z.x}, {z.y}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Pixel size</dt><dd>{z.width}×{z.height}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Max print</dt><dd>{z.maxPrintWidthIn}″ × {z.maxPrintHeightIn}″</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">PPI</dt><dd>{z.pixelsPerInch}</dd></div>
                </dl>
              </div>
            ))}
            <div className="text-xs text-gray-500 text-center py-3 border border-dashed border-[#2A2A2A] rounded">
              Zone editor (drag to draw rectangles) — TBD
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
