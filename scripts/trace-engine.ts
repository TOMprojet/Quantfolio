
import { MasterStore } from '../lib/core/persistence/master-store';
import { format } from 'date-fns';

const master = MasterStore.load();
const txs = master.transactions.map(t => ({
    ...t,
    date: new Date(t.date)
})).sort((a, b) => a.date.getTime() - b.date.getTime());

let cash = 0;
console.log('--- ENGINE TRACE ---');
txs.forEach(t => {
    const oldCash = cash;
    const dStr = format(t.date, 'yyyy-MM-dd');

    // Reproduce EXACT Engine logic for cash
    let amountEur = t.amount;
    // (Simplified FX for this trace, since t.amount in master should already be in EUR according to recent fixes, 
    // or we use the logic from engine)

    // In engine line 178: let amountEur = t.amount;
    // Then it adds cash += finalAmount;

    if (t.type === 'DEPOSIT') {
        if (!(t.symbol && t.symbol !== 'CASH' && !t.symbol.includes('EUR.USD') && t.symbol !== 'EUR')) {
            cash += t.amount;
        }
    } else if (t.type === 'WITHDRAWAL' || t.type === 'BUY' || t.type === 'SELL' || t.type === 'DIVIDEND') {
        if (!(t.type === 'WITHDRAWAL' && t.symbol && t.symbol !== 'CASH')) {
            cash += t.amount;
        }
    } else {
        // Fees etc
        cash += t.amount;
    }

    if (Math.abs(cash - oldCash) > 0.01) {
        console.log(`[${dStr}] ${t.type.padEnd(10)} | ${t.amount.toFixed(2).padStart(10)} | New Balance: ${cash.toFixed(2).padStart(12)} | ${t.source}`);
    }
});
console.log('\nFinal Balance:', cash.toFixed(2));
