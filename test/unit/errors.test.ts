import { describe, it, expect } from 'vitest';
import { VizRpcError, VizValidationError, VizTransportError } from '../../src/errors';

describe('errors', () => {
  it('VizRpcError carries code, method, data', () => {
    const e = new VizRpcError({ code: -32000, method: 'broadcast_transaction', data: { x: 1 }, message: 'rejected' });
    expect(e).toBeInstanceOf(Error);
    expect(e).toBeInstanceOf(VizRpcError);
    expect(e.name).toBe('VizRpcError');
    expect(e.code).toBe(-32000);
    expect(e.method).toBe('broadcast_transaction');
    expect(e.data).toEqual({ x: 1 });
    expect(e.message).toBe('rejected');
  });

  it('VizValidationError carries field and expected', () => {
    const e = new VizValidationError({ field: 'amount', expected: 'string with 3-decimal precision', received: '1 VIZ' });
    expect(e).toBeInstanceOf(VizValidationError);
    expect(e.field).toBe('amount');
    expect(e.expected).toContain('precision');
  });

  it('VizTransportError preserves cause', () => {
    const cause = new Error('fetch failed');
    const e = new VizTransportError({ message: 'network', cause });
    expect(e).toBeInstanceOf(VizTransportError);
    expect(e.cause).toBe(cause);
  });
});
