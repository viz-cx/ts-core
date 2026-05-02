#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, rmSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PACK_DIR = '.pack-tmp';
const APPS = ['examples/esm-app', 'examples/cjs-app'];

rmSync(PACK_DIR, { recursive: true, force: true });
mkdirSync(PACK_DIR, { recursive: true });

console.log('==> packing @viz-cx/core');
execFileSync('pnpm', ['pack', '--pack-destination', PACK_DIR], { stdio: 'inherit' });

const tarball = readdirSync(PACK_DIR).find((f) => f.endsWith('.tgz'));
if (!tarball) {
  console.error('No .tgz produced');
  process.exit(1);
}
const tarballPath = join(process.cwd(), PACK_DIR, tarball);
console.log('==> packed:', tarballPath, `${(statSync(tarballPath).size / 1024).toFixed(2)} KB`);

for (const app of APPS) {
  console.log(`\n==> installing into ${app}`);
  const pkgPath = join(app, 'package.json');
  const original = readFileSync(pkgPath, 'utf8');
  const pkg = JSON.parse(original);
  const patched = { ...pkg, dependencies: { ...(pkg.dependencies ?? {}), '@viz-cx/core': `file:${tarballPath}` } };
  writeFileSync(pkgPath, JSON.stringify(patched, null, 2) + '\n');

  try {
    execFileSync('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts'], { cwd: app, stdio: 'inherit' });
    console.log(`==> running ${app}`);
    execFileSync('npm', ['run', 'start'], { cwd: app, stdio: 'inherit' });
  } finally {
    writeFileSync(pkgPath, original);
  }
}

console.log('\nsmoke OK');
