import { describe, it, expect } from 'vitest';
// eslint-disable-next-line no-direct-viz-js-lib -- test oracle
import vizJs from 'viz-js-lib';
import { createRequire } from 'module';
import { ByteWriter } from '../../src/serializer/primitives';
import { writeAsset } from '../../src/serializer/asset';
import { writeAuthority } from '../../src/serializer/authority';

const require = createRequire(import.meta.url);

const ops = (vizJs as any).auth?.serializer ?? require('viz-js-lib/lib/auth/serializer/src/operations');
const types = require('viz-js-lib/lib/auth/serializer/src/types');

function vizHex(serializer: { appendByteBuffer: (b: unknown, v: unknown) => void }, obj: unknown): string {
  const ByteBuffer = require('bytebuffer');
  const b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
  serializer.appendByteBuffer(b, obj);
  return Buffer.from((b.copy(0, b.offset) as { toBuffer: () => Buffer }).toBuffer()).toString('hex');
}

describe('serializer oracle: asset', () => {
  it('serializes VIZ amount identically', () => {
    const w = new ByteWriter();
    writeAsset(w, '1.000 VIZ');
    expect(w.hex()).toBe(vizHex(types.asset, '1.000 VIZ'));
  });
  it('serializes SHARES amount identically', () => {
    const w = new ByteWriter();
    writeAsset(w, '12.345678 SHARES');
    expect(w.hex()).toBe(vizHex(types.asset, '12.345678 SHARES'));
  });
});

describe('serializer oracle: authority', () => {
  it('serializes an authority identically (sorted maps)', () => {
    const auth = {
      weight_threshold: 1,
      account_auths: [['bob', 1], ['alice', 1]],
      key_auths: [],
    };
    const w = new ByteWriter();
    writeAuthority(w, auth as any);
    expect(w.hex()).toBe(vizHex(ops.authority, auth));
  });
});

// ─── Operation oracle ────────────────────────────────────────────────────────

import { writeOperation } from '../../src/serializer/operation';
import { OP_NAMES } from '../../src/ops/registry';
import { OP_SCHEMA } from '../../src/serializer/op-schema';
import { OP_TYPE_IDS } from '../../src/constants';
import { SAMPLES } from './samples.mjs';

describe('serializer oracle: every op', () => {
  for (const [name, sample] of Object.entries(SAMPLES)) {
    it(`serializes ${name} identically`, () => {
      const w = new ByteWriter();
      writeOperation(w, name, sample);
      const ByteBuffer = require('bytebuffer');
      const b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
      ops.operation.appendByteBuffer(b, [name, sample]);
      const expected = Buffer.from((b.copy(0, b.offset) as { toBuffer: () => Buffer }).toBuffer()).toString('hex');
      expect(w.hex()).toBe(expected);
    });
  }
});

it('has a schema + type id for every registered op', () => {
  for (const name of OP_NAMES) {
    expect(OP_SCHEMA[name as string], `schema for ${name}`).toBeDefined();
    expect(OP_TYPE_IDS[name as string], `type id for ${name}`).toBeDefined();
  }
});

it('serializes proposal_update with multiple approvals sorted', () => {
  const sample = {
    author: 'alice', title: 'test',
    active_approvals_to_add: ['charlie', 'alice'],  // unsorted — should be alice, charlie
    active_approvals_to_remove: [],
    master_approvals_to_add: [],
    master_approvals_to_remove: [],
    regular_approvals_to_add: [],
    regular_approvals_to_remove: [],
    key_approvals_to_add: [],
    key_approvals_to_remove: [],
    extensions: [],
  };
  const w = new ByteWriter();
  writeOperation(w, 'proposal_update', sample);
  const ByteBuffer = require('bytebuffer');
  const b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
  ops.operation.appendByteBuffer(b, ['proposal_update', sample]);
  const expected = Buffer.from((b.copy(0, b.offset) as { toBuffer: () => Buffer }).toBuffer()).toString('hex');
  expect(w.hex()).toBe(expected);
});

it('serializes custom op with multiple required_active_auths sorted', () => {
  const sample = {
    required_active_auths: ['zebra', 'alice', 'mike'],  // unsorted — should sort ascending
    required_regular_auths: [],
    id: 'test',
    json: '{}',
  };
  const w = new ByteWriter();
  writeOperation(w, 'custom', sample);
  const ByteBuffer = require('bytebuffer');
  const b = new ByteBuffer(ByteBuffer.DEFAULT_CAPACITY, ByteBuffer.LITTLE_ENDIAN);
  ops.operation.appendByteBuffer(b, ['custom', sample]);
  const expected = Buffer.from((b.copy(0, b.offset) as { toBuffer: () => Buffer }).toBuffer()).toString('hex');
  expect(w.hex()).toBe(expected);
});

// ─── Transaction envelope oracle ────────────────────────────────────────────

import { serializeTransaction } from '../../src/serializer/transaction';

describe('serializer oracle: transaction', () => {
  it('serializes a full tx identically to viz transaction.toBuffer', () => {
    const tx = {
      ref_block_num: 1234,
      ref_block_prefix: 567890,
      expiration: '2026-06-30T00:00:00',
      operations: [['transfer', { from: 'alice', to: 'bob', amount: '1.000 VIZ', memo: 'hi' }]] as any,
      extensions: [],
    };
    const ours = Buffer.from(serializeTransaction(tx)).toString('hex');
    const theirs = Buffer.from(ops.transaction.toBuffer(tx)).toString('hex');
    expect(ours).toBe(theirs);
  });
});
