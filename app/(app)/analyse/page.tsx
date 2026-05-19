import { SettingsStore } from '@/lib/core/persistence/settings-store';
import { getPortfolioData } from '@/lib/finance/data-fetching';
import { MasterAnalyzer } from '@/lib/finance/master-analyzer';
import nextDynamic from 'next/dynamic';

const AnalyseClient = nextDynamic(() => import('@/components/AnalyseClient'), {
    ssr: false,
    loading: () => <div className="p-8 lg:p-12 space-y-6 animate-pulse">Chargement de l'outil d'analyse...</div>
});

export const dynamic = 'force-dynamic';

export default async function AnalysePage() {
    await MasterAnalyzer.recomputeAndPersist({ useLivePrices: false });
    const data = await getPortfolioData();
    const settings = SettingsStore.load();

    return (
        <AnalyseClient 
            initialWatchlist={settings.watchlist || []} 
            portfolioHoldings={data?.currentHoldings || []}
            portfolioMetadata={data?.assetMetadata || {}}
        />
    );
}
