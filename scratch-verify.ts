import { MasterStore } from './lib/core/persistence/master-store';
import { MasterAnalyzer } from './lib/finance/master-analyzer';
import fs from 'fs';
import path from 'path';
import { parseIbkrCsv } from './lib/parsers/csv';

async function run() {
    console.log("Starting verification...");
    
    // 1. Re-import the CSV
    const csvPath = 'test/import/U17749253.TRANSACTIONS.20250203.20260512.csv';
    const content = fs.readFileSync(csvPath, 'utf8');
    const txs = parseIbkrCsv(content);
    
    console.log(`Parsed ${txs.length} transactions from IBKR CSV.`);
    
    // 2. Update Master Store for IBKR source
    MasterStore.updateTransactionsForSource('IBKR', txs as any);
    
    // 3. Recompute
    await MasterAnalyzer.recomputeAndPersist({ force: true });
    
    // 4. Verify last metric
    const master = MasterStore.load();
    const lastMetric = master.metrics[master.metrics.length - 1];
    
    console.log("--- FINAL VERIFICATION ---");
    console.log(`Invested Capital: ${lastMetric.investedCapital}`);
    console.log(`Total Value: ${lastMetric.totalValue}`);
    console.log(`Cash Balance: ${lastMetric.cashBalance}`);
    
    const ma = master.assets['MA'];
    if (ma) {
        console.log(`MA PRU (Native): ${ma.pruNative}`);
        console.log(`MA Qty: ${ma.quantity}`);
    }
}

run().catch(console.error);
