'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Library, PlusCircle, Search, Sparkles,
  ImageIcon, Settings, ShieldCheck, FileImage, Users,
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
  return (
    <aside className="w-60 shrink-0 border-r border-[#2A2A2A] bg-[#0A0A0A] min-h-screen p-4">
      <Link href="/" className="flex items-center gap-2 mb-8 px-2">
        <div className="w-8 h-8 bg-craft-cyan rounded-md flex items-center justify-center text-black font-bold">
          S
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-sm">Separation</div>
          <div className="text-xs text-gray-500">Agent · Craft MFG</div>
        </div>
      </Link>

      <nav className="space-y-6">
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

      <div className="mt-auto pt-8 px-2 text-[10px] text-gray-600">
        Phase 1+1.5 scaffold · mock data
      </div>
    </aside>
  );
}
