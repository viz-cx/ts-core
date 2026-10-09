import { expectAssignable } from 'tsd';
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
