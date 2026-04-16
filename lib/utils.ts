import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function methodLabel(method: string): string {
  return method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function difficultyLabel(d: number): string {
  return ['', 'Easy', 'Light', 'Standard', 'Tricky', 'Nightmare'][d] || 'Unknown';
}

export function difficultyColor(d: number): string {
  if (d <= 1) return 'badge-lime';
  if (d <= 2) return 'badge-cyan';
  if (d <= 3) return 'badge-grey';
  if (d <= 4) return 'badge-orange';
  return 'badge bg-red-500/20 text-red-400';
}

export function isMockMode(): boolean {
  if (process.env.MOCK_MODE === 'false') return false;
  if (process.env.MOCK_MODE === 'true') return true;
  // auto-detect: missing required keys → mock
  return !(process.env.ANTHROPIC_API_KEY && process.env.GOOGLE_CLIENT_ID);
}
