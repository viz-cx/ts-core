const { createClient, DEFAULT_ENDPOINT, viz } = require('@viz-cx/core');

console.log('endpoint:', DEFAULT_ENDPOINT);
console.log('asset:', viz('1.000').toString());
const client = createClient();
console.log('client has api:', typeof client.api.getAccounts === 'function');
