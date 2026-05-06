import { describe, it, expect, expectTypeOf } from 'vitest';
import { OP_NAMES } from '../../src/ops/registry';
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
    expectTypeOf<OperationName>().toMatchTypeOf<'account_update' | 'proposal_create'>();
  });

  it('Operation<T> is a tagged 2-tuple', () => {
    expectTypeOf<Operation<'transfer'>>().toMatchTypeOf<readonly ['transfer', OperationParams<'transfer'>]>();
  });

  it('OP_NAMES contains every curated v1 op', () => {
    expect(OP_NAMES.length).toBeGreaterThan(35);
    expect(OP_NAMES).toContain('transfer');
    expect(OP_NAMES).toContain('award');
    expect(OP_NAMES).toContain('custom');
    expect(OP_NAMES).toContain('committee_vote_request');
    expect(OP_NAMES).toContain('proposal_create');
    expect(new Set(OP_NAMES).size).toBe(OP_NAMES.length);
  });
});
