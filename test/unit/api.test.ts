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

  it('all remaining read methods route to the right RPC method', async () => {
    const call = vi.fn().mockResolvedValue(null);
    const t: Transport = { call, broadcast: vi.fn() };
    const api = createReadApi(t);
    await api.lookupAccountNames(['alice']);
    await api.getBlockHeader(42);
    await api.getAccountHistory('alice', -1, 100);
    await api.getOpsInBlock(7, false);
    await api.getKeyReferences(['VIZkey']);
    await api.getWitnessByAccount('alice');
    await api.getActiveWitnesses();
    expect(call).toHaveBeenNthCalledWith(1, 'database_api.lookup_account_names', [['alice']]);
    expect(call).toHaveBeenNthCalledWith(2, 'database_api.get_block_header', [42]);
    expect(call).toHaveBeenNthCalledWith(3, 'account_history.get_account_history', ['alice', -1, 100]);
    expect(call).toHaveBeenNthCalledWith(4, 'operation_history.get_ops_in_block', [7, false]);
    expect(call).toHaveBeenNthCalledWith(5, 'account_by_key.get_key_references', [['VIZkey']]);
    expect(call).toHaveBeenNthCalledWith(6, 'witness_api.get_witness_by_account', ['alice']);
    expect(call).toHaveBeenNthCalledWith(7, 'witness_api.get_active_witnesses', []);
  });
});
