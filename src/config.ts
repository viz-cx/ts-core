import type { AccountName, Wif } from './types';

export const DEFAULT_ENDPOINT = 'https://node.viz.cx';
export const DEFAULT_TIMEOUT_MS = 15_000;
export const DEFAULT_EXPIRATION_SEC = 30;

export interface ClientOptions {
  endpoint?: string;
  account?: AccountName | string;
  activeKey?: Wif | string;
  timeoutMs?: number;
  expirationSec?: number;
}

export interface NormalizedOptions {
  endpoint: string;
  account?: string;
  activeKey?: string;
  timeoutMs: number;
  expirationSec: number;
}

export function normalizeOptions(opts: ClientOptions): NormalizedOptions {
  const out: NormalizedOptions = {
    endpoint: opts.endpoint ?? DEFAULT_ENDPOINT,
    timeoutMs: opts.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    expirationSec: opts.expirationSec ?? DEFAULT_EXPIRATION_SEC,
  };
  if (opts.account !== undefined) out.account = opts.account;
  if (opts.activeKey !== undefined) out.activeKey = opts.activeKey;
  return out;
}
