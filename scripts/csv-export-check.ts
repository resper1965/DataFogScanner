import assert from 'node:assert';
import { quoteCsvField } from '../shared/csv.js';

const rows = [
  [1, 'foo,bar', 'He said "hello"']
];

const csv = ['ID,Value,Note',
  ...rows.map(r => r.map(quoteCsvField).join(','))
].join('\n');

const expected = 'ID,Value,Note\n"1","foo,bar","He said ""hello"""';
assert.strictEqual(csv, expected);
console.log('CSV export helper works');

