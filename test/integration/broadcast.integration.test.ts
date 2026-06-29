/**
 * Opt-in live-node signing integration test.
 *
 * Gated on VIZ_TEST_ACTIVE_KEY (and optionally VIZ_TEST_ACCOUNT).
 * Does NOT broadcast — it constructs a real transaction using a live block
 * header from the node, signs it, then verifies the signature recovers to the
 * expected public key.  This confirms the full signing path is correct against
 * a real chain state without touching any account balance.
 *
 * Run:
 *   VIZ_TEST_ACTIVE_KEY=<wif> pnpm test:integration
 */

import { describe, it, expect } from 'vitest';
import { sha256 } from '@noble/hashes/sha2';
import { hexToBytes } from '@noble/hashes/utils';
import { sign } from '../../src/tx';
import { serializeTransaction } from '../../src/serializer/transaction';
import { recoverPubkey } from '../../src/crypto/ecdsa';
import { wifToPublic } from '../../src/crypto/keys';
import { CHAIN_ID } from '../../src/constants';

const KEY = process.env.VIZ_TEST_ACTIVE_KEY;
const ACCOUNT = process.env.VIZ_TEST_ACCOUNT ?? 'committee';
const NODE = process.env.VIZ_TEST_NODE ?? 'https://node.viz.cx';

const run = KEY ? describe : describe.skip;

run('signing: real block header + signature recovery', () => {
  it('signs a transfer tx and recovers the correct public key', async () => {
    // Step 1: fetch live DGP from node
    const dgpRes = await fetch(NODE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 1,
        jsonrpc: '2.0',
        method: 'call',
        params: ['database_api', 'get_dynamic_global_properties', []],
      }),
    });
    const dgpJson = (await dgpRes.json()) as { result: { head_block_id: string; time: string } };
    const dgp = dgpJson.result;

    expect(typeof dgp.head_block_id).toBe('string');
    expect(typeof dgp.time).toBe('string');

    // Step 2: derive ref block fields from head block id (same logic as tx.ts)
    const headId = dgp.head_block_id;
    const refBlockNum = parseInt(headId.slice(0, 8), 16) & 0xffff;
    const prefixHex = headId.slice(8, 16);
    const prefixParts = prefixHex.match(/.{2}/g) ?? [];
    const refBlockPrefix = parseInt(prefixParts.reverse().join(''), 16) >>> 0;

    // Expiration = head time + 60 s
    const headTimeMs = new Date(dgp.time.endsWith('Z') ? dgp.time : dgp.time + 'Z').getTime();
    const expiration = new Date(headTimeMs + 60_000).toISOString().replace(/\.\d{3}Z$/, '');

    // Step 3: build UnsignedTransaction (all in snake_case inside operations)
    const tx = {
      refBlockNum,
      refBlockPrefix,
      expiration,
      operations: [
        ['transfer', {
          from: ACCOUNT,
          to: ACCOUNT,
          amount: '0.001 VIZ',
          memo: 'ts-core sign-verify',
        }],
      ] as ReadonlyArray<readonly [string, Record<string, unknown>]>,
      extensions: [] as ReadonlyArray<unknown>,
    };

    // Step 4: sign — this produces signatures[]
    const wif = KEY!;
    const signed = await sign(tx, { activeKey: wif });

    expect(signed.signatures).toHaveLength(1);
    const sigHex = signed.signatures[0]!;
    expect(sigHex).toMatch(/^[0-9a-f]{130}$/);

    // Step 5: recompute the digest and verify recovery
    const wire = {
      ref_block_num: tx.refBlockNum,
      ref_block_prefix: tx.refBlockPrefix,
      expiration: tx.expiration,
      operations: tx.operations,
      extensions: tx.extensions,
    };
    const txBytes = serializeTransaction(wire);
    const cidBytes = hexToBytes(CHAIN_ID);
    const payload = new Uint8Array(cidBytes.length + txBytes.length);
    payload.set(cidBytes, 0);
    payload.set(txBytes, cidBytes.length);
    const digest = sha256(payload);

    const recoveredPub = recoverPubkey(digest, sigHex);
    const expectedPub = wifToPublic(wif);

    expect(recoveredPub).toBe(expectedPub);
  }, 30_000);
});
