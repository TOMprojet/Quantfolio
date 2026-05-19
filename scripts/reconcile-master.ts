
import { MasterStore } from '../lib/core/persistence/master-store';

const master = MasterStore.load();
const txs = master.transactions;

console.log('--- MASTER DATA AUDIT ---');

const summary: any = {};

txs.forEach(t => {
    const key = `${t.source} | ${t.account || 'N/A'}`;
    if (!summary[key]) summary[key] = { deposits: 0, dividends: 0, count: 0 };

    if (t.type === 'DEPOSIT') {
        // Only count cash deposits for the "Deposit" metric
        const isAsset = t.symbol && t.symbol !== 'CASH' && t.symbol !== 'EUR' && !t.symbol.includes('EUR.USD');
        if (!isAsset) {
            summary[key].deposits += t.amount;
        }
    } else if (t.type === 'DIVIDEND') {
        summary[key].dividends += t.amount;
    }
    summary[key].count++;
});

console.table(Object.entries(summary).map(([source, data]: any) => ({
    Source: source,
    Deposits: data.deposits.toFixed(2),
    Dividends: data.dividends.toFixed(2),
    Transactions: data.count
})));

const totalDeposits = Object.values(summary).reduce((acc: number, val: any) => acc + val.deposits, 0);
const totalDividends = Object.values(summary).reduce((acc: number, val: any) => acc + val.dividends, 0);

console.log(`\nTOTAL DEPOSITS:  ${totalDeposits.toFixed(2)} € (Target: 13010.00)`);
console.log(`TOTAL DIVIDENDS: ${totalDividends.toFixed(2)} € (Target: ~129.44)`);
