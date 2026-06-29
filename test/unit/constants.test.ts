import { describe, it, expect } from 'vitest';
import { CHAIN_ID, ADDRESS_PREFIX, OP_TYPE_IDS } from '../../src/constants';

describe('chain constants', () => {
  it('has the VIZ chain id', () => {
    expect(CHAIN_ID).toBe('2040effda178d4fffff5eab7a915d4019879f5205cc5392e4bcced2b6edda0cd');
    expect(ADDRESS_PREFIX).toBe('VIZ');
  });

  it('maps op names to their st_operations index', () => {
    // Spot-check against operation.st_operations ordering in viz-js-lib.
    expect(OP_TYPE_IDS['transfer']).toBe(2);
    expect(OP_TYPE_IDS['transfer_to_vesting']).toBe(3);
    expect(OP_TYPE_IDS['account_validator_vote']).toBe(7);
    expect(OP_TYPE_IDS['custom']).toBe(10);
    expect(OP_TYPE_IDS['award']).toBe(47);
    expect(OP_TYPE_IDS['set_reward_sharing']).toBe(64);
  });
});
