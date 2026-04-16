'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Critique, Correction, User } from '@/lib/db/schema';
import { Card } from '@/components/ui';
import { Sparkles, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type CritiqueWithCorrections = Critique & {
  corrections: (Correction & { user: User })[];
};

export function CritiquePanel({
  jobId, critiques,
}: { jobId: string; critiques: CritiqueWithCorrections[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const runCritique = () => {
    startTransition(async () => {
      const res = await fetch(`/api/jobs/${jobId}/critique`, { method: 'POST' });
      if (res.ok) router.refresh();
    });
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Sparkles size={14} className="text-craft-cyan" />
          Agent Critiques
        </h3>
        <button onClick={runCritique} disabled={pending} className="btn-primary text-xs">
          {pending ? <><Loader2 size={12} className="animate-spin" /> Running…</> : <><Sparkles size={12} /> Run new critique</>}
        </button>
      </div>

      {critiques.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500">
          No critiques yet. Click "Run new critique" to have the agent analyze this job.
        </div>
      ) : (
        <div className="space-y-6">
          {critiques.map(c => (
            <CritiqueCard key={c.id} critique={c} />
          ))}
        </div>
      )}
    </Card>
  );
}

function CritiqueCard({ critique }: { critique: CritiqueWithCorrections }) {
  const [showCorrection, setShowCorrection] = useState(false);
  return (
    <div className="border border-[#2A2A2A] rounded-md">
      <div className="px-4 py-2 border-b border-[#2A2A2A] flex items-center justify-between text-xs">
        <div className="text-gray-400">
          <span className="font-mono">{critique.modelVersion}</span> · prompt {critique.promptVersion}
        </div>
        <div className="text-gray-500">{formatDistanceToNow(critique.createdAt, { addSuffix: true })}</div>
      </div>

      <div className="p-4 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
        {critique.text}
      </div>

      {critique.findings && (
        <div className="px-4 pb-4">
          <div className="text-[10px] uppercase text-gray-500 mb-2">Structured findings</div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-gray-500">Underbase</div>
              <div className="text-gray-200">{critique.findings.underbase_strategy ?? '—'}</div>
            </div>
            <div>
              <div className="text-gray-500">Difficulty (agent)</div>
              <div className="text-gray-200">{critique.findings.overall_difficulty}/5</div>
            </div>
            <div className="col-span-2">
              <div className="text-gray-500 mb-1">Color palette</div>
              <div className="flex flex-wrap gap-1">
                {critique.findings.color_palette.map((c, i) => (
                  <span key={i} className="badge-grey">{c.name} <span className="text-gray-500">· {c.role}</span></span>
                ))}
              </div>
            </div>
            {critique.findings.risks.length > 0 && (
              <div className="col-span-2">
                <div className="text-gray-500 mb-1">Risks</div>
                <ul className="space-y-1">
                  {critique.findings.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className={cn(
                        'badge text-[9px] mt-0.5',
                        r.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                        r.severity === 'med' ? 'bg-craft-orange/20 text-craft-orange' :
                        'bg-yellow-500/10 text-yellow-300'
                      )}>{r.severity}</span>
                      <span className="text-gray-300"><b>{r.area}:</b> {r.explanation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Existing corrections */}
      {critique.corrections.length > 0 && (
        <div className="border-t border-[#2A2A2A] bg-[#0A0A0A] px-4 py-3 space-y-3">
          <div className="text-[10px] uppercase text-gray-500">Trainer corrections</div>
          {critique.corrections.map(corr => (
            <div key={corr.id} className="text-xs">
              <div className="flex items-center gap-2 mb-1">
                <VerdictBadge verdict={corr.verdict} />
                <span className="text-gray-400">{corr.user.name}</span>
                <span className="text-gray-600">· {formatDistanceToNow(corr.createdAt, { addSuffix: true })}</span>
              </div>
              {corr.whatAgentMissed && (
                <div className="text-gray-300 ml-1"><b className="text-craft-cyan">Missed:</b> {corr.whatAgentMissed}</div>
              )}
              {corr.whatAgentGotWrong && (
                <div className="text-gray-300 ml-1"><b className="text-red-400">Wrong:</b> {corr.whatAgentGotWrong}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Correction form */}
      <div className="border-t border-[#2A2A2A] p-3">
        {!showCorrection ? (
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">How did the agent do?</div>
            <div className="flex gap-1">
              <CorrectionTrigger verdict="correct" onClick={() => submitQuick(critique.id, 'correct')} />
              <CorrectionTrigger verdict="partial" onClick={() => setShowCorrection(true)} />
              <CorrectionTrigger verdict="wrong" onClick={() => setShowCorrection(true)} />
            </div>
          </div>
        ) : (
          <CorrectionForm critiqueId={critique.id} onClose={() => setShowCorrection(false)} />
        )}
      </div>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: 'correct' | 'partial' | 'wrong' }) {
  if (verdict === 'correct') return <span className="badge-lime flex items-center gap-1"><CheckCircle2 size={10} /> Spot on</span>;
  if (verdict === 'partial') return <span className="badge-orange flex items-center gap-1"><AlertTriangle size={10} /> Partial</span>;
  return <span className="badge bg-red-500/20 text-red-400 flex items-center gap-1"><XCircle size={10} /> Wrong</span>;
}

function CorrectionTrigger({
  verdict, onClick,
}: { verdict: 'correct' | 'partial' | 'wrong'; onClick: () => void }) {
  const map = {
    correct: { icon: CheckCircle2, label: 'Spot on', cls: 'hover:bg-craft-lime/10 hover:text-craft-lime' },
    partial: { icon: AlertTriangle, label: 'Partial', cls: 'hover:bg-craft-orange/10 hover:text-craft-orange' },
    wrong: { icon: XCircle, label: 'Wrong', cls: 'hover:bg-red-500/10 hover:text-red-400' },
  };
  const { icon: Icon, label, cls } = map[verdict];
  return (
    <button
      onClick={onClick}
      className={cn('flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 transition-colors', cls)}
    >
      <Icon size={12} /> {label}
    </button>
  );
}

function CorrectionForm({ critiqueId, onClose }: { critiqueId: string; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [verdict, setVerdict] = useState<'partial' | 'wrong'>('partial');

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await fetch('/api/corrections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          critiqueId,
          verdict,
          whatAgentMissed: fd.get('missed') || null,
          whatAgentGotWrong: fd.get('wrong') || null,
        }),
      });
      onClose();
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-400">Verdict:</span>
        <button
          type="button"
          onClick={() => setVerdict('partial')}
          className={cn(
            'px-2 py-1 rounded',
            verdict === 'partial' ? 'bg-craft-orange/20 text-craft-orange' : 'text-gray-400'
          )}
        >Partial</button>
        <button
          type="button"
          onClick={() => setVerdict('wrong')}
          className={cn(
            'px-2 py-1 rounded',
            verdict === 'wrong' ? 'bg-red-500/20 text-red-400' : 'text-gray-400'
          )}
        >Wrong</button>
      </div>
      <textarea
        name="missed"
        rows={2}
        className="input text-xs"
        placeholder="What did the agent miss? (e.g. 'Didn't mention the orange is a Pantone match')"
      />
      <textarea
        name="wrong"
        rows={2}
        className="input text-xs"
        placeholder="What did the agent get wrong? (e.g. 'Said sim-process — actually spot color w/ halftone gradient')"
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-secondary text-xs">Cancel</button>
        <button type="submit" disabled={pending} className="btn-primary text-xs disabled:opacity-50">
          {pending ? 'Saving…' : 'Save correction'}
        </button>
      </div>
    </form>
  );
}

async function submitQuick(critiqueId: string, verdict: 'correct') {
  await fetch('/api/corrections', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ critiqueId, verdict }),
  });
  window.location.reload();
}
