'use strict';

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
  plugins: ['@typescript-eslint'],
  rules: {
    'no-direct-viz-js-lib': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  overrides: [
    { files: ['scripts/**/*.mjs', 'examples/**/*'], rules: { '@typescript-eslint/no-unused-vars': 'off' } },
    { files: ['test/**/*.ts'], rules: { '@typescript-eslint/no-explicit-any': 'off' } },
  ],
  ignorePatterns: ['dist/', 'node_modules/', 'coverage/', '.pack-tmp/'],
};
