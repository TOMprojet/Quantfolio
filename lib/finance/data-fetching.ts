import { getAssetDisplayName } from '../core/format-utils';
import { getHistoricalPrices, getAssetsMetadata, BENCHMARK_TICKERS } from './market-data-service';
import { MasterStore } from '../core/persistence/master-store';
import { SettingsStore } from '../core/persistence/settings-store';
import { subDays, parseISO } from 'date-fns';
import { classifyAsset } from './classifier';

export async function getPortfolioData(options: { 
    includeHistory?: boolean, 
    includeWatchlistHistory?: boolean,
    includeWatchlistMetadata?: boolean,
    onlyBenchmarkHistory?: boolean
} = { includeHistory: true, includeWatchlistHistory: false, includeWatchlistMetadata: false, onlyBenchmarkHistory: false }) {

    // 1. Load Master Data (The Single Source of Truth)
    const master = MasterStore.load();
    const { assets, metrics, transactions } = master;

    // 2. Extract Key Lists
    const currentHoldingsList = Object.values(assets) as any[];
    const uniqueSymbols = currentHoldingsList.map((a: any) => a.symbol);
    uniqueSymbols.push('EURUSD=X');

    // 3. Fetch Static Metadata (Sectors, Logos, Long Names)
    // 7. Fetch Benchmarks & Watchlist History
    const benchmarkSymbols = ['CW8.PA', 'PSP5.PA', 'PUST.PA'];
    const settings = SettingsStore.load();
    const watchlistTickers = settings.watchlist || [];

    const symbolsForHistory = options.onlyBenchmarkHistory
        ? benchmarkSymbols
        : (options.includeWatchlistHistory 
            ? [...benchmarkSymbols, ...watchlistTickers, ...uniqueSymbols]
            : [...benchmarkSymbols, ...uniqueSymbols]);
    const allHistorySymbols = Array.from(new Set(symbolsForHistory));

    const startDate = subDays(new Date(), 365 * 5 + 10); // 5 Years + buffer
    const endDate = new Date();

    const [assetMetadata, assetsHistoryMap, watchlistMeta] = await Promise.all([
        getAssetsMetadata(uniqueSymbols, { fast: true }),
        options.includeHistory 
            ? getHistoricalPrices(allHistorySymbols, startDate, endDate)
            : Promise.resolve({} as Record<string, any[]>),
        options.includeWatchlistMetadata
            ? getAssetsMetadata(watchlistTickers, { fast: true })
            : Promise.resolve({} as Record<string, any>)
    ]);

    Object.assign(assetMetadata, watchlistMeta);

    const assetsHistory = assetsHistoryMap;

    // 4. Pass full metrics to Client for perfect dynamic TWR calculation
    // Downsampling would destroy daily transaction flows needed for exact math.
    const formattedMetrics = metrics.map((m: any) => ({
        date: m.date,
        totalValue: m.totalValue,
        investedCapital: m.investedCapital,
        cashBalance: m.cashBalance,
        twr: m.twr,
        twrCrypto: m.twrCrypto,
        twrStocks: m.twrStocks,
        unrealizedPnl: m.unrealizedPnl,
        assetValues: m.assetValues || {},
        assetFlows: m.assetFlows || {},
        roi: m.investedCapital > 0
            ? ((m.totalValue - m.investedCapital) / m.investedCapital) * 100
            : 0
    }));

    // 5. Encapsulate Holdings
    const currentHoldings = currentHoldingsList.map((h: any) => {
        const meta = assetMetadata[h.symbol] || {};

        // Performance calculation
        const costEur = h.costBasisEur || 0;
        const valEur = h.value || 0;
        const perfEur = costEur > 0 ? ((valEur - costEur) / costEur) * 100 : 0;

        const quantity = h.quantity || 0;
        const pruNative = h.pruNative || 0;
        const priceNative = h.nativePrice || 0;

        const assetClass = classifyAsset(h.symbol, meta.name, meta.sector, h.nativeCurrency);
        const { isCrypto, isEurStock, isEtf, displayCurrency } = assetClass;

        // ROI calculation: NATIVE for isolation, EUR for total context
        const nativeROI = (isCrypto || isEurStock)
            ? perfEur
            : (pruNative > 0 ? ((priceNative - pruNative) / pruNative) * 100 : 0);

        // If it's crypto/EUR stock, we use EUR values as display "native"
        const pnlNative = h.pnlNative ?? (isCrypto ? (valEur - costEur) : (quantity > 0 ? (priceNative - pruNative) * quantity : 0));
        const displayPru = (isCrypto || isEurStock) ? h.pruEur : pruNative;
        const displayPrice = (isCrypto || isEurStock) ? (quantity > 0 ? valEur / quantity : (isEurStock ? priceNative : priceNative)) : priceNative;

        // Clean name using centralized helper
        const displayName = getAssetDisplayName(h.symbol, meta, isCrypto);

        return {
            name: h.symbol.startsWith('CASH:') ? `Liquidités (${h.symbol.split(':')[1]})` : displayName,
            symbol: h.symbol,
            value: valEur,
            quantity: quantity,
            pru: displayPru,
            pruEur: h.pruEur || 0,
            currentPrice: displayPrice,
            nativePrice: displayPrice,
            performance: h.performance || nativeROI,
            cagr: h.cagr || 0,
            currency: displayCurrency,
            nativeCurrency: h.nativeCurrency || (isEurStock ? 'EUR' : 'USD'),
            isCrypto,
            isEurStock,
            isEtf,
            sources: h.sources || [],
            sector: h.symbol.startsWith('CASH:') ? 'Liquidités' : (meta.sector || (isEtf ? 'ETF' : (isCrypto ? 'Crypto' : (isEurStock ? 'Technologie' : 'Other')))),
            pnl: valEur - costEur,
            pnlNative: pnlNative
        };
    });

    // 6. Extract Dividends (Net of tax)
    const dividends = transactions
        .filter((t: any) => (t.type === 'DIVIDEND' || (t.type === 'TAX' && t.symbol !== 'CASH')))
        .map((t: any) => ({
            date: t.date instanceof Date ? t.date.toISOString() : t.date,
            amount: t.amount,
            symbol: t.symbol || 'Unknown'
        }));

    const userFairPrices = settings.fairPrices || {};

    return {
        metrics: formattedMetrics,
        currentHoldings,
        dividends,
        assetMetadata,
        benchmarks: assetsHistory, // Passing full history map, UI extracts what it needs
        watchlistTickers,
        assetsHistory,
        userFairPrices,
        closedHoldings: master.closedHoldings || []
    };
}
