import { createClient, DEFAULT_ENDPOINT, viz } from '@viz-cx/core';

console.log('endpoint:', DEFAULT_ENDPOINT);
console.log('asset:', viz('1.000').toString());
const client = createClient();
console.log('client has api:', typeof client.api.getAccounts === 'function');
