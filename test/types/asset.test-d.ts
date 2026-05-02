import { expectType, expectError } from 'tsd';
import { type Asset, viz, shares } from '../../src/index';

expectType<Asset<'VIZ'>>(viz('1.000'));
expectType<Asset<'SHARES'>>(shares('1.000000'));

const a = viz('1.000');
const b = shares('1.000000');
expectError(a.add(b)); // symbol mismatch
expectType<Asset<'VIZ'>>(a.add(viz('0.500')));
