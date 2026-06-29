import { describe, it, expect } from 'vitest';
import { ByteWriter } from '../../src/serializer/primitives';

describe('primitives', () => {
  it('uint16/uint32 little-endian', () => {
    expect(new ByteWriter().uint16(1).hex()).toBe('0100');
    expect(new ByteWriter().uint32(1).hex()).toBe('01000000');
  });
  it('int64 little-endian', () => {
    expect(new ByteWriter().int64(1n).hex()).toBe('0100000000000000');
    expect(new ByteWriter().int64(1000n).hex()).toBe('e803000000000000');
  });
  it('varint32 LEB128', () => {
    expect(new ByteWriter().varint32(0).hex()).toBe('00');
    expect(new ByteWriter().varint32(300).hex()).toBe('ac02');
  });
  it('string length-prefixed utf8', () => {
    expect(new ByteWriter().string('abc').hex()).toBe('03616263');
  });
  it('bool', () => {
    expect(new ByteWriter().bool(true).hex()).toBe('01');
    expect(new ByteWriter().bool(false).hex()).toBe('00');
  });
  it('time as uint32 seconds', () => {
    // 1970-01-01T00:00:01 -> 1
    expect(new ByteWriter().time('1970-01-01T00:00:01').hex()).toBe('01000000');
  });
  it('optional', () => {
    expect(new ByteWriter().optional(undefined, (w, v) => w.uint8(v)).hex()).toBe('00');
    expect(new ByteWriter().optional(5, (w, v) => w.uint8(v)).hex()).toBe('0105');
  });
  it('vector', () => {
    expect(new ByteWriter().vector([1, 2], (w, v) => w.uint8(v)).hex()).toBe('020102');
  });
});
