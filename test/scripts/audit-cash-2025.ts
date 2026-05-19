// @ts-nocheck

import { MasterStore } from '../../lib/core/persistence/master-store';

const master = MasterStore.load();
const txs = master.transactions;

console.log('--- CASH FLOW 2025 AUDIT ---');
const flow2025 = txs.filter(t =>
    (t.type === 'DEPOSIT' || t.type === 'WITHDRAWAL') &&
    new Date(t.date).getFullYear() === 2025
).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

flow2025.forEach(t => {
    console.log(`[${new Date(t.date as any).toISOString().split('T')[0]}] ${t.type.padEnd(10)} | ${t.amount.toFixed(2).padStart(10)} ${t.currency} | ${t.source.padEnd(20)} | Symbol: ${t.symbol}`);
});

console.log('\nTotal Flow for 2025:', flow2025.reduce((sum, t) => sum + t.amount, 0).toFixed(2));
