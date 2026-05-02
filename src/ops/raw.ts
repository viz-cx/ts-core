import type { OperationName, OperationParams } from './registry';

export interface RawTxOp {
  op<T extends OperationName>(name: T, params: OperationParams<T>): this;
}
