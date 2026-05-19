'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Database, Calculator } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import dynamic from 'next/dynamic';

const ValuationModels = dynamic(() => import('../../../components/ValuationModels'), {
    ssr: false,
    loading: () => <div className="h-[60vh] flex items-center justify-center bg-foreground/[0.02] border border-foreground/5 rounded-[2rem] animate-pulse">Chargement des modèles de valorisation...</div>
});

interface Props {
    watchlistData: any[];
    assetMetadata: Record<string, any>;
    initialTicker: string;
    chartData: any[];
    watchlistTickers: string[];
    assetsHistory: Record<string, any[]>;
    userFairPrices: Record<string, number>;
}

export default function ValuationClient({
    watchlistData,
    assetMetadata,
    initialTicker,
    chartData,
    watchlistTickers,
    assetsHistory,
    userFairPrices: initialUserFairPrices
}: Props) {
    const router = useRouter();
    const [userFairPrices, setUserFairPrices] = useState<Record<string, number>>(initialUserFairPrices || {});

    const handleTickerChange = (ticker: string) => {
        // Use replace to avoid excessive history, or push for navigation? User preferred push.
        router.push(`/valuation?ticker=${ticker}`);
    };

    // 0. Filter out Crypto Assets & ETFs - Valuation is for Stocks only
    const filteredWatchlistData = watchlistData.filter(item => {
        const meta = assetMetadata[item.symbol] || {};
        const isCrypto = meta.sector === 'Crypto' || item.symbol.endsWith('-USD');
        const isEtf = item.symbol.includes('PSP5') || item.symbol.includes('CW8') || item.symbol.includes('PUST') || (meta.name || '').includes('ETF') || (meta.name || '').includes('Amundi');
        return !isCrypto && !isEtf;
    });

    // Merge user fair prices into watchlist data for display
    const mergedWatchlistData = filteredWatchlistData.map(item => {
        const userFair = userFairPrices[item.symbol];
        const fair = userFair !== undefined ? userFair : item.fairPrice;
        const current = assetMetadata[item.symbol]?.currentPrice || 0;
        const mos = current > 0 ? ((fair - current) / current) * 100 : 0;
        return { ...item, fairPrice: fair, mos };
    });

    const initialMeta = assetMetadata[initialTicker] || {};
    const initialIsCrypto = initialMeta.sector === 'Crypto' || initialTicker?.endsWith('-USD');
    const initialIsEtf = initialTicker?.includes('PSP5') || initialTicker?.includes('CW8') || initialTicker?.includes('PUST') || (initialMeta.name || '').includes('ETF') || (initialMeta.name || '').includes('Amundi');
    const isValuationEligible = initialTicker && !initialIsCrypto && !initialIsEtf;

    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar bg-background text-foreground">
            <div className="p-2 sm:p-4 lg:p-8 space-y-6 sm:space-y-8">
                <PageHeader
                    title="Valorisation"
                    subtitle="Modélisation et analyse de la valeur intrinsèque de vos actifs."
                    icon={Calculator}
                />

            {isValuationEligible ? (
                <ValuationModels
                    symbol={initialTicker}
                    metadata={assetMetadata}
                    chartData={chartData}
                    watchlistData={mergedWatchlistData}
                    userFairPrices={userFairPrices}
                    onUpdateFairPrice={(symbol, price) => setUserFairPrices(prev => ({ ...prev, [symbol]: price }))}
                    onTickerChange={handleTickerChange}
                />
            ) : (
                <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 bg-foreground/[0.02] rounded-[2rem] border border-foreground/5 backdrop-blur-sm">
                    <Database size={48} className="mb-4 opacity-50" />
                    <p className="font-medium">Sélectionnez une action ou un ETF pour voir sa valorisation</p>
                </div>
            )}
        </div>
    </div>
);
}
