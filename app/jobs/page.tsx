import { db } from '@/lib/db';
import { jobs, jobTags, tags } from '@/lib/db/schema';
import { desc, like, eq, and, sql } from 'drizzle-orm';
import Link from 'next/link';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { difficultyColor, difficultyLabel, methodLabel } from '@/lib/utils';
import { Library, PlusCircle, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function JobLibrary({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; method?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const tagFilter = params.tag;
  const methodFilter = params.method;

  const allTags = await db.select().from(tags).orderBy(tags.category, tags.name);

  const conditions = [];
  if (q) conditions.push(like(jobs.customerName, `%${q}%`));
  if (methodFilter) conditions.push(eq(jobs.printMethod, methodFilter as any));

  let jobIds: string[] | null = null;
  if (tagFilter) {
    const tagged = await db.select({ jobId: jobTags.jobId })
      .from(jobTags)
      .innerJoin(tags, eq(tags.id, jobTags.tagId))
      .where(eq(tags.name, tagFilter));
    jobIds = tagged.map(t => t.jobId);
    if (jobIds.length === 0) jobIds = ['__none__'];
  }

  const filtered = await db.query.jobs.findMany({
    where: and(
      ...conditions,
      jobIds ? sql`${jobs.id} in (${sql.join(jobIds.map(id => sql`${id}`), sql`, `)})` : undefined,
    ),
    orderBy: [desc(jobs.createdAt)],
    with: {
      tags: { with: { tag: true } },
      critiques: { limit: 1 },
      files: true,
    },
  });

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader
        title="Job Library"
        subtitle={`${filtered.length} past separation${filtered.length === 1 ? '' : 's'} in the training set.`}
        action={
          <Link href="/jobs/new" className="btn-primary">
            <PlusCircle size={16} /> Add Past Job
          </Link>
        }
      />

      <Card className="mb-6">
        <form className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Search customer</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Mountain West Brewing…"
                className="input pl-9"
              />
            </div>
          </div>
          <div className="min-w-[180px]">
            <label className="label">Print method</label>
            <select name="method" defaultValue={methodFilter} className="input">
              <option value="">All methods</option>
              <option value="simulated_process">Simulated Process</option>
              <option value="spot_color">Spot Color</option>
              <option value="four_color_process">4-Color Process</option>
              <option value="discharge">Discharge</option>
              <option value="index">Index</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="min-w-[180px]">
            <label className="label">Tag</label>
            <select name="tag" defaultValue={tagFilter} className="input">
              <option value="">All tags</option>
              {allTags.map(t => (
                <option key={t.id} value={t.name}>
                  {t.category} · {t.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">Filter</button>
          {(q || tagFilter || methodFilter) && (
            <Link href="/jobs" className="btn-secondary">Clear</Link>
          )}
        </form>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Library size={32} />}
          title="No jobs match your filters"
          description="Try clearing filters, or add a new past job to start training the agent."
          action={<Link href="/jobs/new" className="btn-primary"><PlusCircle size={16} /> Add Past Job</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(j => (
            <Link
              key={j.id}
              href={`/jobs/${j.id}`}
              className="panel p-4 hover:border-craft-cyan/50 transition-colors flex flex-col"
            >
              <div className="aspect-[4/3] bg-[#0A0A0A] rounded border border-[#2A2A2A] mb-3 overflow-hidden grid grid-cols-3">
                {j.files.map(f => (
                  <div
                    key={f.id}
                    className="border-r border-[#2A2A2A] last:border-r-0 flex items-center justify-center text-[10px] text-gray-600"
                  >
                    {f.kind === 'CUSTOMER' ? 'CUST' : f.kind === 'MOCKUP' ? 'MOCK' : 'SEP'}
                  </div>
                ))}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{j.customerName}</div>
                  <div className="text-xs text-gray-500 truncate">{j.jobName}</div>
                </div>
                <span className={difficultyColor(j.difficulty)}>{difficultyLabel(j.difficulty)}</span>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                {methodLabel(j.printMethod)} · {j.colorCount}c · {j.garmentColor}
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {j.tags.slice(0, 4).map(({ tag }) => (
                  <span key={tag.id} className="badge-grey">{tag.name}</span>
                ))}
                {j.tags.length > 4 && (
                  <span className="badge-grey">+{j.tags.length - 4}</span>
                )}
              </div>
              <div className="text-[10px] text-gray-600 mt-3 pt-3 border-t border-[#2A2A2A] flex items-center justify-between">
                <span>{formatDistanceToNow(j.createdAt, { addSuffix: true })}</span>
                {j.critiques.length > 0 && <span className="text-craft-cyan">Critiqued</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
