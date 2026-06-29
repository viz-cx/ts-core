import type { ByteWriter } from './primitives';
import { writeAsset } from './asset';
import { writeAuthority } from './authority';
import { OP_TYPE_IDS } from '../constants';
import { OP_SCHEMA } from './op-schema';
import type { FieldType } from './op-schema';
import { VizValidationError } from '../errors';

// ----- chain_properties helpers -----

const CHAIN_PROPS_INIT_FIELDS: ReadonlyArray<readonly [string, FieldType]> = [
  ['account_creation_fee','asset'],['maximum_block_size','uint32'],
  ['create_account_delegation_ratio','uint32'],['create_account_delegation_time','uint32'],
  ['min_delegation','asset'],['min_curation_percent','int16'],['max_curation_percent','int16'],
  ['bandwidth_reserve_percent','int16'],['bandwidth_reserve_below','asset'],
  ['flag_energy_additional_cost','int16'],['vote_accounting_min_rshares','uint32'],
  ['committee_request_approve_min_percent','int16'],
];

const HF4_EXTRA: ReadonlyArray<readonly [string, FieldType]> = [
  ['inflation_validator_percent','int16'],
  ['inflation_ratio_committee_vs_reward_fund','int16'],
  ['inflation_recalc_period','uint32'],
];

const HF6_EXTRA: ReadonlyArray<readonly [string, FieldType]> = [
  ...HF4_EXTRA,
  ['data_operations_cost_additional_bandwidth','uint32'],
  ['validator_miss_penalty_percent','int16'],
  ['validator_miss_penalty_duration','uint32'],
];

const HF9_EXTRA: ReadonlyArray<readonly [string, FieldType]> = [
  ...HF6_EXTRA,
  ['create_invite_min_balance','asset'],['committee_create_request_fee','asset'],
  ['create_paid_subscription_fee','asset'],['account_on_sale_fee','asset'],
  ['subaccount_on_sale_fee','asset'],['validator_declaration_fee','asset'],
  ['withdraw_intervals','uint16'],
];

const HF13_EXTRA: ReadonlyArray<readonly [string, FieldType]> = [
  ...HF9_EXTRA,
  ['distribution_epoch_length','uint32'],
];

const VERSIONED_PROPS_FIELDS: ReadonlyArray<ReadonlyArray<readonly [string, FieldType]>> = [
  CHAIN_PROPS_INIT_FIELDS,
  [...CHAIN_PROPS_INIT_FIELDS, ...HF4_EXTRA],
  [...CHAIN_PROPS_INIT_FIELDS, ...HF6_EXTRA],
  [...CHAIN_PROPS_INIT_FIELDS, ...HF9_EXTRA],
  [...CHAIN_PROPS_INIT_FIELDS, ...HF13_EXTRA],
];

function writeChainPropsFields(w: ByteWriter, props: Record<string, unknown>, fields: ReadonlyArray<readonly [string, FieldType]>): void {
  for (const [field, type] of fields) writeField(w, type, props[field]);
}

// ----- field writer -----

function writeField(w: ByteWriter, type: FieldType, v: unknown): void {
  switch (type) {
    case 'string': w.string(String(v ?? '')); break;
    case 'asset': writeAsset(w, String(v)); break;
    case 'authority': writeAuthority(w, v as Record<string, unknown>); break;
    case 'pubkey': w.pubkey(String(v)); break;
    case 'bool': w.bool(Boolean(v)); break;
    case 'uint8': w.uint8(Number(v)); break;
    case 'uint16': w.uint16(Number(v)); break;
    case 'uint32': w.uint32(Number(v)); break;
    case 'int16': w.int16(Number(v)); break;
    case 'int64': w.int64(BigInt((v as number | string | bigint | undefined) ?? 0n)); break;
    case 'uint64': w.int64(BigInt.asUintN(64, BigInt((v as number | string | bigint | undefined) ?? 0n))); break;
    case 'varint': w.varint32(Number(v)); break;
    case 'time': w.time(String(v)); break;
    case 'extensions': w.varint32(0); break; // empty set
    case 'string[]':
      w.vector((v as string[]) ?? [], (ww, s) => ww.string(s));
      break;
    case 'pubkey[]':
      w.vector((v as string[]) ?? [], (ww, s) => ww.pubkey(s));
      break;
    case 'string-set': {
      const sortedStrings = [...((v as string[]) ?? [])].sort();
      w.vector(sortedStrings, (ww, s) => ww.string(s));
      break;
    }
    case 'pubkey-set': {
      const sortedPubkeys = [...((v as string[]) ?? [])].sort();
      w.vector(sortedPubkeys, (ww, key) => ww.pubkey(key));
      break;
    }
    case 'optional-string':
      w.optional(v == null ? undefined : String(v), (ww, s) => ww.string(s));
      break;
    case 'optional-time':
      w.optional(v == null ? undefined : String(v), (ww, s) => ww.time(s));
      break;
    case 'optional-authority':
      w.optional(v == null ? undefined : v as Record<string, unknown>, (ww, a) => writeAuthority(ww, a));
      break;
    case 'optional-pubkey':
      w.optional(v == null ? undefined : String(v), (ww, s) => ww.pubkey(s));
      break;
    case 'beneficiaries': {
      const items = (v as Array<{ account: string; weight: number }>) ?? [];
      // set(beneficiaries) — sorted by account name
      const sorted = [...items].sort((a, b) => (a.account < b.account ? -1 : a.account > b.account ? 1 : 0));
      w.vector(sorted, (ww, item) => {
        ww.string(item.account);
        ww.uint16(item.weight);
      });
      break;
    }
    case 'chain_properties': {
      const props = v as Record<string, unknown>;
      writeChainPropsFields(w, props, CHAIN_PROPS_INIT_FIELDS);
      break;
    }
    case 'versioned_chain_props': {
      // static_variant: v is [typeId, props]
      const [typeId, props] = v as [number, Record<string, unknown>];
      w.varint32(typeId);
      const fields = VERSIONED_PROPS_FIELDS[typeId];
      if (!fields) throw new VizValidationError({ field: 'versioned_chain_props', expected: 'typeId 0-4', received: typeId });
      writeChainPropsFields(w, props, fields);
      break;
    }
    case 'operations_array': {
      // array(operation_wrapper) — each wrapper is { op: [name, params] }
      const items = (v as Array<{ op: [string, Record<string, unknown>] }>) ?? [];
      w.varint32(items.length);
      for (const wrapper of items) {
        const [opName, opParams] = wrapper.op;
        writeOperation(w, opName, opParams);
      }
      break;
    }
    default:
      throw new VizValidationError({ field: 'serializer', expected: 'known field type', received: String(type) });
  }
}

export function writeOperation(w: ByteWriter, name: string, op: Record<string, unknown>): void {
  const id = OP_TYPE_IDS[name];
  if (id === undefined) throw new VizValidationError({ field: 'operation', expected: 'known op name', received: name });
  const schema = OP_SCHEMA[name];
  if (!schema) throw new VizValidationError({ field: 'op-schema', expected: 'schema for op', received: name });
  w.varint32(id);
  for (const [field, type] of schema) writeField(w, type, op[field]);
}
