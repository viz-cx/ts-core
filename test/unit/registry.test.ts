import { describe, it, expectTypeOf } from 'vitest';
import type { OperationName, OperationParams, Operation } from '../../src/ops/registry';

describe('operation registry', () => {
  it('exposes curated v1 op shapes', () => {
    expectTypeOf<OperationParams<'transfer'>>().toMatchTypeOf<{
      from: string; to: string; amount: unknown; memo?: string;
    }>();
    expectTypeOf<OperationParams<'award'>>().toMatchTypeOf<{
      initiator: string; receiver: string; energy: number;
    }>();
    expectTypeOf<OperationParams<'custom'>>().toMatchTypeOf<{
      id: string; json: string;
    }>();
  });

  it('exposes long-tail ops', () => {
    expectTypeOf<OperationName>().toMatchTypeOf<'vote' | 'content' | 'proposal_create'>();
  });

  it('Operation<T> is a tagged 2-tuple', () => {
    expectTypeOf<Operation<'transfer'>>().toMatchTypeOf<readonly ['transfer', OperationParams<'transfer'>]>();
  });
});
