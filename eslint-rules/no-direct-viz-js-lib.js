'use strict';
const path = require('node:path');

const ALLOWED = new Set([
  path.normalize('test/oracle/serializer.oracle.test.ts'),
  path.normalize('test/oracle/crypto.oracle.test.ts'),
  path.normalize('test/oracle/sign.oracle.test.ts'),
  path.normalize('test/oracle/viz-js-lib.d.ts'),
  path.normalize('scripts/gen-golden.mjs'),
]);

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: "Restrict viz-js-lib imports to adapter seam files" },
    schema: [],
    messages: {
      forbidden: "Importing 'viz-js-lib' is allowed only in test/oracle/** and scripts/gen-golden.mjs",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value !== 'viz-js-lib') return;
        const filename = path.relative(process.cwd(), context.getFilename());
        if (!ALLOWED.has(filename)) {
          context.report({ node, messageId: 'forbidden' });
        }
      },
    };
  },
};
