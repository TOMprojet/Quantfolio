// @ts-nocheck
import { MasterAnalyzer } from '../../lib/finance/master-analyzer';

async function auditAll() {
    console.log('--- GLOBAL ASSET PERFORMANCE AUDIT ---');
    try {
        const results = await MasterAnalyzer.recomputeAndPersist({ useLivePrices: false });
        if (!results) throw new Error('No results');

        const holdings = Object.values(results.assets);

        console.log('Symbol'.padEnd(12) + 'Qty'.padStart(10) + 'Price'.padStart(10) + 'Value'.padStart(10) + 'PRU'.padStart(10) + 'Perf %'.padStart(10));
        console.log('-'.repeat(72));

        holdings.sort((a, b) => b.value - a.value).forEach(h => {
            const perf = h.costBasisEur > 0 ? ((h.value - h.costBasisEur) / h.costBasisEur * 100) : 0;
            console.log(
                h.symbol.padEnd(12) +
                h.quantity.toFixed(4).padStart(10) +
                h.nativePrice.toFixed(2).padStart(10) +
                h.value.toFixed(2).padStart(10) +
                h.pruEur.toFixed(2).padStart(10) +
                perf.toFixed(2).padStart(10) + '%'
            );
        });
    } catch (e) {
        console.error(e);
    }
}

auditAll();
