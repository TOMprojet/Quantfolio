// @ts-nocheck
import fs from 'fs';
import path from 'path';

const masterPath = path.join(process.cwd(), 'private', 'portfolio-master.json');
const master = JSON.parse(fs.readFileSync(masterPath, 'utf8'));

const dividends = master.transactions
    .filter((t: any) => t.type === 'DIVIDEND')
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

console.log(`Found ${dividends.length} dividends:`);
let total = 0;
dividends.forEach((d: any) => {
    console.log(`${d.date.split('T')[0]} | ${d.amount.toFixed(2)} | ${d.symbol} | ${d.source}`);
    total += d.amount;
});
console.log(`Total Dividends: ${total.toFixed(2)} €`);
