
import { MasterStore } from '../lib/core/persistence/master-store';

const master = MasterStore.load();
const txs = master.transactions.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

console.log('--- FUZZY DUPLICATE SCAN (Same Amount/Type/Symbol, Same Day) ---');
for (let i = 0; i < txs.length; i++) {
    for (let j = i + 1; j < txs.length; j++) {
        const t1 = txs[i];
        const t2 = txs[j];

        const d1 = new Date(t1.date).toISOString().split('T')[0];
        const d2 = new Date(t2.date).toISOString().split('T')[0];

        if (d1 === d2 && t1.amount === t2.amount && t1.type === t2.type && t1.symbol === t2.symbol && t1.source !== t2.source) {
            console.log(`POTENTIAL DUPLICATE: [${d1}] ${t1.type} | ${t1.amount} | Symbol: ${t1.symbol}`);
            console.log(`  Source 1: ${t1.source} (Acc: ${t1.account})`);
            console.log(`  Source 2: ${t2.source} (Acc: ${t2.account})`);
            console.log('---');
        }
    }
}
