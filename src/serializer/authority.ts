import type { ByteWriter } from './primitives';

type AuthLike = Record<string, unknown>;

export function writeAuthority(w: ByteWriter, a: AuthLike): void {
  const threshold = (a['weight_threshold'] ?? a['weightThreshold']) as number;
  w.uint32(threshold);

  const rawAccountAuths = (a['account_auths'] ?? a['accountAuths'] ?? []) as Array<[string, number]>;
  const accountAuths = [...rawAccountAuths].sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
  w.vector(accountAuths, (ww, [name, weight]) => {
    ww.string(name);
    ww.uint16(weight);
  });

  const rawKeyAuths = (a['key_auths'] ?? a['keyAuths'] ?? []) as Array<[string, number]>;
  const keyAuths = [...rawKeyAuths].sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
  w.vector(keyAuths, (ww, [key, weight]) => {
    ww.pubkey(key);
    ww.uint16(weight);
  });
}
