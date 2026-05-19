
import { MasterStore } from '../lib/core/persistence/master-store';
import { MasterAnalyzer } from '../lib/finance/master-analyzer';

async function forceClean() {
    console.log('[FORCE] Loading Master...');
    const master = MasterStore.load();
    const initialCount = master.transactions.length;

    console.log('[FORCE] Filtering out Bitget sources...');
    const newTxs = master.transactions.filter(t => {
        const isBitget = t.source && typeof t.source === 'string' && t.source.toLowerCase().includes('bitget');
        if (isBitget) {
            console.log(`[DELETE] Removing: ${t.date} ${t.type} ${t.symbol} (${t.source})`);
        }
        return !isBitget;
    });

    if (newTxs.length === initialCount) {
        console.log('[FORCE] No Bitget transactions found to delete.');
    } else {
        console.log(`[FORCE] Deleted ${initialCount - newTxs.length} transactions.`);
        master.transactions = newTxs;
        MasterStore.save(master);
        console.log('[FORCE] Master saved.');
    }

    console.log('[FORCE] Triggering Recompute...');
    await MasterAnalyzer.recomputeAndPersist({ useLivePrices: false });
    console.log('[FORCE] Done.');

    // Check USDT status immediately
    const fresh = MasterStore.load();
    console.log('--- FINAL USDT STATUS ---');
    console.log(JSON.stringify(fresh.assets['USDT-USD'], null, 2));
}

forceClean().catch(console.error);
