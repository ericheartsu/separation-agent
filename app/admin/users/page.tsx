import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { PageHeader, Card } from '@/components/ui';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const list = await db.select().from(users);

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader
        title="Team"
        subtitle={`${list.length} member${list.length === 1 ? '' : 's'} with access to the agent.`}
      />

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#0A0A0A] text-xs text-gray-500 uppercase">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Name</th>
              <th className="text-left px-4 py-2 font-medium">Email</th>
              <th className="text-left px-4 py-2 font-medium">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A2A]">
            {list.map(u => (
              <tr key={u.id} className="hover:bg-[#0A0A0A]">
                <td className="px-4 py-2 font-medium">{u.name}</td>
                <td className="px-4 py-2 text-gray-400 font-mono text-xs">{u.email}</td>
                <td className="px-4 py-2">
                  <span className={
                    u.role === 'admin' ? 'badge-orange' :
                    u.role === 'trainer' ? 'badge-cyan' :
                    'badge-grey'
                  }>
                    {u.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-gray-500 mt-4 flex items-center gap-2">
        <Users size={12} /> User management UI (invite / remove / change role) ships with NextAuth wiring.
      </p>
    </div>
  );
}
