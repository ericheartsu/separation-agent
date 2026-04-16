import { db } from '@/lib/db';
import { tags } from '@/lib/db/schema';
import { PageHeader, Breadcrumbs, Card } from '@/components/ui';
import { NewJobForm } from './form';

export const dynamic = 'force-dynamic';

export default async function NewJobPage() {
  const allTags = await db.select().from(tags).orderBy(tags.category, tags.name);
  const grouped = allTags.reduce((acc, t) => {
    (acc[t.category] ||= []).push(t);
    return acc;
  }, {} as Record<string, typeof allTags>);

  return (
    <div className="p-8 max-w-3xl">
      <Breadcrumbs items={[{ href: '/jobs', label: 'Library' }, { label: 'Add Past Job' }]} />
      <PageHeader
        title="Add Past Job"
        subtitle="Drop in the three files for one separation: customer, mockup, final separation."
      />
      <Card>
        <NewJobForm tagsByCategory={grouped} />
      </Card>
    </div>
  );
}
