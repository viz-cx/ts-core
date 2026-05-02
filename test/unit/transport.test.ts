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
    expect(body.method).toBe('database_api.get_dynamic_global_properties');
    expect(body.params).toEqual([]);
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
});
