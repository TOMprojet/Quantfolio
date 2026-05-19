
import { MasterStore } from '../lib/core/persistence/master-store';

const master = MasterStore.load();
const txs = master.transactions.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

let currentCash = 0;
console.log('--- RECONCILIATION CASH (1333€) ---');
console.log('Date'.padEnd(12) + ' | ' + 'Type'.padEnd(10) + ' | ' + 'Avoir'.padStart(10) + ' | ' + 'Total'.padStart(12) + ' | ' + 'Source');

txs.forEach((t: any) => {
    const oldCash = currentCash;

    // Exact logic from FinanceEngine for cash
    if (t.type === 'DEPOSIT') {
        const isAsset = t.symbol && t.symbol !== 'CASH' && !t.symbol.includes('EUR.USD') && t.symbol !== 'EUR';
        if (!isAsset) currentCash += t.amount;
    } else if (t.type === 'WITHDRAWAL') {
        const isAsset = t.symbol && t.symbol !== 'CASH' && !t.symbol.includes('EUR.USD') && t.symbol !== 'EUR';
        if (!isAsset) currentCash += t.amount;
    } else if (['BUY', 'SELL', 'DIVIDEND', 'FEE'].includes(t.type)) {
        currentCash += t.amount;
    }

    if (Math.abs(currentCash - oldCash) > 0.01) {
        console.log(`${t.date.split('T')[0].padEnd(12)} | ${t.type.padEnd(10)} | ${t.amount.toFixed(2).padStart(10)} | ${currentCash.toFixed(2).padStart(12)} | ${t.source}`);
    }
});

console.log('\nCalculated Final Cash Balance:', currentCash.toFixed(2));
console.log('Master Store Metrics Final Cash:', master.metrics[master.metrics.length - 1]?.cashBalance);
