#!/usr/bin/env node
/**
 * SAFETY LAYER 3 (see SAFETY.md)
 *
 * Greps the codebase for any Drive write/delete API symbols. If any
 * appear outside the explicitly-allowlisted module(s), the build fails.
 *
 * Add this to CI as: `node scripts/ban-drive-writes.mjs`
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['app', 'lib', 'components', 'scripts'];
const BANNED = [
  'files.create',
  'files.update',
  'files.delete',
  'files.copy',
  'files.emptyTrash',
  'files.trash',
  'permissions.create',
  'permissions.update',
  'permissions.delete',
];

// Files allowed to use these APIs (Phase 1.5 mockup writeback, when wired).
// Each entry must be reviewed in PR + documented in SAFETY.md.
const ALLOWLIST = new Set([
  // 'lib/drive/mockup-writer.ts',  // future
]);

const offenders = [];

function walk(dir) {
  const abs = join(ROOT, dir);
  if (!safeExists(abs)) return;
  for (const entry of readdirSync(abs)) {
    const full = join(abs, entry);
    const rel = relative(ROOT, full).replace(/\\/g, '/');
    if (statSync(full).isDirectory()) {
      walk(rel);
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry)) {
      const src = readFileSync(full, 'utf8');
      for (const sym of BANNED) {
        if (src.includes(sym) && !ALLOWLIST.has(rel) && !rel.startsWith('scripts/ban-drive-writes')) {
          offenders.push({ file: rel, symbol: sym });
        }
      }
    }
  }
}

function safeExists(p) {
  try { statSync(p); return true; } catch { return false; }
}

for (const d of SCAN_DIRS) walk(d);

if (offenders.length > 0) {
  console.error('\n❌ Drive write API usage detected:\n');
  for (const o of offenders) {
    console.error(`   ${o.file}  →  ${o.symbol}`);
  }
  console.error('\nThese symbols are banned to enforce SAFETY LAYER 3.');
  console.error('If a write is genuinely required (e.g. Phase 1.5 mockup output),');
  console.error('add the file path to the ALLOWLIST in this script AND document');
  console.error('the exception in SAFETY.md.\n');
  process.exit(1);
}

console.log('✅ No banned Drive write APIs found in the codebase.');
