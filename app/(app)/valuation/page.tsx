import { getPortfolioData } from '../../../lib/finance/data-fetching';
import { getHistoricalPrices } from '../../../lib/finance/market-data-service';
import ValuationClient from './ValuationClient';
import { FAIR_PRICES } from '../../../lib/core/constants';
import { subDays } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function ValuationPage({
    searchParams,
}: {
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const data = await getPortfolioData({ includeHistory: false, includeWatchlistMetadata: true });
    if (!data) return <div className="p-10 text-red-500">Error loading data.</div>;

    const tickerParam = searchParams?.ticker;
    const defaultTicker = data.watchlistTickers.length > 0 ? data.watchlistTickers[0] : '';
    const selectedTicker = Array.isArray(tickerParam) ? tickerParam[0] : (tickerParam || defaultTicker);

    // Prepare Charts Data for Selected Ticker
    // Prepare Charts Data for Selected Ticker - MANUAL FETCH
    // Optimization: Only fetch history for the ONE selected ticker
    let chartData: any[] = [];
    if (selectedTicker) {
        const endDate = new Date();
        const startDate = subDays(endDate, 365 * 5 + 10);
        const historyMap = await getHistoricalPrices([selectedTicker], startDate, endDate);
        chartData = historyMap[selectedTicker] || [];
    }

    // Prepare Watchlist Data for Sidebar
    // Cast strict to avoid TS Union errors with empty object
    const metaMap = data.assetMetadata as Record<string, any>;
    const watchlistData = data.watchlistTickers.map(t => {
        const meta = metaMap[t] || {};
        const current = meta.currentPrice || 0;
        // Fair prices will be handled in Client Component or default to 0/constants
        const userFairPrices = (data as any).userFairPrices || {};
        const fairFromConst = userFairPrices[t] ?? FAIR_PRICES[t] ?? 0;

        return {
            symbol: t,
            name: meta.name || t,
            mos: 0, // Calculated client side if needed or here
            fairPrice: fairFromConst
        };
    });

    return (
        <ValuationClient
            watchlistData={watchlistData}
            assetMetadata={metaMap}
            initialTicker={selectedTicker}
            chartData={chartData}
            watchlistTickers={data.watchlistTickers}
            assetsHistory={data.assetsHistory}
            userFairPrices={(data as any).userFairPrices}
        />
    );
}
