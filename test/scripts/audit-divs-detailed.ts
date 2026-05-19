// @ts-nocheck
import fs from 'fs';
import path from 'path';

const masterPath = path.join(process.cwd(), 'private', 'portfolio-master.json');
const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

const dividends = master.transactions
    .filter((t: any) => t.type === 'DIVIDEND')
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

const bySource: Record<string, number> = {};

console.log('Date       | Amount | Symbol | Source');
console.log('-----------|--------|--------|-------------------');
dividends.forEach((d: any) => {
    console.log(`${d.date.split('T')[0]} | ${d.amount.toFixed(2).padStart(6)} | ${d.symbol.padEnd(6)} | ${d.source}`);
    bySource[d.source] = (bySource[d.source] || 0) + d.amount;
});

console.log('\n--- Summary by Source ---');
Object.entries(bySource).forEach(([source, total]) => {
    console.log(`${source.padEnd(20)}: ${total.toFixed(2)} €`);
});

const grandTotal = Object.values(bySource).reduce((a, b) => a + b, 0);
console.log(`\nGrand Total: ${grandTotal.toFixed(2)} €`);
console.log(`Total Count: ${dividends.length}`);
