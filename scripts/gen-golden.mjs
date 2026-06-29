/**
 * Golden vector generator.
 * Run with: pnpm dlx tsx scripts/gen-golden.mjs
 * Or via: pnpm gen:golden
 *
 * Writes test/fixtures/golden.json with frozen serialization + signing vectors.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// These dynamic imports work because tsx resolves .ts files at runtime.
const { ByteWriter } = await import(resolve(root, 'src/serializer/primitives.ts'));
const { writeOperation } = await import(resolve(root, 'src/serializer/operation.ts'));
const { serializeTransaction } = await import(resolve(root, 'src/serializer/transaction.ts'));
const { sha256 } = await import('@noble/hashes/sha256');
const { CHAIN_ID } = await import(resolve(root, 'src/constants.ts'));
const { signDigest, recoverPubkey } = await import(resolve(root, 'src/crypto/ecdsa.ts'));
const { deriveWif, wifToPublic } = await import(resolve(root, 'src/crypto/keys.ts'));

// Representative subset of operation samples (no viz-js-lib dependency).
const SAMPLES = {
  transfer: { from: 'alice', to: 'bob', amount: '1.000 VIZ', memo: '' },
  award: { initiator: 'alice', receiver: 'bob', energy: 50, custom_sequence: 0, memo: '', beneficiaries: [] },
  custom: { required_active_auths: [], required_regular_auths: ['alice'], id: 'x', json: '{}' },
  account_metadata: { account: 'alice', json_metadata: '{}' },
  set_reward_sharing: { owner: 'alice', sharing_rate: 1000 },
};

// --- Serialize ops ---
const opsOut = [];
for (const [name, sample] of Object.entries(SAMPLES)) {
  const w = new ByteWriter();
  writeOperation(w, name, sample);
  opsOut.push({ name, sample, hex: w.hex() });
}

// --- Serialize a tx ---
const wire = {
  ref_block_num: 100,
  ref_block_prefix: 200,
  expiration: '2026-06-30T00:00:00',
  operations: [['transfer', { from: 'alice', to: 'bob', amount: '1.000 VIZ', memo: '' }]],
  extensions: [],
};
const txBytes = serializeTransaction(wire);
const txHex = Buffer.from(txBytes).toString('hex');

// --- Sign the tx ---
const wif = deriveWif('alice', 'active', 'pw pw pw pw pw pw');
const cid = Buffer.from(CHAIN_ID, 'hex');
const digest = sha256(new Uint8Array([...cid, ...Buffer.from(txHex, 'hex')]));
const digestHex = Buffer.from(digest).toString('hex');
const sigHex = signDigest(digest, wif);
const pub = wifToPublic(wif);

// Verify recovery at generation time
const recovered = recoverPubkey(digest, sigHex);
if (recovered !== pub) {
  throw new Error(`Recovery mismatch at generation time: got ${recovered}, expected ${pub}`);
}

const golden = {
  ops: opsOut,
  tx: { wire, hex: txHex },
  sig: { wif, digestHex, sigHex, pub },
};

mkdirSync(resolve(root, 'test/fixtures'), { recursive: true });
writeFileSync(
  resolve(root, 'test/fixtures/golden.json'),
  JSON.stringify(golden, null, 2) + '\n',
);
console.log(`Wrote ${opsOut.length} op vectors + 1 tx + 1 sig to test/fixtures/golden.json`);
