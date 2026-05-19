import { getPortfolioData } from '../../../lib/finance/data-fetching';
import nextDynamic from 'next/dynamic';

const Watchlist = nextDynamic(() => import('../../../components/Watchlist'), {
    ssr: false,
    loading: () => <div className="p-8 lg:p-12 space-y-6 animate-pulse">Chargement de la watchlist...</div>
});

export const dynamic = 'force-dynamic';

export default async function WatchlistPage() {
    const data = await getPortfolioData({ 
        includeHistory: true, 
        includeWatchlistHistory: true,
        includeWatchlistMetadata: true 
    });

    if (!data) return <div className="p-10 text-red-500">Error loading data.</div>;

    // Use persisted data from backend
    const userFairPrices = (data as any).userFairPrices || {};

    return (
        <Watchlist
            currentHoldings={data.currentHoldings}
            watchlistTickers={data.watchlistTickers}
            assetsHistory={data.assetsHistory}
            globalChartData={[]} // Fallback not really used
            assetMetadata={data.assetMetadata}
            userFairPrices={userFairPrices}
        />
    );
}
