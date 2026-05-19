const { parseIbkrCsv } = require('./lib/parsers/csv');
const fs = require('fs');

const content = fs.readFileSync('test/import/U17749253.TRANSACTIONS.20250203.20260512.csv', 'utf8');
const txs = parseIbkrCsv(content);

console.log(`Total Transactions: ${txs.length}`);
const maTxs = txs.filter(t => t.symbol === 'MA');
console.log('--- MA Transactions ---');
maTxs.forEach(t => {
    console.log(`${t.date} | ${t.type} | Price: ${t.price} | Qty: ${t.quantity} | Currency: ${t.currency}`);
});

const anchor = txs.find(t => t.description.includes('Ancrage'));
console.log('--- Anchor ---');
console.log(JSON.stringify(anchor, null, 2));
