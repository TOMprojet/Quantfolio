import { getPortfolioData } from '../../../lib/finance/data-fetching';
import { MasterAnalyzer } from '../../../lib/finance/master-analyzer';
import nextDynamic from 'next/dynamic';

const Overview = nextDynamic(() => import('../../../components/Overview'), {
    ssr: false,
    loading: () => <div className="p-8 lg:p-12 space-y-6 animate-pulse">Chargement du tableau de bord...</div>
});

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    // 1. Ensure data is recomputed (to get CAGR/Historical consistency)
    // We use livePrices: false by default to speed up load time. 
    await MasterAnalyzer.recomputeAndPersist({ useLivePrices: false });

    // 2. Fetch fresh data (Optimized for Dashboard: no need for full history)
    const data = await getPortfolioData({ includeHistory: false });

    if (!data) {
        return <div className="p-10 text-red-500">Error loading data.</div>;
    }

    return (
        <Overview
            metrics={data.metrics}
            currentHoldings={data.currentHoldings}
            dividends={data.dividends}
            assetMetadata={data.assetMetadata}
        />
    );
}
