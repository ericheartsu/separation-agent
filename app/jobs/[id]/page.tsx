import { db } from '@/lib/db';
import { jobs } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { PageHeader, Breadcrumbs, Card } from '@/components/ui';
import { JobViewer } from './viewer';
import { CritiquePanel } from './critique-panel';
import { difficultyColor, difficultyLabel, formatBytes, methodLabel } from '@/lib/utils';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function JobDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, id),
    with: {
      files: true,
      tags: { with: { tag: true } },
      critiques: {
        orderBy: (c, { desc }) => [desc(c.createdAt)],
        with: { corrections: { with: { user: true } } },
      },
      createdBy: true,
    },
  });

  if (!job) notFound();

  return (
    <div className="p-8 max-w-7xl">
      <Breadcrumbs items={[{ href: '/jobs', label: 'Library' }, { label: job.customerName }]} />
      <PageHeader
        title={`${job.customerName} — ${job.jobName}`}
        subtitle={`${methodLabel(job.printMethod)} · ${job.colorCount} colors · ${job.garmentColor} ${job.garmentStyle ?? ''}`}
        action={
          <span className={difficultyColor(job.difficulty)}>
            {difficultyLabel(job.difficulty)}
          </span>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <JobViewer files={job.files} />

          <Card>
            <h3 className="text-sm font-medium mb-3">Trainer notes</h3>
            {job.notes ? (
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{job.notes}</p>
            ) : (
              <p className="text-sm text-gray-500 italic">No notes were added for this job.</p>
            )}
          </Card>

          <CritiquePanel jobId={job.id} critiques={job.critiques} />
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Card>
            <h3 className="text-sm font-medium mb-3">Spec</h3>
            <dl className="text-sm space-y-2">
              <Row k="PO #" v={job.poNumber || '—'} />
              <Row k="Garment" v={`${job.garmentColor} ${job.garmentStyle ?? ''}`} />
              <Row k="Print method" v={methodLabel(job.printMethod)} />
              <Row k="Colors" v={String(job.colorCount)} />
              <Row k="Difficulty" v={`${job.difficulty}/5 · ${difficultyLabel(job.difficulty)}`} />
              <Row k="Created" v={format(job.createdAt, 'MMM d, yyyy')} />
              <Row k="By" v={job.createdBy?.name ?? '—'} />
            </dl>
          </Card>

          <Card>
            <h3 className="text-sm font-medium mb-3">Files</h3>
            <div className="space-y-2 text-xs">
              {job.files.map(f => (
                <div key={f.id} className="border border-[#2A2A2A] rounded p-2">
                  <div className="text-[10px] text-gray-500 uppercase">{f.kind}</div>
                  <div className="truncate font-mono text-gray-300" title={f.driveFileName}>
                    {f.driveFileName}
                  </div>
                  <div className="text-gray-500 mt-1">{formatBytes(f.byteSize)}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-medium mb-3">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {job.tags.length === 0 && <span className="text-xs text-gray-500">No tags</span>}
              {job.tags.map(({ tag }) => (
                <span key={tag.id} className="badge-grey" title={tag.description ?? ''}>
                  {tag.name}
                </span>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{k}</dt>
      <dd className="text-gray-200 text-right">{v}</dd>
    </div>
  );
}
