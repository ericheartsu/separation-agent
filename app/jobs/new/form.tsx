'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FileImage, Upload, X, AlertCircle } from 'lucide-react';
import type { Tag } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

type FileKind = 'CUSTOMER' | 'MOCKUP' | 'SEPARATION';

interface MockDriveFile {
  id: string;
  name: string;
  mimeType: string;
  byteSize: number;
}

const KINDS: { kind: FileKind; label: string; description: string }[] = [
  { kind: 'CUSTOMER', label: 'Customer File', description: 'Original art the client sent' },
  { kind: 'MOCKUP', label: 'Mockup', description: 'What we showed the client' },
  { kind: 'SEPARATION', label: 'Final Separation', description: 'Hi-res print-ready separation' },
];

export function NewJobForm({ tagsByCategory }: { tagsByCategory: Record<string, Tag[]> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<FileKind, MockDriveFile | null>>({
    CUSTOMER: null,
    MOCKUP: null,
    SEPARATION: null,
  });
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  const onPickFile = (kind: FileKind) => {
    // mock: simulate Drive picker returning a file
    const fakeFile: MockDriveFile = {
      id: `mock-${kind.toLowerCase()}-${Date.now()}`,
      name: `${kind.toLowerCase()}-${Math.floor(Math.random() * 9999)}.psd`,
      mimeType: 'image/vnd.adobe.photoshop',
      byteSize: kind === 'SEPARATION' ? 142_000_000 : 24_000_000,
    };
    setFiles(prev => ({ ...prev, [kind]: fakeFile }));
  };

  const toggleTag = (id: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!files.CUSTOMER || !files.MOCKUP || !files.SEPARATION) {
      setError('All three files are required.');
      return;
    }
    const fd = new FormData(e.currentTarget);
    const payload = {
      customerName: fd.get('customerName'),
      jobName: fd.get('jobName'),
      poNumber: fd.get('poNumber'),
      garmentColor: fd.get('garmentColor'),
      garmentStyle: fd.get('garmentStyle'),
      colorCount: Number(fd.get('colorCount')),
      printMethod: fd.get('printMethod'),
      difficulty: Number(fd.get('difficulty')),
      notes: fd.get('notes'),
      files,
      tagIds: Array.from(selectedTags),
    };
    startTransition(async () => {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `Save failed (${res.status})`);
        return;
      }
      const { id } = await res.json();
      router.push(`/jobs/${id}`);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* Files */}
      <section>
        <h2 className="text-sm font-medium mb-3">Files (from Google Drive)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {KINDS.map(({ kind, label, description }) => {
            const f = files[kind];
            return (
              <div key={kind} className="border border-[#2A2A2A] rounded-md p-3">
                <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
                <div className="text-[11px] text-gray-600 mb-3">{description}</div>
                {f ? (
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <FileImage size={14} className="text-craft-cyan shrink-0" />
                      <span className="truncate flex-1" title={f.name}>{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setFiles(p => ({ ...p, [kind]: null }))}
                        className="text-gray-500 hover:text-red-400"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="text-[10px] text-gray-600 mt-1">
                      {(f.byteSize / 1024 / 1024).toFixed(1)} MB
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPickFile(kind)}
                    className="w-full border border-dashed border-[#2A2A2A] rounded p-4 text-xs text-gray-500
                               hover:border-craft-cyan hover:text-craft-cyan transition-colors flex flex-col items-center gap-1"
                  >
                    <Upload size={16} />
                    Pick from Drive
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Mock mode: clicking "Pick from Drive" generates a placeholder. With real Drive creds, this opens the Google Drive picker.
        </p>
      </section>

      {/* Job basics */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Customer</label>
          <input name="customerName" required className="input" placeholder="Mountain West Brewing" />
        </div>
        <div>
          <label className="label">Job name</label>
          <input name="jobName" required className="input" placeholder="Smoke Series Tee" />
        </div>
        <div>
          <label className="label">PO number</label>
          <input name="poNumber" className="input" placeholder="MWB-2026-0142" />
        </div>
        <div>
          <label className="label">Garment color</label>
          <input name="garmentColor" required className="input" placeholder="Black" />
        </div>
        <div>
          <label className="label">Garment style / SKU</label>
          <input name="garmentStyle" className="input" placeholder="Bella+Canvas 3001" />
        </div>
        <div>
          <label className="label">Print method</label>
          <select name="printMethod" required defaultValue="" className="input">
            <option value="" disabled>Pick one</option>
            <option value="spot_color">Spot Color</option>
            <option value="simulated_process">Simulated Process</option>
            <option value="four_color_process">4-Color Process (CMYK)</option>
            <option value="index">Index</option>
            <option value="discharge">Discharge</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="label">Color count</label>
          <input name="colorCount" type="number" min={1} max={12} required className="input" defaultValue={4} />
        </div>
        <div>
          <label className="label">Difficulty</label>
          <select name="difficulty" required defaultValue={3} className="input">
            <option value={1}>1 — Easy</option>
            <option value={2}>2 — Light</option>
            <option value={3}>3 — Standard</option>
            <option value={4}>4 — Tricky</option>
            <option value={5}>5 — Nightmare</option>
          </select>
        </div>
      </section>

      {/* Notes */}
      <section>
        <label className="label">Notes — what was tricky and how you solved it</label>
        <textarea
          name="notes"
          rows={4}
          className="input"
          placeholder="Client sent low-res JPG, had to rebuild the smoke effect from scratch. Used a 55-line halftone at 22.5° on the grey to avoid moire with the white underbase…"
        />
        <p className="text-xs text-gray-500 mt-1">
          Be specific. "It was hard" teaches the agent nothing. "1px choke on the white underbase to keep registration tight on the small text" is gold.
        </p>
      </section>

      {/* Tags */}
      <section>
        <label className="label">Tags</label>
        <div className="space-y-3">
          {Object.entries(tagsByCategory).map(([cat, list]) => (
            <div key={cat}>
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">{cat.replace('_', ' ')}</div>
              <div className="flex flex-wrap gap-1.5">
                {list.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className={cn(
                      'badge cursor-pointer transition-colors',
                      selectedTags.has(t.id)
                        ? 'bg-craft-cyan text-black'
                        : 'badge-grey hover:bg-gray-600'
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md p-3">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => router.push('/jobs')} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
          {pending ? 'Saving…' : 'Save Job'}
        </button>
      </div>
    </form>
  );
}
