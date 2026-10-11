import { expectAssignable, expectError } from 'tsd';
import type {
  OperationParams,
  OperationName,
  AccountName,
  AssetInput,
} from '../../src/index';

expectAssignable<OperationParams<'transfer'>>({
  from: 'alice' as AccountName,
  to: 'bob' as AccountName,
  amount: '1.000 VIZ' as AssetInput<'VIZ'>,
});

expectAssignable<OperationName>('committee_vote_request');
expectAssignable<OperationName>('transfer');

expectAssignable<OperationName>('pm_place_bet');
expectAssignable<OperationParams<'pm_lazy_deposit'>>({
  account: 'alice' as AccountName,
  amount: '1.000 VIZ' as AssetInput<'VIZ'>,
});

// amount is required
expectError<OperationParams<'pm_place_bet'>>({
  account: 'alice' as AccountName,
  marketId: 1, side: 1, outcomeIndex: -1, minTokens: 0, mode: 0,
});
