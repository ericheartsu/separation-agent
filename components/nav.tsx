'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Library, PlusCircle, Search, Sparkles,
  ImageIcon, Settings, ShieldCheck, FileImage, Users, LogOut,
} from 'lucide-react';

const sections = [
  {
    title: 'Train',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/jobs', label: 'Job Library', icon: Library },
      { href: '/jobs/new', label: 'Add Past Job', icon: PlusCircle },
    ],
  },
  {
    title: 'Use',
    items: [
      { href: '/analyze', label: 'Analyze New Art', icon: Search },
      { href: '/mockups', label: 'Mockups', icon: ImageIcon },
      { href: '/mockups/new', label: 'Generate Mockup', icon: Sparkles },
    ],
  },
  {
    title: 'Admin',
    items: [
      { href: '/admin/templates', label: 'Garment Templates', icon: FileImage },
      { href: '/admin/users', label: 'Team', icon: Users },
      { href: '/admin/drive-audit', label: 'Drive Audit Log', icon: ShieldCheck },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Nav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <aside className="w-60 shrink-0 border-r border-[#2A2A2A] bg-[#0A0A0A] min-h-screen p-4 flex flex-col">
      <Link href="/" className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 bg-craft-cyan rounded-md flex items-center justify-center text-black font-bold">
          S
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-sm">Separation</div>
          <div className="text-xs text-gray-500">Agent · Craft MFG</div>
        </div>
      </Link>

      <nav className="space-y-6 flex-1">
        {sections.map((section) => (
          <div key={section.title}>
            <div className="text-[10px] uppercase tracking-wider text-gray-500 px-2 mb-1.5">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== '/' && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors',
                      active
                        ? 'bg-craft-cyan/10 text-craft-cyan'
                        : 'text-gray-300 hover:bg-[#1C1C1C] hover:text-white'
                    )}
                  >
                    <Icon size={15} />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      {user && (
        <div className="border-t border-[#2A2A2A] pt-3 mt-3">
          <div className="flex items-center gap-2 px-2 py-1.5">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? user.email ?? 'User'}
                width={28}
                height={28}
                className="rounded-full"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-craft-cyan/20 flex items-center justify-center text-xs text-craft-cyan font-medium">
                {(user.name ?? user.email ?? '?').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{user.name ?? user.email}</div>
              <div className="text-[10px] text-gray-500 truncate">{(user as any).role ?? 'operator'}</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-gray-400 hover:bg-[#1C1C1C] hover:text-red-400 transition-colors mt-1"
          >
            <LogOut size={12} />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
