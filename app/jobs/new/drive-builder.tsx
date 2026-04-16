'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  FolderOpen, ChevronRight, FileImage, Loader2, AlertCircle, RefreshCw,
  CheckCircle2, ChevronLeft, Search,
} from 'lucide-react';
import type { Tag } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

type FileKind = 'CUSTOMER' | 'MOCKUP' | 'SEPARATION';

interface DriveFolder { id: string; name: string }
interface DriveFile { id: string; name: string; mimeType: string; size: number; modifiedTime: string }

interface ListResponse { folders: DriveFolder[]; files: DriveFile[] }

interface TripletResponse {
  customer: { id: string; name: string; mimeType: string; size: number } | null;
  mockup:   { id: string; name: string; mimeType: string; size: number } | null;
  separation: { id: string; name: string; mimeType: string; size: number } | null;
  diagnostics: {
    customerSubfolderId: string | null;
    mockupSubfolderId: string | null;
    sepSubfolderId: string | null;
    customerCandidates: number;
    mockupCandidates: number;
    sepCandidates: number;
  };
}

interface PickedFile {
  id: string; name: string; mimeType: string; byteSize: number;
}

type Step = 'pick-customer' | 'pick-design' | 'confirm-triplet' | 'metadata';

export function DriveJobBuilder({
  tagsByCategory, driveRootFolderId,
}: { tagsByCategory: Record<string, Tag[]>; driveRootFolderId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('pick-customer');

  // selections
  const [customer, setCustomer] = useState<DriveFolder | null>(null);
  const [design, setDesign] = useState<DriveFolder | null>(null);
  const [picks, setPicks] = useState<Record<FileKind, PickedFile | null>>({
    CUSTOMER: null, MOCKUP: null, SEPARATION: null,
  });

  // metadata
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!driveRootFolderId) {
    return (
      <div className="flex items-start gap-3 text-sm text-craft-orange bg-craft-orange/10 border border-craft-orange/30 rounded p-3">
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
        <div>
          <code>GOOGLE_DRIVE_ROOT_FOLDER_ID</code> is not configured. Set it in Vercel
          environment variables and redeploy.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Stepper step={step} customer={customer} design={design} />

      {step === 'pick-customer' && (
        <PickFolder
          title="Pick a customer"
          folderId={driveRootFolderId}
          showUnderscored
          onPick={(f) => { setCustomer(f); setStep('pick-design'); }}
        />
      )}

      {step === 'pick-design' && customer && (
        <PickFolder
          title={`Pick a design from ${customer.name}`}
          folderId={customer.id}
          showUnderscored
          onPick={(f) => { setDesign(f); setStep('confirm-triplet'); }}
          onBack={() => { setCustomer(null); setStep('pick-customer'); }}
        />
      )}

      {step === 'confirm-triplet' && design && (
        <ConfirmTriplet
          designFolder={design}
          picks={picks}
          setPicks={setPicks}
          onContinue={() => setStep('metadata')}
          onBack={() => { setDesign(null); setStep('pick-design'); }}
        />
      )}

      {step === 'metadata' && customer && design && (
        <MetadataForm
          customerName={customer.name}
          designName={design.name}
          tagsByCategory={tagsByCategory}
          selectedTags={selectedTags}
          setSelectedTags={setSelectedTags}
          pending={pending}
          error={saveError}
          onBack={() => setStep('confirm-triplet')}
          onSubmit={(meta) => {
            if (!picks.CUSTOMER || !picks.MOCKUP || !picks.SEPARATION) {
              setSaveError('All three files must be picked.');
              return;
            }
            setSaveError(null);
            startTransition(async () => {
              const res = await fetch('/api/jobs', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                  ...meta,
                  files: picks,
                  tagIds: Array.from(selectedTags),
                }),
              });
              if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                setSaveError(j.error || `Save failed (${res.status})`);
                return;
              }
              const { id } = await res.json();
              router.push(`/jobs/${id}`);
            });
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Stepper
// ─────────────────────────────────────────────────────────────────
function Stepper({ step, customer, design }: { step: Step; customer: DriveFolder | null; design: DriveFolder | null }) {
  const steps: { id: Step; label: string; sub?: string }[] = [
    { id: 'pick-customer', label: '1. Customer', sub: customer?.name },
    { id: 'pick-design', label: '2. Design', sub: design?.name },
    { id: 'confirm-triplet', label: '3. Files' },
    { id: 'metadata', label: '4. Save' },
  ];
  const currentIdx = steps.findIndex(s => s.id === step);
  return (
    <div className="flex items-center gap-1 text-xs">
      {steps.map((s, i) => {
        const active = i === currentIdx;
        const done = i < currentIdx;
        return (
          <div key={s.id} className="flex items-center gap-1">
            <div className={cn(
              'px-2.5 py-1 rounded',
              active && 'bg-craft-cyan text-black',
              done && 'bg-craft-cyan/20 text-craft-cyan',
              !active && !done && 'text-gray-500',
            )}>
              <span>{s.label}</span>
              {s.sub && <span className="opacity-70 ml-1.5 truncate max-w-[100px] inline-block align-bottom">· {s.sub}</span>}
            </div>
            {i < steps.length - 1 && <ChevronRight size={12} className="text-gray-700" />}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Folder picker
// ─────────────────────────────────────────────────────────────────
function PickFolder({
  title, folderId, showUnderscored, onPick, onBack,
}: {
  title: string;
  folderId: string;
  showUnderscored: boolean;
  onPick: (f: DriveFolder) => void;
  onBack?: () => void;
}) {
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/drive/folder/${folderId}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Drive list failed (${res.status})`);
      }
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [folderId]);

  const folders = (data?.folders ?? []).filter(f =>
    filter.trim() === '' || f.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="btn-secondary text-xs">
              <ChevronLeft size={12} /> Back
            </button>
          )}
          <button onClick={load} className="btn-secondary text-xs" title="Refresh">
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
          <Loader2 size={14} className="animate-spin" /> Reading from Drive…
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={load} className="btn-secondary text-xs">Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          {data && data.folders.length > 5 && (
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Filter folders…"
                className="input pl-9"
              />
            </div>
          )}

          <div className="border border-[#2A2A2A] rounded-md divide-y divide-[#1A1A1A] max-h-[480px] overflow-y-auto">
            {folders.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-500">
                {filter ? 'No folders match your filter.' : 'No subfolders here.'}
              </div>
            )}
            {folders.map(f => {
              const isUnderscored = f.name.startsWith('_');
              return (
                <button
                  key={f.id}
                  onClick={() => onPick(f)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1C1C1C] text-left transition-colors group"
                >
                  <FolderOpen size={16} className={cn(
                    isUnderscored ? 'text-gray-500' : 'text-craft-cyan',
                  )} />
                  <span className={cn(
                    'flex-1 text-sm truncate',
                    isUnderscored && 'text-gray-400',
                  )}>{f.name}</span>
                  {isUnderscored && (
                    <span className="text-[10px] text-gray-500 italic">reference asset</span>
                  )}
                  <ChevronRight size={14} className="text-gray-600 group-hover:text-craft-cyan" />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Confirm triplet
// ─────────────────────────────────────────────────────────────────
function ConfirmTriplet({
  designFolder, picks, setPicks, onContinue, onBack,
}: {
  designFolder: DriveFolder;
  picks: Record<FileKind, PickedFile | null>;
  setPicks: (p: Record<FileKind, PickedFile | null>) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [data, setData] = useState<TripletResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/drive/triplet/${designFolder.id}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Triplet detect failed (${res.status})`);
      }
      const json: TripletResponse = await res.json();
      setData(json);
      // auto-fill picks with the detected files
      setPicks({
        CUSTOMER: json.customer && {
          id: json.customer.id, name: json.customer.name,
          mimeType: json.customer.mimeType, byteSize: json.customer.size,
        },
        MOCKUP: json.mockup && {
          id: json.mockup.id, name: json.mockup.name,
          mimeType: json.mockup.mimeType, byteSize: json.mockup.size,
        },
        SEPARATION: json.separation && {
          id: json.separation.id, name: json.separation.name,
          mimeType: json.separation.mimeType, byteSize: json.separation.size,
        },
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [designFolder.id]);

  const allPicked = picks.CUSTOMER && picks.MOCKUP && picks.SEPARATION;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">Confirm files for {designFolder.name}</h3>
        <button onClick={onBack} className="btn-secondary text-xs"><ChevronLeft size={12} /> Back</button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center">
          <Loader2 size={14} className="animate-spin" /> Auto-detecting triplet…
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-3">
          <KindRow
            label="Customer Supplied Files"
            kind="CUSTOMER"
            subfolderId={data.diagnostics.customerSubfolderId}
            candidates={data.diagnostics.customerCandidates}
            picked={picks.CUSTOMER}
            onPick={(f) => setPicks({ ...picks, CUSTOMER: f })}
          />
          <KindRow
            label="Mockup"
            kind="MOCKUP"
            subfolderId={data.diagnostics.mockupSubfolderId}
            candidates={data.diagnostics.mockupCandidates}
            picked={picks.MOCKUP}
            onPick={(f) => setPicks({ ...picks, MOCKUP: f })}
          />
          <KindRow
            label="Separation"
            kind="SEPARATION"
            subfolderId={data.diagnostics.sepSubfolderId}
            candidates={data.diagnostics.sepCandidates}
            picked={picks.SEPARATION}
            onPick={(f) => setPicks({ ...picks, SEPARATION: f })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onBack} className="btn-secondary">Back</button>
            <button
              onClick={onContinue}
              disabled={!allPicked}
              className="btn-primary disabled:opacity-50"
            >
              Continue → Add metadata
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function KindRow({
  label, kind, subfolderId, candidates, picked, onPick,
}: {
  label: string;
  kind: FileKind;
  subfolderId: string | null;
  candidates: number;
  picked: PickedFile | null;
  onPick: (f: PickedFile | null) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const openPicker = async () => {
    if (!subfolderId) return;
    setShowPicker(true);
    if (files.length === 0) {
      setPickerLoading(true);
      try {
        const res = await fetch(`/api/drive/folder/${subfolderId}`);
        const j = await res.json();
        setFiles((j.files as DriveFile[]).sort(
          (a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime(),
        ));
      } finally {
        setPickerLoading(false);
      }
    }
  };

  if (!subfolderId) {
    return (
      <div className="border border-craft-orange/30 bg-craft-orange/5 rounded p-3">
        <div className="text-xs uppercase text-craft-orange mb-1">{label}</div>
        <div className="text-sm text-gray-300">
          ⚠ No matching subfolder found in this design folder.
          <span className="text-gray-500"> Expected something like "Customer Supplied Files", "Mockups", or "Seps".</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[#2A2A2A] rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-xs uppercase text-gray-500">{label}</div>
          <div className="text-[10px] text-gray-600">
            {candidates} file{candidates === 1 ? '' : 's'} in subfolder
          </div>
        </div>
        {!showPicker && candidates > 1 && (
          <button onClick={openPicker} className="text-[10px] text-craft-cyan hover:underline">
            Pick a different file
          </button>
        )}
      </div>

      {picked && !showPicker && (
        <div className="flex items-center gap-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded px-2 py-1.5 text-xs">
          <FileImage size={14} className="text-craft-cyan" />
          <span className="font-mono truncate flex-1" title={picked.name}>{picked.name}</span>
          <span className="text-gray-500">{(picked.byteSize / 1024 / 1024).toFixed(1)} MB</span>
          <CheckCircle2 size={14} className="text-craft-lime" />
        </div>
      )}

      {!picked && !showPicker && (
        <div className="text-xs text-gray-500 italic">No file detected — click "Pick a different file" to choose manually.</div>
      )}

      {showPicker && (
        <div className="space-y-1">
          {pickerLoading && <div className="text-xs text-gray-500"><Loader2 size={12} className="inline animate-spin mr-1" /> Loading…</div>}
          {!pickerLoading && files.map(f => (
            <button
              key={f.id}
              onClick={() => {
                onPick({ id: f.id, name: f.name, mimeType: f.mimeType, byteSize: f.size });
                setShowPicker(false);
              }}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors',
                picked?.id === f.id ? 'bg-craft-cyan/20 text-craft-cyan' : 'hover:bg-[#1C1C1C]',
              )}
            >
              <FileImage size={12} />
              <span className="font-mono truncate flex-1" title={f.name}>{f.name}</span>
              <span className="text-gray-500">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
            </button>
          ))}
          <button onClick={() => setShowPicker(false)} className="text-[10px] text-gray-500 hover:text-white mt-1">
            Close picker
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Metadata form
// ─────────────────────────────────────────────────────────────────
function MetadataForm({
  customerName, designName, tagsByCategory, selectedTags, setSelectedTags,
  pending, error, onBack, onSubmit,
}: {
  customerName: string;
  designName: string;
  tagsByCategory: Record<string, Tag[]>;
  selectedTags: Set<string>;
  setSelectedTags: (s: Set<string>) => void;
  pending: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: (meta: any) => void;
}) {
  const toggleTag = (id: string) => {
    const next = new Set(selectedTags);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedTags(next);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      customerName: fd.get('customerName'),
      jobName: fd.get('jobName'),
      poNumber: fd.get('poNumber'),
      garmentColor: fd.get('garmentColor'),
      garmentStyle: fd.get('garmentStyle'),
      colorCount: Number(fd.get('colorCount')),
      printMethod: fd.get('printMethod'),
      difficulty: Number(fd.get('difficulty')),
      notes: fd.get('notes'),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="label">Customer</label>
          <input name="customerName" required defaultValue={customerName} className="input" />
        </div>
        <div>
          <label className="label">Job name</label>
          <input name="jobName" required defaultValue={designName} className="input" />
        </div>
        <div>
          <label className="label">PO number</label>
          <input name="poNumber" className="input" placeholder="optional" />
        </div>
        <div>
          <label className="label">Garment color</label>
          <input name="garmentColor" required className="input" placeholder="Black, Athletic Heather…" />
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
      </div>

      <div>
        <label className="label">Notes — what was tricky and how it was solved</label>
        <textarea name="notes" rows={4} className="input"
          placeholder="Be specific. '1px choke on the white underbase to keep registration tight on the small text' beats 'it was hard'." />
      </div>

      <div>
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
                      selectedTags.has(t.id) ? 'bg-craft-cyan text-black' : 'badge-grey hover:bg-gray-600',
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md p-3">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onBack} className="btn-secondary">← Back</button>
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-50">
          {pending ? 'Saving…' : 'Save Job'}
        </button>
      </div>
    </form>
  );
}
