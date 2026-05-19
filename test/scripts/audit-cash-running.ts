// @ts-nocheck

import { MasterStore } from '../../lib/core/persistence/master-store';

const master = MasterStore.load();
const sortedTx = master.transactions.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

let cash = 0;
console.log('--- RUNNING CASH BALANCE AUDIT ---');
console.log('Date'.padEnd(12) + ' | ' + 'Type'.padEnd(12) + ' | ' + 'Amount'.padStart(10) + ' | ' + 'Balance'.padStart(12) + ' | ' + 'Source');

sortedTx.forEach((t: any) => {
    const amt = t.amount || 0;
    const oldCash = cash;

    // Engine logic reproduced
    if (['DEPOSIT', 'WITHDRAWAL', 'BUY', 'SELL', 'DIVIDEND'].includes(t.type)) {
        if (t.type === 'DEPOSIT') {
            // Only if cash deposit (no symbol or symbol is CASH)
            if (!t.symbol || t.symbol === 'CASH' || t.symbol === 'EUR') {
                cash += amt;
            }
        } else {
            cash += amt;
        }
    } else {
        // Fees etc
        cash += amt;
    }

    if (Math.abs(cash - oldCash) > 0.01) {
        console.log(`${new Date(t.date).toISOString().split('T')[0].padEnd(12)} | ${t.type.padEnd(12)} | ${amt.toFixed(2).padStart(10)} | ${cash.toFixed(2).padStart(12)} | ${t.source}`);
    }
});

console.log('\nFinal Calculated Cash:', cash.toFixed(2));
