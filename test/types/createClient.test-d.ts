import { expectType, expectError, expectAssignable } from 'tsd';
import {
  createClient,
  type VizClient,
  type VizReadClient,
  type AccountName,
  type Wif,
  type TransactionResult,
} from '../../src/index';
import { viz, shares } from '../../src/index';

const reader = createClient();
expectType<VizReadClient>(reader);
expectError(reader.transfer({ to: 'bob' as AccountName, amount: '1.000 VIZ' }));

const writer = createClient({
  account: 'alice' as AccountName,
  activeKey: 'WIF' as Wif,
});
expectAssignable<VizClient>(writer);

expectType<Promise<TransactionResult>>(
  writer.transfer({ to: 'bob' as AccountName, amount: viz('1.000') }),
);

// Symbol mismatch caught
expectError(writer.transfer({ to: 'bob' as AccountName, amount: shares('1.000000') }));

// Missing required field
expectError(writer.transfer({ amount: '1.000 VIZ' }));

// `from` is implicit, must NOT be supplied to curated method
expectError(writer.transfer({ from: 'alice' as AccountName, to: 'bob' as AccountName, amount: '1.000 VIZ' }));
