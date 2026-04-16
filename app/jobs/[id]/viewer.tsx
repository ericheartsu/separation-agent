'use client';

import { useState } from 'react';
import type { JobFile } from '@/lib/db/schema';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { Layers, FileImage, Eye, MapPin } from 'lucide-react';

const KIND_LABEL = {
  CUSTOMER: 'Customer File',
  MOCKUP: 'Mockup',
  SEPARATION: 'Separation',
} as const;

export function JobViewer({ files }: { files: JobFile[] }) {
  const sorted = [
    files.find(f => f.kind === 'CUSTOMER'),
    files.find(f => f.kind === 'MOCKUP'),
    files.find(f => f.kind === 'SEPARATION'),
  ].filter(Boolean) as JobFile[];

  const [view, setView] = useState<'side-by-side' | 'overlay'>('side-by-side');
  const [pinningOn, setPinningOn] = useState<string | null>(null);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A]">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Layers size={14} /> File Viewer
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setView('side-by-side')}
            className={cn(
              'px-2 py-1 rounded',
              view === 'side-by-side' ? 'bg-craft-cyan/20 text-craft-cyan' : 'text-gray-400 hover:text-white'
            )}
          >
            Side-by-side
          </button>
          <button
            onClick={() => setView('overlay')}
            className={cn(
              'px-2 py-1 rounded',
              view === 'overlay' ? 'bg-craft-cyan/20 text-craft-cyan' : 'text-gray-400 hover:text-white'
            )}
          >
            Overlay (sep ↔ mockup)
          </button>
        </div>
      </div>

      {view === 'side-by-side' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#2A2A2A]">
          {sorted.map(f => (
            <FilePane
              key={f.id}
              file={f}
              isPinning={pinningOn === f.id}
              onTogglePin={() => setPinningOn(pinningOn === f.id ? null : f.id)}
            />
          ))}
        </div>
      ) : (
        <OverlayView files={sorted} />
      )}
    </Card>
  );
}

function FilePane({
  file, isPinning, onTogglePin,
}: { file: JobFile; isPinning: boolean; onTogglePin: () => void }) {
  const [pins, setPins] = useState<{ x: number; y: number; note: string }[]>([]);
  const [draftPin, setDraftPin] = useState<{ x: number; y: number } | null>(null);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPinning) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDraftPin({ x, y });
  };

  return (
    <div className="relative">
      <div className="px-4 py-2 border-b border-[#2A2A2A] flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {KIND_LABEL[file.kind]}
        </div>
        <button
          onClick={onTogglePin}
          className={cn(
            'text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors',
            isPinning ? 'bg-craft-orange text-black' : 'text-gray-500 hover:text-craft-orange'
          )}
        >
          <MapPin size={10} /> {isPinning ? 'Pinning…' : 'Drop pin'}
        </button>
      </div>
      <div
        onClick={onClick}
        className={cn(
          'relative aspect-square bg-[#0A0A0A] flex items-center justify-center overflow-hidden',
          isPinning && 'cursor-crosshair'
        )}
      >
        <FileImage size={48} className="text-gray-700" />
        <div className="absolute bottom-2 left-2 right-2 text-[10px] text-gray-500 truncate font-mono">
          {file.driveFileName}
        </div>
        {pins.map((p, i) => (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
          >
            <div className="w-4 h-4 bg-craft-orange rounded-full ring-2 ring-black flex items-center justify-center text-[8px] font-bold text-black">
              {i + 1}
            </div>
            <div className="absolute left-5 top-0 hidden group-hover:block bg-craft-orange text-black text-[10px] px-2 py-1 rounded whitespace-nowrap max-w-[200px] truncate">
              {p.note}
            </div>
          </div>
        ))}
        {draftPin && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${draftPin.x * 100}%`, top: `${draftPin.y * 100}%` }}
          >
            <div className="w-4 h-4 bg-craft-cyan rounded-full ring-2 ring-black animate-pulse" />
            <div className="absolute left-5 top-0 bg-[#1C1C1C] border border-craft-cyan rounded p-2 w-56">
              <input
                autoFocus
                placeholder="What's the issue here?"
                className="input text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    setPins(prev => [...prev, { ...draftPin, note: e.currentTarget.value.trim() }]);
                    setDraftPin(null);
                  }
                  if (e.key === 'Escape') setDraftPin(null);
                }}
              />
              <div className="text-[9px] text-gray-500 mt-1">Enter to save · Esc to cancel</div>
            </div>
          </div>
        )}
      </div>
      {pins.length > 0 && (
        <div className="px-3 py-2 border-t border-[#2A2A2A] text-[10px] text-gray-500">
          {pins.length} pin{pins.length === 1 ? '' : 's'} · pins are mock-only until DB save wired
        </div>
      )}
    </div>
  );
}

function OverlayView({ files }: { files: JobFile[] }) {
  const [opacity, setOpacity] = useState(50);
  const sep = files.find(f => f.kind === 'SEPARATION');
  const mockup = files.find(f => f.kind === 'MOCKUP');
  return (
    <div>
      <div className="relative aspect-video bg-[#0A0A0A]">
        <div className="absolute inset-0 flex items-center justify-center">
          <FileImage size={56} className="text-gray-700" />
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center bg-craft-cyan/5"
          style={{ opacity: opacity / 100 }}
        >
          <FileImage size={56} className="text-craft-cyan/40" />
        </div>
        <div className="absolute top-2 left-2 text-[10px] text-gray-500">{mockup?.driveFileName}</div>
        <div className="absolute top-2 right-2 text-[10px] text-craft-cyan">{sep?.driveFileName}</div>
      </div>
      <div className="px-4 py-3 border-t border-[#2A2A2A] flex items-center gap-3">
        <Eye size={14} className="text-gray-500" />
        <span className="text-xs text-gray-400 w-16">Mockup</span>
        <input
          type="range"
          min={0}
          max={100}
          value={opacity}
          onChange={e => setOpacity(Number(e.target.value))}
          className="flex-1 accent-craft-cyan"
        />
        <span className="text-xs text-craft-cyan w-16 text-right">Separation</span>
      </div>
    </div>
  );
}
