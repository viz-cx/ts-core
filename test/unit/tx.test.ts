import { describe, it, expect, vi } from 'vitest';
import { createTxBuilder, sign } from '../../src/tx';
import { keys } from '../../src/auth';
import type { Transport } from '../../src/transport';

const fakeTransport = (overrides: Partial<Transport> = {}): Transport => ({
  call: vi.fn().mockImplementation(async (method: string) => {
    if (method === 'database_api.get_dynamic_global_properties') {
      return { head_block_id: '00000010abcdef1234567890', head_block_number: 16, time: '2026-05-02T00:00:00' };
    }
    return null;
  }) as Transport['call'],
  broadcast: vi.fn().mockResolvedValue({ id: 'txid', blockNum: 17, expiration: '2026-05-02T00:00:30' }),
  ...overrides,
});

describe('TxBuilder', () => {
  it('build() emits ops as tagged tuples', async () => {
    const t = fakeTransport();
    const tx = await createTxBuilder({ transport: t, expirationSec: 30 })
      .transfer({ from: 'alice', to: 'bob', amount: '1.000 VIZ' })
      .build();
    expect(tx.operations).toHaveLength(1);
    expect(tx.operations[0]![0]).toBe('transfer');
    expect(tx.operations[0]![1]).toMatchObject({ from: 'alice', to: 'bob', amount: '1.000 VIZ' });
    expect(typeof tx.refBlockNum).toBe('number');
    expect(typeof tx.refBlockPrefix).toBe('number');
    expect(typeof tx.expiration).toBe('string');
  });

  it('op() typed escape hatch produces tagged tuple', async () => {
    const tx = await createTxBuilder({ transport: fakeTransport(), expirationSec: 30 })
      .op('committee_vote_request', { voter: 'alice', requestId: 1, voteId: 1 })
      .build();
    expect(tx.operations[0]![0]).toBe('committee_vote_request');
  });

  it('Asset inputs normalize to wire string', async () => {
    const tx = await createTxBuilder({ transport: fakeTransport(), expirationSec: 30 })
      .transfer({ from: 'alice', to: 'bob', amount: '2.500 VIZ' })
      .build();
    expect((tx.operations[0]![1] as { amount: string }).amount).toBe('2.500 VIZ');
  });

  it('rejects empty op list', async () => {
    await expect(createTxBuilder({ transport: fakeTransport(), expirationSec: 30 }).build())
      .rejects.toThrow(/at least one operation/i);
  });

  it('sign(builder) caches the signature and broadcast() uses transport.broadcast', async () => {
    const wif = keys.fromPassword('alice', 'p4ssw0rd-test-only', 'active');
    const t = fakeTransport();
    const signed = createTxBuilder({ transport: t, expirationSec: 30 })
      .transfer({ from: 'alice', to: 'bob', amount: '1.000 VIZ', memo: '' })
      .sign(wif);
    const tx1 = await signed.toJSON();
    const tx2 = await signed.toJSON();
    expect(tx1).toBe(tx2);
    expect(Array.isArray(tx1.signatures)).toBe(true);
    expect(tx1.signatures.length).toBe(1);
    const result = await signed.broadcast();
    expect(result.id).toBe('txid');
    expect(t.broadcast).toHaveBeenCalledOnce();
  });

  it('standalone sign() produces a SignedTransaction', async () => {
    const wif = keys.fromPassword('alice', 'p4ssw0rd-test-only', 'active');
    const tx = await createTxBuilder({ transport: fakeTransport(), expirationSec: 30 })
      .transfer({ from: 'alice', to: 'bob', amount: '1.000 VIZ', memo: '' })
      .build();
    const s = await sign(tx, { activeKey: wif });
    expect(s.signatures.length).toBe(1);
    expect(s.operations).toEqual(tx.operations);
  });
});
