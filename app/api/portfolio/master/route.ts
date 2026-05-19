
import { NextResponse } from 'next/server';
import { MasterStore } from '../../../../lib/core/persistence/master-store';
import { MasterAnalyzer } from '../../../../lib/finance/master-analyzer';

export async function GET() {
    try {
        // ALWAYS recompute on load for Real-Time performance
        // This will fetch live quotes and merge with Master Store simulated prices
        const results = await MasterAnalyzer.recomputeAndPersist({ useLivePrices: true });

        return NextResponse.json(results);
    } catch (e: any) {
        console.error("[API] Master route error:", e);
        // Fallback to static data if re-computation fails
        const master = MasterStore.load();
        return NextResponse.json({
            assets: master.assets,
            metrics: master.metrics,
            transactions: master.transactions,
            lastUpdated: master.lastUpdated,
            error: e.message
        });
    }
}
