import { MasterAnalyzer } from '../lib/finance/master-analyzer';

async function forceSync() {
    console.log("--- TRIGGERING FORCE RECOMPUTE ---");
    await MasterAnalyzer.recomputeAndPersist({ useLivePrices: true });
    console.log("--- DONE ---");
}

forceSync().catch(console.error);
