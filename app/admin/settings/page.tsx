import { PageHeader, Card } from '@/components/ui';
import { isMockMode } from '@/lib/utils';
import { Settings, ShieldCheck, Sparkles, FolderTree } from 'lucide-react';

export default function SettingsPage() {
  const mock = isMockMode();
  return (
    <div className="p-8 max-w-3xl">
      <PageHeader title="Settings" subtitle="Environment + integration status" />

      <div className="space-y-4">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Settings size={14} className="text-craft-cyan" />
            <h3 className="text-sm font-medium">Mode</h3>
          </div>
          <Row label="Mock mode" value={mock ? 'ON — using stubbed responses' : 'OFF — live integrations'} good={!mock} />
          <p className="text-xs text-gray-500 mt-2">
            Mock mode is auto-enabled when ANTHROPIC_API_KEY or GOOGLE_CLIENT_ID is missing. Override with MOCK_MODE=false.
          </p>
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FolderTree size={14} className="text-craft-cyan" />
            <h3 className="text-sm font-medium">Google Drive</h3>
          </div>
          <Row label="Client ID" value={present(process.env.GOOGLE_CLIENT_ID)} good={!!process.env.GOOGLE_CLIENT_ID} />
          <Row label="Client Secret" value={present(process.env.GOOGLE_CLIENT_SECRET)} good={!!process.env.GOOGLE_CLIENT_SECRET} />
          <Row label="Root folder ID" value={present(process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID)} good={!!process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID} />
          <Row label="OAuth scope" value="drive.readonly (Phase 1.5+ adds drive.file for mockup output only)" good />
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-craft-cyan" />
            <h3 className="text-sm font-medium">Anthropic</h3>
          </div>
          <Row label="API Key" value={present(process.env.ANTHROPIC_API_KEY)} good={!!process.env.ANTHROPIC_API_KEY} />
          <Row label="Model" value="claude-opus-4-6" good />
          <Row label="Prompt caching" value="Enabled on system prompt" good />
        </Card>

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={14} className="text-craft-cyan" />
            <h3 className="text-sm font-medium">Drive Safety</h3>
          </div>
          <p className="text-sm text-gray-400">
            Read-only OAuth scope · Folder-ID validation guard · No write APIs in codebase (CI-enforced) · Audit log on every read.
            See <code className="text-craft-cyan">SAFETY.md</code> for full detail.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#1A1A1A] last:border-b-0 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className={good ? 'text-craft-lime' : 'text-craft-orange'}>{value}</span>
    </div>
  );
}

function present(v: string | undefined): string {
  return v ? `set (${v.slice(0, 6)}…)` : 'NOT SET';
}
