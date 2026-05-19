'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { LayoutDashboard } from 'lucide-react';
import KpiGrid from './dashboard/KpiGrid';
import dynamic from 'next/dynamic';
import PageHeader from './ui/PageHeader';
import { format, parseISO, subMonths, subYears, isAfter } from 'date-fns';
import AllocationSection from './dashboard/AllocationSection';
import PerformersSection from './dashboard/PerformersSection';
import DividendCalendar from './dashboard/DividendCalendar';

const CapitalEvolutionChart = dynamic(() => import('./dashboard/CapitalEvolutionChart'), {
    ssr: false,
    loading: () => <div className="h-[400px] flex items-center justify-center bg-foreground/[0.02] border border-foreground/5 rounded-[2rem] animate-pulse">Chargement du graphique...</div>
});

const DividendHistoryChart = dynamic(() => import('./dashboard/DividendHistoryChart'), {
    ssr: false,
    loading: () => <div className="h-[350px] flex items-center justify-center bg-foreground/[0.02] border border-foreground/5 rounded-[2rem] animate-pulse">Chargement de l'historique des dividendes...</div>
});

interface OverviewProps {
    metrics: any[];
    currentHoldings: any[];
    dividends: any[];
    assetMetadata: Record<string, any>;
}

export default function Overview({ metrics, currentHoldings, dividends, assetMetadata }: OverviewProps) {
    const [timeframe, setTimeframe] = useState<'1M' | '3M' | '1Y' | 'YTD' | 'ALL'>('ALL');
    
    // Filter metrics based on timeframe for global consistency
    const filteredMetrics = useMemo(() => {
        if (!metrics.length || timeframe === 'ALL') return metrics;
        
        const lastMetricDate = new Date(metrics[metrics.length - 1].date);
        let startLimit = new Date(0);

        if (timeframe === '1M') startLimit = subMonths(lastMetricDate, 1);
        else if (timeframe === '3M') startLimit = subMonths(lastMetricDate, 3);
        else if (timeframe === '1Y') startLimit = subYears(lastMetricDate, 1);
        else if (timeframe === 'YTD') startLimit = new Date(`${lastMetricDate.getFullYear()}-01-01`);

        return metrics.filter(m => new Date(m.date) >= startLimit);
    }, [metrics, timeframe]);

    const latestMetric = metrics[metrics.length - 1] || { totalValue: 0, cashBalance: 0, investedCapital: 0, roi: 0 };
    
    // Calculate performance for the selected period
    const periodStats = useMemo(() => {
        if (filteredMetrics.length < 2) return { roi: latestMetric.roi, pnl: latestMetric.totalValue - latestMetric.investedCapital };
        
        const first = filteredMetrics[0];
        const last = filteredMetrics[filteredMetrics.length - 1];

        if (timeframe === 'ALL') {
            const pnl = last.totalValue - last.investedCapital;
            const roi = last.investedCapital > 0 ? (pnl / last.investedCapital) * 100 : 0;
            return { roi, pnl };
        }

        // Find baseline (the day BEFORE the period starts) for accurate TWR
        const firstDate = new Date(first.date);
        const baselineMetric = [...metrics].reverse().find(m => new Date(m.date) < firstDate);
        
        const startTwr = baselineMetric ? (baselineMetric.twr || 0) / 100 : (first.twr || 0) / 100;
        const endTwr = (last.twr || 0) / 100;
        
        const roi = ((1 + endTwr) / (1 + startTwr) - 1) * 100;
        
        // PnL impact for the period (Value change - Capital flow)
        // If we have a baseline, we use it for a more accurate PnL start
        const startValue = baselineMetric ? baselineMetric.totalValue : first.totalValue;
        const startInvested = baselineMetric ? baselineMetric.investedCapital : first.investedCapital;
        
        const pnl = (last.totalValue - startValue) - (last.investedCapital - startInvested);
        
        return { roi, pnl };
    }, [metrics, filteredMetrics, timeframe, latestMetric]);

    // Dividends for the period
    const filteredDividends = useMemo(() => {
        if (timeframe === 'ALL') return dividends;
        if (filteredMetrics.length === 0) return [];
        const startLimit = new Date(filteredMetrics[0].date);
        return dividends.filter(d => new Date(d.date) >= startLimit);
    }, [dividends, filteredMetrics, timeframe]);

    const cashBalance = latestMetric.cash || latestMetric.cashBalance || 0;
    const totalDividends = filteredDividends.reduce((sum, d) => sum + d.amount, 0);

    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar bg-background text-foreground">
            <div className="p-4 sm:p-8 lg:p-10 2xl:p-14 3xl:p-20 space-y-8 sm:space-y-12">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <PageHeader
                        title="Dashboard"
                        subtitle="Vue globale consolidée de votre performance financière."
                        icon={LayoutDashboard}
                    />
                    <div className="flex bg-foreground/5 p-1.5 rounded-xl border border-foreground/5 shrink-0">
                        {['1M', '3M', '1Y', 'YTD', 'ALL'].map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf as any)}
                                className={`px-4 py-1.5 rounded-xl text-[10px] font-bold tracking-widest transition-all duration-300 border ${timeframe === tf ? 'bg-primary/20 text-primary border-primary/30 shadow-glow shadow-primary/20 backdrop-blur-md' : 'border-transparent text-slate-500 hover:text-foreground hover:bg-foreground/5'}`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                {/* KPI GRID */}
                <KpiGrid 
                    metrics={metrics} 
                    totalDividends={totalDividends} 
                    periodRoi={periodStats.roi}
                    periodPnl={periodStats.pnl}
                    timeframe={timeframe}
                />

                {/* MAIN CONTENT GRID */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
                    {/* CAPITAL EVOLUTION (Left - 8 cols) */}
                    <div className="xl:col-span-8 h-full">
                        <CapitalEvolutionChart metrics={metrics} externalTimeframe={timeframe} />
                    </div>

                    {/* UNIFIED ALLOCATION (Right - 4 cols) */}
                    <div className="xl:col-span-4 h-full">
                        <AllocationSection
                            currentHoldings={currentHoldings}
                            cashBalance={cashBalance}
                            totalValue={latestMetric.totalValue}
                            mode="dashboard"
                        />
                    </div>
                </div>

                {/* PERFORMERS SECTION & TABLES */}
                <div className="space-y-12">
                    <PerformersSection currentHoldings={currentHoldings} assetMetadata={assetMetadata} />
                    
                    {/* DIVIDEND HISTORY & CALENDAR */}
                    <div className="space-y-8">
                        <DividendHistoryChart dividends={filteredDividends} assetMetadata={assetMetadata} />
                        <DividendCalendar currentHoldings={currentHoldings} assetMetadata={assetMetadata} />
                    </div>
                </div>
            </div>
        </div>
    );
}
