import { db } from '@/lib/db';
import { garmentTemplates } from '@/lib/db/schema';
import { PageHeader, Breadcrumbs, Card } from '@/components/ui';
import { GenerateMockupForm } from './form';

export const dynamic = 'force-dynamic';

export default async function NewMockupPage() {
  const templates = await db.query.garmentTemplates.findMany({
    with: { zones: true },
  });

  return (
    <div className="p-8 max-w-4xl">
      <Breadcrumbs items={[{ href: '/mockups', label: 'Mockups' }, { label: 'Generate New' }]} />
      <PageHeader
        title="Generate Mockup"
        subtitle="Build a client mockup from a job spec, using Craft's house garment templates."
      />
      <Card>
        <GenerateMockupForm templates={templates} />
      </Card>
    </div>
  );
}
