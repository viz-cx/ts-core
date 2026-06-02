import { describe, it, expect, vi } from 'vitest';
import { createHttpTransport } from '../../src/transport';
import { VizRpcError, VizTransportError } from '../../src/errors';

describe('createHttpTransport', () => {
  it('issues a JSON-RPC POST and returns the result', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, result: { ok: true } }),
    });
    const t = createHttpTransport('https://node.test', { fetch: fetchMock as unknown as typeof fetch });
    const r = await t.call('database_api.get_dynamic_global_properties', []);
    expect(r).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://node.test');
    const body = JSON.parse((init as RequestInit).body as string);
    // viz-cpp-node only accepts the legacy "call" envelope: params = [api, method, args].
    expect(body.method).toBe('call');
    expect(body.params).toEqual(['database_api', 'get_dynamic_global_properties', []]);
  });

  it('throws VizRpcError when result has error payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1, error: { code: -32000, message: 'bad', data: 'detail' } }),
    });
    const t = createHttpTransport('https://node.test', { fetch: fetchMock as unknown as typeof fetch });
    await expect(t.call('some.method', [])).rejects.toBeInstanceOf(VizRpcError);
  });

  it('throws VizTransportError on non-2xx', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500, statusText: 'oops', text: async () => 'err' });
    const t = createHttpTransport('https://node.test', { fetch: fetchMock as unknown as typeof fetch });
    await expect(t.call('x', [])).rejects.toBeInstanceOf(VizTransportError);
  });

  it('throws VizTransportError on fetch failure', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('econnrefused'));
    const t = createHttpTransport('https://node.test', { fetch: fetchMock as unknown as typeof fetch });
    await expect(t.call('x', [])).rejects.toBeInstanceOf(VizTransportError);
  });

  it('throws VizTransportError on malformed JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => { throw new Error('not json'); },
    });
    const t = createHttpTransport('https://node.test', { fetch: fetchMock as unknown as typeof fetch });
    await expect(t.call('x', [])).rejects.toBeInstanceOf(VizTransportError);
  });

  it('throws VizTransportError on empty result', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ jsonrpc: '2.0', id: 1 }),
    });
    const t = createHttpTransport('https://node.test', { fetch: fetchMock as unknown as typeof fetch });
    await expect(t.call('x', [])).rejects.toBeInstanceOf(VizTransportError);
  });

  it('broadcast() maps snake_case wire fields to camelCase TransactionResult', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        jsonrpc: '2.0',
        id: 1,
        result: { id: 'abc', block_num: 99, expiration: '2026-05-02T00:00:30' },
      }),
    });
    const t = createHttpTransport('https://node.test', { fetch: fetchMock as unknown as typeof fetch });
    const r = await t.broadcast({
      refBlockNum: 1,
      refBlockPrefix: 1,
      expiration: '2026-05-02T00:00:30',
      operations: [],
      extensions: [],
      signatures: ['sig'],
    });
    expect(r).toEqual({ id: 'abc', blockNum: 99, expiration: '2026-05-02T00:00:30' });
    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.method).toBe('call');
    expect(body.params[0]).toBe('network_broadcast_api');
    expect(body.params[1]).toBe('broadcast_transaction_synchronous');
    // The broadcast payload must use snake_case TaPoS field names: the node
    // parses the tx by these names to recompute the signed digest. Sending
    // camelCase makes the node read ref_block_num/ref_block_prefix as 0 and
    // reject the signature as missing authority.
    const tx = body.params[2][0];
    expect(tx.ref_block_num).toBe(1);
    expect(tx.ref_block_prefix).toBe(1);
    expect(tx).not.toHaveProperty('refBlockNum');
    expect(tx).not.toHaveProperty('refBlockPrefix');
    expect(tx.signatures).toEqual(['sig']);
  });
});
