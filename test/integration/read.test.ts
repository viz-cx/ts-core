import { describe, it, expect } from 'vitest';
import { createClient } from '../../src/index';

const SKIP = process.env.VIZ_SKIP_INTEGRATION === '1';

describe.skipIf(SKIP)('integration: read against https://node.viz.cx', () => {
  it('fetches dynamic global properties', async () => {
    const client = createClient();
    let dgp;
    try {
      dgp = await client.api.getDynamicGlobalProperties();
    } catch (e) {
      console.warn('integration: endpoint unreachable, skipping', e);
      return;
    }
    expect(dgp).toBeTruthy();
    expect(typeof dgp.head_block_number).toBe('number');
    expect(typeof dgp.time).toBe('string');
  });

  it('fetches a known account', async () => {
    const client = createClient();
    let accounts;
    try {
      accounts = await client.api.getAccounts(['committee']);
    } catch (e) {
      console.warn('integration: endpoint unreachable, skipping', e);
      return;
    }
    expect(accounts.length).toBeGreaterThan(0);
    expect(accounts[0]?.name).toBe('committee');
  });
});
