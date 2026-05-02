#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BUDGET_BYTES = 100 * 1024;
const PACK_DIR = '.pack-tmp';

rmSync(PACK_DIR, { recursive: true, force: true });
mkdirSync(PACK_DIR, { recursive: true });

execFileSync('pnpm', ['pack', '--pack-destination', PACK_DIR], { stdio: 'inherit' });

const tarball = readdirSync(PACK_DIR).find((f) => f.endsWith('.tgz'));
if (!tarball) {
  console.error('No .tgz produced by pnpm pack');
  process.exit(1);
}

const size = statSync(join(PACK_DIR, tarball)).size;
const kb = (size / 1024).toFixed(2);
const budgetKb = (BUDGET_BYTES / 1024).toFixed(2);

if (size > BUDGET_BYTES) {
  console.error(`Tarball ${tarball} is ${kb} KB, exceeds budget ${budgetKb} KB`);
  process.exit(1);
}
console.log(`Tarball ${tarball}: ${kb} KB (budget ${budgetKb} KB) — OK`);
rmSync(PACK_DIR, { recursive: true, force: true });
