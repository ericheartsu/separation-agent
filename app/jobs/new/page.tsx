import { db } from '@/lib/db';
import { tags } from '@/lib/db/schema';
import { PageHeader, Breadcrumbs, Card } from '@/components/ui';
import { DriveJobBuilder } from './drive-builder';

export const dynamic = 'force-dynamic';

export default async function NewJobPage() {
  const allTags = await db.select().from(tags).orderBy(tags.category, tags.name);
  const grouped = allTags.reduce((acc, t) => {
    (acc[t.category] ||= []).push(t);
    return acc;
  }, {} as Record<string, typeof allTags>);

  const driveRootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '';

  return (
    <div className="p-8 max-w-5xl">
      <Breadcrumbs items={[{ href: '/jobs', label: 'Library' }, { label: 'Add Past Job' }]} />
      <PageHeader
        title="Add Past Job"
        subtitle="Browse Drive → pick a customer → pick a design → confirm the auto-detected triplet."
      />
      <Card>
        <DriveJobBuilder
          tagsByCategory={grouped}
          driveRootFolderId={driveRootFolderId}
        />
      </Card>
    </div>
  );
}
