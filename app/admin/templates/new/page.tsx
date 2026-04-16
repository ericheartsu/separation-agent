import { PageHeader, Breadcrumbs, Card } from '@/components/ui';
import { AlertCircle } from 'lucide-react';

export default function NewTemplatePage() {
  return (
    <div className="p-8 max-w-2xl">
      <Breadcrumbs items={[
        { href: '/admin/templates', label: 'Templates' },
        { label: 'New' },
      ]} />
      <PageHeader title="Add Garment Template" />
      <Card>
        <div className="flex items-start gap-3 text-sm text-craft-orange bg-craft-orange/10 border border-craft-orange/30 rounded p-3 mb-6">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            Template upload + zone editor will land in the next sprint.
            For now, two synthetic templates (Bella+Canvas 3001 tee, Independent SS4500 hoodie)
            are pre-seeded so you can use the mockup generator end-to-end.
          </div>
        </div>
        <div className="space-y-3 text-sm text-gray-400">
          <p>The full template flow will support:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Upload PSD or PNG of the garment</li>
            <li>Optionally upload a print-area mask</li>
            <li>Optionally upload a displacement map for fabric realism</li>
            <li>Define print zones by drawing rectangles directly on the template</li>
            <li>Set max print dimensions per zone (inches) + pixels-per-inch</li>
            <li>Pre-render per-color variants (for cleanest output) OR use live overlay</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
