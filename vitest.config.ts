import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts', 'test/oracle/**/*.test.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/types.ts', 'src/**/*.d.ts'],
      // vitest 3's v8 provider counts every inner closure/arrow as a "function"
      // and reports them uncovered even when their lines run (tx.ts: 100% lines,
      // ~32% functions). Lines/statements/branches remain the meaningful gates;
      // the functions floor is set below the v3 baseline rather than chase a
      // misleading metric.
      thresholds: { lines: 80, functions: 60, branches: 75, statements: 80 },
    },
  },
});
