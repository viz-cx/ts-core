import { VizRpcError, VizTransportError } from './errors';
import type { SignedTransaction, TransactionResult } from './types';

export interface Transport {
  call<T = unknown>(method: string, params: unknown[]): Promise<T>;
  broadcast(signed: SignedTransaction): Promise<TransactionResult>;
}

export interface HttpTransportOptions {
  timeoutMs?: number;
  fetch?: typeof fetch;
}

interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

export function createHttpTransport(endpoint: string, opts: HttpTransportOptions = {}): Transport {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const fetchFn = opts.fetch ?? fetch;
  let nextId = 1;

  async function call<T>(method: string, params: unknown[]): Promise<T> {
    const id = nextId++;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    // viz-cpp-node's json_rpc plugin only reads request params when the top-level
    // method is the legacy "call" wrapper, with params = [api, method, args]. Its
    // appbase-style `api.method` path splits the dotted name but never reads the
    // `params` field, so it always tries to cast `{}` to an array and fails with
    // "Bad Cast: Invalid cast from object_type to Array". Always use the wrapper.
    const dot = method.indexOf('.');
    const wireParams = dot === -1 ? [method, '', params] : [method.slice(0, dot), method.slice(dot + 1), params];
    let res: Response;
    try {
      res = await fetchFn(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id, method: 'call', params: wireParams }),
        signal: ac.signal,
      });
    } catch (e) {
      throw new VizTransportError({ message: `Transport failed for ${method}`, cause: e });
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new VizTransportError({
        message: `HTTP ${res.status} ${res.statusText} on ${method}`,
      });
    }

    let body: JsonRpcResponse<T>;
    try {
      body = (await res.json()) as JsonRpcResponse<T>;
    } catch (e) {
      throw new VizTransportError({ message: `Malformed JSON for ${method}`, cause: e });
    }

    if (body.error) {
      throw new VizRpcError({
        code: body.error.code,
        method,
        data: body.error.data,
        message: body.error.message,
      });
    }
    if (body.result === undefined) {
      throw new VizTransportError({ message: `Empty result for ${method}` });
    }
    return body.result;
  }

  async function broadcast(signed: SignedTransaction): Promise<TransactionResult> {
    const r = await call<{ id: string; block_num: number; expiration: string }>(
      'network_broadcast_api.broadcast_transaction_synchronous',
      [signed],
    );
    return { id: r.id, blockNum: r.block_num, expiration: r.expiration };
  }

  return { call, broadcast };
}
