import { PageHeader, Card } from '@/components/ui';
import { Search, Sparkles } from 'lucide-react';

export default function AnalyzePage() {
  return (
    <div className="p-8 max-w-3xl">
      <PageHeader
        title="Analyze New Client Art"
        subtitle="Drop in a fresh customer file. Agent predicts color count, technique, and likely problem areas based on past Craft jobs."
      />

      <Card>
        <div className="border border-dashed border-[#2A2A2A] rounded-lg p-12 text-center hover:border-craft-cyan/50 transition-colors cursor-pointer">
          <Search size={32} className="mx-auto mb-4 text-gray-500" />
          <div className="font-medium">Drop a file here, or click to pick from Drive</div>
          <div className="text-xs text-gray-500 mt-1">Accepts PSD, AI, PDF, PNG, JPG, TIFF</div>
        </div>

        <div className="mt-8 panel p-5 bg-[#0A0A0A]">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-craft-cyan" />
            <h3 className="text-sm font-medium">Phase 2 — coming soon</h3>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed">
            Once Phase 1 has accumulated enough trained jobs (target: 50+), this page will:
          </p>
          <ul className="text-sm text-gray-400 list-disc list-inside mt-3 space-y-1 pl-2">
            <li>Embed the new client art and find the 5–10 most similar past Craft jobs</li>
            <li>Predict ideal color count, technique, and underbase strategy</li>
            <li>Flag likely problem areas (low-res zones, banding risk, fine line loss)</li>
            <li>Show citations: "based on this past job and this past job…"</li>
          </ul>
          <p className="text-sm text-gray-400 mt-3">
            Train Phase 1 first. Every job you add makes Phase 2 sharper.
          </p>
        </div>
      </Card>
    </div>
  );
}
