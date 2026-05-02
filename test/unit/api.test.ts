import { describe, it, expect, vi } from 'vitest';
import { createReadApi } from '../../src/api';
import type { Transport } from '../../src/transport';

describe('ReadApi', () => {
  it('getAccounts maps to database_api.get_accounts', async () => {
    const call = vi.fn().mockResolvedValue([{ name: 'alice' }]);
    const t: Transport = { call, broadcast: vi.fn() };
    const api = createReadApi(t);
    const r = await api.getAccounts(['alice']);
    expect(call).toHaveBeenCalledWith('database_api.get_accounts', [['alice']]);
    expect(r).toEqual([{ name: 'alice' }]);
  });

  it('getDynamicGlobalProperties maps correctly', async () => {
    const call = vi.fn().mockResolvedValue({ head_block_number: 100 });
    const t: Transport = { call, broadcast: vi.fn() };
    const api = createReadApi(t);
    await api.getDynamicGlobalProperties();
    expect(call).toHaveBeenCalledWith('database_api.get_dynamic_global_properties', []);
  });

  it('getBlock maps with positional args', async () => {
    const call = vi.fn().mockResolvedValue(null);
    const t: Transport = { call, broadcast: vi.fn() };
    const api = createReadApi(t);
    await api.getBlock(12345);
    expect(call).toHaveBeenCalledWith('database_api.get_block', [12345]);
  });
});
