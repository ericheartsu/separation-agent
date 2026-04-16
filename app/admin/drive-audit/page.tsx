import { db } from '@/lib/db';
import { driveAudit } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { PageHeader, Card } from '@/components/ui';
import { ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function DriveAuditPage() {
  const log = await db.query.driveAudit.findMany({
    orderBy: [desc(driveAudit.createdAt)],
    with: { },
    limit: 200,
  });

  // separately fetch user names
  const users = await db.query.users.findMany();
  const byId = Object.fromEntries(users.map(u => [u.id, u]));

  const successCount = log.filter(e => e.successful).length;
  const failCount = log.length - successCount;

  return (
    <div className="p-8 max-w-6xl">
      <PageHeader
        title="Drive Audit Log"
        subtitle="Every Drive read this app has performed. Recorded for compliance + accountability."
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="text-xs text-gray-500 uppercase">Total reads</div>
          <div className="text-2xl font-semibold mt-1">{log.length}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500 uppercase">Successful</div>
          <div className="text-2xl font-semibold mt-1 text-craft-lime">{successCount}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500 uppercase">Refused</div>
          <div className="text-2xl font-semibold mt-1 text-red-400">{failCount}</div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2A2A2A] flex items-center gap-2">
          <ShieldCheck size={14} className="text-craft-cyan" />
          <h3 className="text-sm font-medium">Recent activity</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-[#0A0A0A] text-xs text-gray-500 uppercase">
            <tr>
              <th className="text-left px-4 py-2 font-medium">When</th>
              <th className="text-left px-4 py-2 font-medium">User</th>
              <th className="text-left px-4 py-2 font-medium">File</th>
              <th className="text-left px-4 py-2 font-medium">Reason</th>
              <th className="text-left px-4 py-2 font-medium">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A2A]">
            {log.map(e => (
              <tr key={e.id} className="hover:bg-[#0A0A0A]">
                <td className="px-4 py-2 text-xs text-gray-400">{format(e.createdAt, 'MMM d, HH:mm:ss')}</td>
                <td className="px-4 py-2 text-xs">{e.userId ? byId[e.userId]?.name ?? e.userId : '—'}</td>
                <td className="px-4 py-2 text-xs font-mono">{e.driveFileName ?? e.driveFileId}</td>
                <td className="px-4 py-2 text-xs"><span className="badge-grey">{e.reason}</span></td>
                <td className="px-4 py-2 text-xs">
                  {e.successful ? (
                    <span className="text-craft-lime flex items-center gap-1"><CheckCircle2 size={12} /> Success</span>
                  ) : (
                    <span className="text-red-400 flex items-center gap-1" title={e.errorMessage ?? ''}>
                      <XCircle size={12} /> Refused
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
