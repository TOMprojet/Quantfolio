
import { MasterStore } from '../lib/core/persistence/master-store';

const master = MasterStore.load();
const txs = master.transactions.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

console.log('--- USER FORMULA CASH AUDIT ---');
console.log('Formula: Cash = Deposits(Exchanges) - (Purchases + Fees) + Dividends\n');

let totalDeposits = 0;
let totalPurchases = 0;
let totalDividends = 0;
let totalWithdrawals = 0; // Keeping track to see if they apply

txs.forEach((t: any) => {
    const isExchange = t.source.startsWith('PP:') || t.source === 'IBKR';
    if (!isExchange) return;

    if (t.type === 'DEPOSIT') {
        const isAsset = t.symbol && t.symbol !== 'CASH' && !t.symbol.includes('EUR.USD') && t.symbol !== 'EUR';
        if (!isAsset) {
            totalDeposits += t.amount;
        }
    } else if (t.type === 'WITHDRAWAL') {
        const isAsset = t.symbol && t.symbol !== 'CASH' && !t.symbol.includes('EUR.USD') && t.symbol !== 'EUR';
        if (!isAsset) {
            totalWithdrawals += t.amount; // Withdrawals are negative, so += reduces
        }
    } else if (t.type === 'BUY') {
        totalPurchases += Math.abs(t.amount); // amount is negative for BUY
    } else if (t.type === 'SELL') {
        totalPurchases -= t.amount; // SELL increases cash, so -= a positive amount reduces the "spent" total
    } else if (t.type === 'DIVIDEND') {
        totalDividends += t.amount;
    } else if (t.type === 'FEE') {
        totalPurchases += Math.abs(t.amount);
    }
});

const finalCash = totalDeposits - totalPurchases + totalDividends + totalWithdrawals;

console.log(`1. Total Deposits (Exchanges):     ${totalDeposits.toFixed(2).padStart(10)} €`);
console.log(`2. Total Purchases + Fees (Net):   ${totalPurchases.toFixed(2).padStart(10)} € (Negative = Sales > Buys)`);
console.log(`3. Total Dividends:                ${totalDividends.toFixed(2).padStart(10)} €`);
console.log(`4. Total Withdrawals:              ${totalWithdrawals.toFixed(2).padStart(10)} €`);
console.log('-------------------------------------------');
console.log(`FINAL CALCULATED CASH:             ${finalCash.toFixed(2).padStart(10)} €`);
console.log('');
console.log('Latest Master Metric Cash:', master.metrics[master.metrics.length - 1]?.cashBalance);
