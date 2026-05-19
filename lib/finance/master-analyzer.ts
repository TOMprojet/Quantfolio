import { MasterStore, AssetSnapshot } from '../core/persistence/master-store';
import { calculatePerformance } from './engine';
import { getAssetsMetadata } from './market-data-service';

/**
 * Service to orchestrate the "Compute on Import" logic.
 * Reads raw transactions from Master Store, runs Finance Engine, and persists results.
 */
export class MasterAnalyzer {

    /**
     * Trigger a full recalculation of the portfolio based on the Master Transaction History.
     * Includes a guard to skip recomputation if data is fresh (< 5 mins) and unchanged.
     * 
     * @param options.useLivePrices - If true, fetches latest quotes from Yahoo/CoinGecko
     * @param options.force - If true, ignores cache and forces full recompute
     */
    static async recomputeAndPersist(options: { useLivePrices?: boolean, force?: boolean } = {}) {
        const master = MasterStore.load();
        
        // --- SMART CACHING LOGIC ---
        const lastComputed = master.lastComputed ? new Date(master.lastComputed).getTime() : 0;
        const lastUpdated = master.lastUpdated ? new Date(master.lastUpdated).getTime() : 0;
        const now = Date.now();
        const staleTimeout = 1000 * 60 * 5; // 5 minutes

        // Re-enable smart caching to improve performance
        const isForceRun = false; 

        // Condition for SKIPPING recompute:
        const isFresh = (now - lastComputed < staleTimeout);
        const noChangesSinceCompute = lastComputed >= lastUpdated;
        
        const canSkip = !isForceRun && !options.force && lastComputed > 0 && noChangesSinceCompute && (isFresh || !options.useLivePrices);
        
        if (canSkip) {
            console.log(`[MASTER] Data is fresh or no changes since last compute (useLivePrices=${options.useLivePrices}). Skipping recompute.`);
            return { assets: master.assets, metrics: master.metrics, lastUpdated: master.lastUpdated, cached: true };
        }

        console.log(`[MASTER] Starting centralized re-computation (live=${options.useLivePrices}, force=${options.force})...`);
        const allTransactions = master.transactions;

        if (allTransactions.length === 0) {
            console.log("[MASTER] No transactions to process. Portfolio is empty.");
            // Reset computed data if it isn't already empty (important for first launch)
            if (Object.keys(master.assets || {}).length > 0 || master.metrics.length > 0) {
                MasterStore.updateComputedData({}, []);
            }
            return { assets: {}, metrics: [], lastUpdated: new Date().toISOString() };
        }

        // 2. Prepare Symbols list (Active + Historical for Metadata)
        const currentPrices: Record<string, number> = {};
        const activeSymbols = Object.keys(master.assets || {});
        const allHistoricalSymbols = Array.from(new Set(master.transactions
            .filter(t => t.symbol && !t.symbol.startsWith('CASH') && !t.symbol.includes('EUR.USD'))
            .map(t => t.symbol)
        ));
        
        const symbolsToFetch = Array.from(new Set([...activeSymbols, ...allHistoricalSymbols]));

        let liveMeta: Record<string, any> = {};

        try {
            const realAssets = symbolsToFetch.filter(s => 
                !s.startsWith('CASH:') && 
                !s.toLowerCase().includes('liquidités') && 
                !s.toLowerCase().includes('espèces')
            );
            console.log(`[MASTER] Fetching metadata and quotes for ${realAssets.length} assets...`);
            liveMeta = await getAssetsMetadata(realAssets);

            // FALLBACK: Use XML name (description) if Yahoo name is missing
            const fallbackNames: Record<string, string> = {};
            master.transactions.forEach(t => {
                if (t.symbol && t.description && t.description !== t.symbol) {
                    fallbackNames[t.symbol] = t.description;
                }
            });

            Object.entries(liveMeta).forEach(([sym, meta]) => {
                if (meta.currentPrice > 0) {
                    currentPrices[sym] = meta.currentPrice;
                }
            });

            // Ensure every symbol has at least a fallback name in metadata
            symbolsToFetch.forEach(sym => {
                if (!liveMeta[sym]) {
                    liveMeta[sym] = { 
                        symbol: sym, 
                        name: fallbackNames[sym] || sym,
                        sector: 'Autre',
                        industry: 'Autre',
                        currentPrice: 0,
                        marketCap: 0
                    };
                } else if (!liveMeta[sym].name || liveMeta[sym].name === sym) {
                    if (fallbackNames[sym]) liveMeta[sym].name = fallbackNames[sym];
                }
            });
        } catch (e) {
            console.warn("[MASTER] Live price fetch failed.", e);
        }

        // FAILOVER: If Live Price is missing (fetch failed), use Preserved Price from previous snapshot
        // This prevents assets from dropping to 0€/-100% during network issues.
        activeSymbols.forEach(sym => {
            if (!currentPrices[sym] && master.assets && master.assets[sym] && master.assets[sym].nativePrice > 0) {
                currentPrices[sym] = master.assets[sym].nativePrice;
                console.log(`[MASTER] Using preserved price for ${sym}: ${currentPrices[sym]}`);
            }
        });

        // 3. Run Finance Engine
        const preparedTxs = allTransactions.map(t => ({
            ...t,
            date: new Date(t.date)
        }));

        // Pass calculated currentPrices as fallbacks
        const results = await calculatePerformance(
            preparedTxs as any,
            currentPrices,
            liveMeta, // Pass the fetched metadata
            {}  // manualCostBasis (optional)
        );

        // 4. Transform Engine Results to Master Schema
        const currentFx = liveMeta['EURUSD=X']?.currentPrice || 1.08;
        const dailyMetrics = results.metrics.map(m => ({
            ...m,
            fxRate: currentFx
        }));
        const assetsSnapshot: Record<string, AssetSnapshot> = {};

        results.currentHoldings.forEach(h => {
            if (Math.abs(h.quantity) < 0.000001 && !h.symbol?.startsWith('CASH')) return;

            assetsSnapshot[h.name] = {
                symbol: h.symbol || h.name,
                quantity: h.quantity,
                value: h.value,
                costBasisEur: (h.pruEur || 0) * h.quantity,
                nativePrice: h.nativePrice || 0,
                nativeCurrency: h.nativeCurrency || 'EUR',
                pruEur: h.pruEur || 0,
                pruNative: h.pru || 0,
                pnl: h.pnl || 0,
                pnlNative: h.pnlNative || 0,
                performance: h.performance || 0,
                cagr: h.cagr || 0,
                firstBuyDate: h.firstBuyDate,
                sources: h.symbol?.startsWith('CASH:') ? [h.symbol.split(':')[1]] : []
            };
        });

        // Populate Sources for Assets (non-cash)
        preparedTxs.forEach(t => {
            if (t.symbol && t.symbol !== 'CASH' && assetsSnapshot[t.symbol]) {
                if (!assetsSnapshot[t.symbol].sources.includes(t.source)) {
                    assetsSnapshot[t.symbol].sources.push(t.source);
                }
            }
        });

        // 5. Save Back to Master
        MasterStore.updateComputedData(assetsSnapshot, dailyMetrics, results.closedHoldings);
        console.log(`[MASTER] Re-computation complete. Saved ${dailyMetrics.length} days of history, ${Object.keys(assetsSnapshot).length} assets and ${results.closedHoldings.length} closed positions.`);

        return { 
            assets: assetsSnapshot, 
            metrics: dailyMetrics, 
            closedHoldings: results.closedHoldings,
            lastUpdated: new Date().toISOString() 
        };
    }
}
