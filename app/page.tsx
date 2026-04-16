import { db } from '@/lib/db';
import { jobs, critiques, corrections, generatedMockups } from '@/lib/db/schema';
import { sql, desc } from 'drizzle-orm';
import { PageHeader, Stat, Card } from '@/components/ui';
import Link from 'next/link';
import { Library, Sparkles, BookOpen, MessageSquare, ChevronRight } from 'lucide-react';
import { difficultyColor, difficultyLabel, methodLabel } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const [jobCount] = await db.select({ count: sql<number>`count(*)` }).from(jobs);
  const [critiqueCount] = await db.select({ count: sql<number>`count(*)` }).from(critiques);
  const [correctionCount] = await db.select({ count: sql<number>`count(*)` }).from(corrections);
  const [mockupCount] = await db.select({ count: sql<number>`count(*)` }).from(generatedMockups);

  const recentJobs = await db.query.jobs.findMany({
    orderBy: [desc(jobs.createdAt)],
    limit: 5,
    with: { critiques: { limit: 1 } },
  });

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Separation Agent"
        subtitle="An expert artwork separator that learns from how Craft MFG actually works."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Past Jobs" value={jobCount.count} hint="In the training library" />
        <Stat label="Critiques" value={critiqueCount.count} hint="Run by the agent" />
        <Stat label="Corrections" value={correctionCount.count} hint="From human trainers" />
        <Stat label="Mockups Made" value={mockupCount.count} hint="Generated this period" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <QuickAction
          href="/jobs/new"
          icon={<Library size={20} />}
          title="Add a past job"
          description="Drop in customer file + mockup + separation. Teaches the agent how Craft separates."
        />
        <QuickAction
          href="/analyze"
          icon={<BookOpen size={20} />}
          title="Analyze new client art"
          description="Drop in a fresh customer file. Agent predicts color count, technique, and likely problem areas."
        />
        <QuickAction
          href="/mockups/new"
          icon={<Sparkles size={20} />}
          title="Generate a mockup"
          description="Pull a job from HQ Print and build a client-ready mockup on Craft templates."
        />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Recent Jobs</h2>
          <Link href="/jobs" className="text-sm text-craft-cyan hover:underline">
            See all →
          </Link>
        </div>
        <div className="divide-y divide-[#2A2A2A] -mx-5">
          {recentJobs.map((j) => (
            <Link
              key={j.id}
              href={`/jobs/${j.id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-[#1C1C1C] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{j.customerName}</span>
                  <span className="text-gray-500 text-sm truncate">· {j.jobName}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                  <span>{methodLabel(j.printMethod)}</span>
                  <span>·</span>
                  <span>{j.colorCount}c</span>
                  <span>·</span>
                  <span>{j.garmentColor}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(j.createdAt, { addSuffix: true })}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={difficultyColor(j.difficulty)}>{difficultyLabel(j.difficulty)}</span>
                {j.critiques.length > 0 && (
                  <span className="badge-cyan flex items-center gap-1">
                    <MessageSquare size={10} /> Critiqued
                  </span>
                )}
                <ChevronRight size={16} className="text-gray-600" />
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}

function QuickAction({
  href, icon, title, description,
}: { href: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link href={href} className="panel p-5 hover:border-craft-cyan/50 transition-colors group">
      <div className="text-craft-cyan mb-3">{icon}</div>
      <div className="font-medium group-hover:text-craft-cyan transition-colors">{title}</div>
      <div className="text-sm text-gray-400 mt-1">{description}</div>
    </Link>
  );
}
