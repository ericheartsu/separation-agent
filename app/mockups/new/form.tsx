'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, AlertCircle, Link2 } from 'lucide-react';
import type { GarmentTemplate, PrintZone } from '@/lib/db/schema';

type TemplateWithZones = GarmentTemplate & { zones: PrintZone[] };

const COMMON_INK_COLORS = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#0A0A0A' },
  { name: 'Athletic Gold', hex: '#CFA53B' },
  { name: 'Process Cyan', hex: '#00B5D8' },
  { name: 'Process Magenta', hex: '#E91E63' },
  { name: 'Athletic Red', hex: '#A02020' },
  { name: 'Forest Green', hex: '#1B5E20' },
  { name: 'Royal Blue', hex: '#1B2A4E' },
  { name: 'Orange', hex: '#FF6B35' },
];

export function GenerateMockupForm({ templates }: { templates: TemplateWithZones[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [zoneId, setZoneId] = useState(templates[0]?.zones[0]?.id ?? '');
  const [garmentColor, setGarmentColor] = useState('#0A0A0A');
  const [inkColors, setInkColors] = useState<string[]>(['#FFFFFF']);
  const [hqJobId, setHqJobId] = useState('');
  const [output, setOutput] = useState<string | null>(null);

  const template = templates.find(t => t.id === templateId);
  const zones = template?.zones ?? [];

  const onTemplateChange = (id: string) => {
    setTemplateId(id);
    const next = templates.find(t => t.id === id);
    setZoneId(next?.zones[0]?.id ?? '');
  };

  const toggleInk = (hex: string) => {
    setInkColors(prev => prev.includes(hex) ? prev.filter(c => c !== hex) : [...prev, hex]);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/mockups/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ templateId, zoneId, garmentColor, inkColors, hqJobId: hqJobId || null }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `Generate failed (${res.status})`);
        return;
      }
      const { url } = await res.json();
      setOutput(url);
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-5">
        {/* HQ Print job link */}
        <div>
          <label className="label">
            <Link2 size={10} className="inline mr-1" /> HQ Print Job # (optional)
          </label>
          <input
            value={hqJobId}
            onChange={e => setHqJobId(e.target.value)}
            className="input"
            placeholder="HQ-2026-0142"
          />
          <p className="text-[10px] text-gray-500 mt-1">
            Leave blank to make a standalone mockup. With a job # we'll pull garment + ink colors from HQ automatically (when wired).
          </p>
        </div>

        <div>
          <label className="label">Template</label>
          <select value={templateId} onChange={e => onTemplateChange(e.target.value)} className="input">
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Print zone</label>
          <select value={zoneId} onChange={e => setZoneId(e.target.value)} className="input">
            {zones.map(z => (
              <option key={z.id} value={z.id}>
                {z.name} — max {z.maxPrintWidthIn}" × {z.maxPrintHeightIn}"
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Garment color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={garmentColor}
              onChange={e => setGarmentColor(e.target.value)}
              className="h-10 w-16 bg-transparent border border-[#2A2A2A] rounded cursor-pointer"
            />
            <input
              value={garmentColor}
              onChange={e => setGarmentColor(e.target.value)}
              className="input flex-1 font-mono text-xs"
            />
          </div>
        </div>

        <div>
          <label className="label">Ink colors ({inkColors.length})</label>
          <div className="grid grid-cols-3 gap-2">
            {COMMON_INK_COLORS.map(c => {
              const on = inkColors.includes(c.hex);
              return (
                <button
                  type="button"
                  key={c.hex}
                  onClick={() => toggleInk(c.hex)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded border text-xs transition-colors ${
                    on ? 'border-craft-cyan bg-craft-cyan/10' : 'border-[#2A2A2A] hover:border-gray-600'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full border border-gray-700" style={{ background: c.hex }} />
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md p-3">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="btn-primary flex-1 disabled:opacity-50">
            {pending ? 'Generating…' : <><Sparkles size={16} /> Generate</>}
          </button>
          <button type="button" onClick={() => router.push('/mockups')} className="btn-secondary">
            Cancel
          </button>
        </div>
      </div>

      <div className="panel p-4">
        <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">Preview</div>
        <div className="aspect-square bg-[#0A0A0A] rounded border border-[#2A2A2A] flex items-center justify-center overflow-hidden">
          {output ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={output} alt="Generated mockup" className="w-full h-full object-contain" />
          ) : (
            <div className="text-center text-gray-500 text-xs px-4">
              <Sparkles size={32} className="mx-auto mb-2 opacity-40" />
              Generated mockup will appear here.<br />
              Phase 1.5: synthetic placeholder template + Sharp compositor.
            </div>
          )}
        </div>
        {output && (
          <a href={output} download="mockup.png" className="btn-secondary w-full mt-3 text-xs">
            Download PNG
          </a>
        )}
      </div>
    </form>
  );
}
