import { db } from '@/lib/db';
import { garmentTemplates } from '@/lib/db/schema';
import Link from 'next/link';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { FileImage, Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const list = await db.query.garmentTemplates.findMany({
    with: { zones: true },
  });

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Garment Templates"
        subtitle={`${list.length} template${list.length === 1 ? '' : 's'} for the mockup generator.`}
        action={
          <Link href="/admin/templates/new" className="btn-primary">
            <Plus size={16} /> New Template
          </Link>
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon={<FileImage size={32} />}
          title="No templates yet"
          description="Add a garment template (PSD or PNG) and define its print zones to enable the mockup generator."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map(t => (
            <Link key={t.id} href={`/admin/templates/${t.id}`} className="panel p-4 hover:border-craft-cyan/50 transition-colors">
              <div className="aspect-square bg-[#0A0A0A] rounded border border-[#2A2A2A] mb-3 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.baseImageUrl} alt={t.name} className="w-full h-full object-contain" />
              </div>
              <div className="font-medium truncate">{t.name}</div>
              <div className="text-xs text-gray-500 font-mono">{t.garmentStyleSku}</div>
              <div className="text-[10px] text-gray-600 mt-2">
                {t.zones.length} print zone{t.zones.length === 1 ? '' : 's'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
