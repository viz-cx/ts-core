import { describe, it, expect, vi } from 'vitest';
import { createTxBuilder } from '../../src/tx';
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
});
