import { getPortfolioData } from '../../../lib/finance/data-fetching';
import { MasterAnalyzer } from '../../../lib/finance/master-analyzer';
import nextDynamic from 'next/dynamic';

const PortfolioClient = nextDynamic(() => import('../../../components/PortfolioClient'), {
    ssr: false,
    loading: () => <div className="p-8 lg:p-12 space-y-6 animate-pulse">Chargement du portefeuille...</div>
});

export const dynamic = 'force-dynamic';

export default async function PortfolioPage() {
    // 1. Ensure data is recomputed (to get CAGR/Historical consistency)
    // We use livePrices: false by default to speed up load time. 
    await MasterAnalyzer.recomputeAndPersist({ useLivePrices: false });

    // 2. Fetch fresh data (Optimized: only load history for benchmark tickers, not every active asset)
    const data = await getPortfolioData({ includeHistory: true, onlyBenchmarkHistory: true });

    if (!data) return <div className="p-10 text-red-500">Error loading data.</div>;

    return (
        <PortfolioClient
            currentHoldings={data.currentHoldings}
            assetMetadata={data.assetMetadata}
            dividends={data.dividends}
            metrics={data.metrics}
            benchmarks={data.benchmarks || {}}
            closedHoldings={data.closedHoldings || []}
        />
    );
}
