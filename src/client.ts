import type { ClientOptions } from './config';
import { normalizeOptions } from './config';
import { createHttpTransport, type Transport } from './transport';
import { createReadApi, type ReadApi } from './api';
import { createTxBuilder, sign, type TxBuilder } from './tx';
import { CURATED_METHOD_TO_OP, CURATED_IMPLICIT_FIELD, type CuratedClient } from './ops/curated';
import { VizValidationError } from './errors';
import type { SignedTransaction, TransactionResult } from './types';

export interface VizReadClient {
  api: ReadApi;
  tx(): TxBuilder;
  broadcast(signed: SignedTransaction): Promise<TransactionResult>;
}

export interface VizClient extends VizReadClient, CuratedClient {}

interface InternalOptions extends ClientOptions {
  transport?: Transport;
}

export function createClient(): VizReadClient;
export function createClient(opts: InternalOptions & { account: string; activeKey: string }): VizClient;
export function createClient(opts: InternalOptions): VizReadClient;
export function createClient(opts: InternalOptions = {}): VizReadClient | VizClient {
  const norm = normalizeOptions(opts);
  const transport = opts.transport ?? createHttpTransport(norm.endpoint, { timeoutMs: norm.timeoutMs });
  const api = createReadApi(transport);

  const txFactory = (): TxBuilder => createTxBuilder({ transport, expirationSec: norm.expirationSec });
  const broadcastFn = (signed: SignedTransaction): Promise<TransactionResult> => transport.broadcast(signed);

  const readClient: VizReadClient = {
    api,
    tx: txFactory,
    broadcast: broadcastFn,
  };

  if (!norm.account || !norm.activeKey) {
    return readClient;
  }

  const account = norm.account;
  const activeKey = norm.activeKey;

  const curated = {} as CuratedClient;
  const bag = curated as unknown as Record<string, (args: Record<string, unknown>) => Promise<TransactionResult>>;

  for (const method of Object.keys(CURATED_METHOD_TO_OP) as Array<keyof CuratedClient>) {
    const opName = CURATED_METHOD_TO_OP[method];
    const implicitField = CURATED_IMPLICIT_FIELD[method];
    bag[method] = async (args: Record<string, unknown>) => {
      if (typeof args !== 'object' || args === null) {
        throw new VizValidationError({ field: method, expected: 'object', received: args });
      }
      const params = implicitField ? { ...args, [implicitField]: account } : args;
      const tx = await txFactory().op(opName, params as never).build();
      const signed = await sign(tx, { activeKey });
      return broadcastFn(signed);
    };
  }

  return { ...readClient, ...curated };
}
