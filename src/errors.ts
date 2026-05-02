export class VizRpcError extends Error {
  readonly code: number;
  readonly method: string;
  readonly data: unknown;
  constructor(opts: { code: number; method: string; data?: unknown; message: string }) {
    super(opts.message);
    this.name = 'VizRpcError';
    this.code = opts.code;
    this.method = opts.method;
    this.data = opts.data;
  }
}

export class VizValidationError extends Error {
  readonly field: string;
  readonly expected: string;
  readonly received: unknown;
  constructor(opts: { field: string; expected: string; received: unknown; message?: string }) {
    super(opts.message ?? `Invalid ${opts.field}: expected ${opts.expected}`);
    this.name = 'VizValidationError';
    this.field = opts.field;
    this.expected = opts.expected;
    this.received = opts.received;
  }
}

export class VizTransportError extends Error {
  override readonly cause?: unknown;
  constructor(opts: { message: string; cause?: unknown }) {
    super(opts.message);
    this.name = 'VizTransportError';
    this.cause = opts.cause;
  }
}
