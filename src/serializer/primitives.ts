import { pubkeyToBytes } from '../crypto/keys';
import { VizValidationError } from '../errors';

const encoder = new TextEncoder();

export class ByteWriter {
  private buf: number[] = [];

  push(...b: number[]): this { this.buf.push(...b); return this; }
  raw(bytes: Uint8Array): this { for (const b of bytes) this.buf.push(b); return this; }

  uint8(n: number): this { this.buf.push(n & 0xff); return this; }
  int16(n: number): this { this.buf.push(n & 0xff, (n >> 8) & 0xff); return this; }
  uint16(n: number): this { this.buf.push(n & 0xff, (n >>> 8) & 0xff); return this; }
  uint32(n: number): this {
    this.buf.push(n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff);
    return this;
  }
  int64(v: bigint): this {
    let x = BigInt.asUintN(64, v);
    for (let i = 0; i < 8; i++) { this.buf.push(Number(x & 0xffn)); x >>= 8n; }
    return this;
  }
  varint32(n: number): this {
    let x = n >>> 0;
    do {
      let byte = x & 0x7f;
      x >>>= 7;
      if (x) byte |= 0x80;
      this.buf.push(byte);
    } while (x);
    return this;
  }
  bool(b: boolean): this { this.buf.push(b ? 1 : 0); return this; }
  string(s: string): this {
    const bytes = encoder.encode(s);
    this.varint32(bytes.length);
    return this.raw(bytes);
  }
  time(iso: string): this {
    const normalized = /Z$|[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + 'Z';
    const ms = Date.parse(normalized);
    if (Number.isNaN(ms)) throw new VizValidationError({ field: 'time', expected: 'ISO date', received: iso });
    return this.uint32(Math.floor(ms / 1000));
  }
  pubkey(s: string): this { return this.raw(pubkeyToBytes(s)); }
  optional<T>(v: T | undefined | null, write: (w: ByteWriter, v: T) => void): this {
    if (v === undefined || v === null) return this.uint8(0);
    this.uint8(1);
    write(this, v);
    return this;
  }
  vector<T>(items: ReadonlyArray<T>, write: (w: ByteWriter, v: T) => void): this {
    this.varint32(items.length);
    for (const it of items) write(this, it);
    return this;
  }

  bytes(): Uint8Array { return Uint8Array.from(this.buf); }
  hex(): string { return Array.from(this.buf, b => b.toString(16).padStart(2, '0')).join(''); }
}
