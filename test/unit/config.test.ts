import { describe, it, expect } from 'vitest';
import { DEFAULT_ENDPOINT, DEFAULT_TIMEOUT_MS, DEFAULT_EXPIRATION_SEC, normalizeOptions } from '../../src/config';

describe('config', () => {
  it('exposes DEFAULT_ENDPOINT https://node.viz.cx', () => {
    expect(DEFAULT_ENDPOINT).toBe('https://node.viz.cx');
  });

  it('normalizeOptions fills defaults', () => {
    const o = normalizeOptions({});
    expect(o.endpoint).toBe('https://node.viz.cx');
    expect(o.timeoutMs).toBe(DEFAULT_TIMEOUT_MS);
    expect(o.expirationSec).toBe(DEFAULT_EXPIRATION_SEC);
  });

  it('normalizeOptions preserves overrides', () => {
    const o = normalizeOptions({ endpoint: 'https://x.test', timeoutMs: 5000 });
    expect(o.endpoint).toBe('https://x.test');
    expect(o.timeoutMs).toBe(5000);
  });
});
