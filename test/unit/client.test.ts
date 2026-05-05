import { describe, it, expect, vi } from 'vitest';
import { createClient } from '../../src/client';
import type { Transport } from '../../src/transport';

const dgpResponse = { head_block_id: '00000010abcdef1234567890', head_block_number: 16, time: '2026-05-02T00:00:00' };

function fakeTransport(): Transport {
  const call = vi.fn().mockImplementation(async (method: string) => {
    if (method === 'database_api.get_dynamic_global_properties') return dgpResponse;
    if (method === 'database_api.get_accounts') return [{ name: 'alice' }];
    return null;
  }) as Transport['call'];
  const broadcast = vi.fn().mockResolvedValue({ id: 'tx-id', blockNum: 17, expiration: '2026-05-02T00:00:30' });
  return { call, broadcast };
}

describe('createClient', () => {
  it('returns a read-only client when no account', async () => {
    const c = createClient({ transport: fakeTransport() });
    const accounts = await c.api.getAccounts(['alice']);
    expect(accounts[0]?.name).toBe('alice');
    // @ts-expect-error transfer not present on read client
    expect(c.transfer).toBeUndefined();
  });

  it('returns a write client when account+activeKey provided', async () => {
    const c = createClient({
      account: 'alice',
      activeKey: '5JTestActiveKeyDoNotUseInProductionAtAllPleasePromise12',
      transport: fakeTransport(),
    });
    expect(typeof c.transfer).toBe('function');
    expect(typeof c.tx).toBe('function');
    expect(typeof c.broadcast).toBe('function');
  });

  it('curated transfer() injects implicit `from` and broadcasts', async () => {
    const t = fakeTransport();
    const wif = (await import('../../src/auth')).keys.fromPassword('alice', 'p4ssw0rd-test-only', 'active');
    const c = createClient({ account: 'alice', activeKey: wif, transport: t });
    const r = await c.transfer({ to: 'bob', amount: '1.000 VIZ' });
    expect(r.id).toBe('tx-id');
    expect(t.broadcast).toHaveBeenCalledOnce();
    const sentTx = (t.broadcast as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
      operations: ReadonlyArray<readonly [string, Record<string, unknown>]>;
    };
    expect(sentTx.operations[0]![0]).toBe('transfer');
    expect(sentTx.operations[0]![1]).toMatchObject({ from: 'alice', to: 'bob', amount: '1.000 VIZ' });
  });

  it('curated fixedAward() injects implicit initiator', async () => {
    const t = fakeTransport();
    const wif = (await import('../../src/auth')).keys.fromPassword('alice', 'p4ssw0rd-test-only', 'active');
    const c = createClient({ account: 'alice', activeKey: wif, transport: t });
    await c.fixedAward({ receiver: 'bob', rewardAmount: '1.000 VIZ', maxEnergy: 500 });
    const sentTx = (t.broadcast as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
      operations: ReadonlyArray<readonly [string, Record<string, unknown>]>;
    };
    expect(sentTx.operations[0]![0]).toBe('fixed_award');
    expect(sentTx.operations[0]![1]).toMatchObject({
      initiator: 'alice',
      receiver: 'bob',
      reward_amount: '1.000 VIZ',
      max_energy: 500,
    });
  });
});
