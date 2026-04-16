import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-8 gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={12} />}
          {item.href ? (
            <Link href={item.href} className="hover:text-craft-cyan">
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-300">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="panel p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
    </div>
  );
}

export function EmptyState({
  icon, title, description, action,
}: { icon?: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="panel p-12 text-center">
      {icon && <div className="text-gray-500 flex justify-center mb-4">{icon}</div>}
      <div className="text-base font-medium">{title}</div>
      <div className="text-sm text-gray-400 mt-1 max-w-md mx-auto">{description}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Card({
  children, className, ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('panel p-5', className)} {...rest}>
      {children}
    </div>
  );
}
