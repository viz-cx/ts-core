'use strict';
const path = require('node:path');

const ALLOWED = new Set([
  path.normalize('src/transport.ts'),
  path.normalize('src/auth.ts'),
  path.normalize('src/tx.ts'),
]);

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: "Restrict viz-js-lib imports to adapter seam files" },
    schema: [],
    messages: {
      forbidden: "Importing 'viz-js-lib' is allowed only in transport.ts/auth.ts/tx.ts",
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
