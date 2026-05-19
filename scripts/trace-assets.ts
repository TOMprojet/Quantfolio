import fs from 'fs';
import { MasterStore } from '../lib/core/persistence/master-store';

function dumpTxs() {
    const master = MasterStore.load();
    const symbols = ['E3G1.F', 'NOV.DE', 'BTC', 'GOOG'];

    symbols.forEach(sym => {
        const txs = master.transactions.filter(t => t.symbol === sym || (t.symbol && t.symbol.includes(sym)));
        console.log(`\n=== ${sym} (${txs.length} txs) ===`);
        txs.forEach(t => {
            console.log(`${t.date} | ${t.type.padEnd(10)} | Qty: ${(t.quantity || 0).toString().padEnd(10)} | Price: ${(t.price || 0).toFixed(4).padEnd(10)} | Amount: ${t.amount.toFixed(2).padEnd(10)} | Source: ${t.source}`);
        });
    });
}

dumpTxs();
