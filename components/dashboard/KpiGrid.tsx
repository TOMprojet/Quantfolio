'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Database, Wallet, TrendingUp, TrendingDown, DollarSign, Landmark } from 'lucide-react';

interface KpiGridProps {
    metrics: any[];
    totalDividends: number;
    periodRoi?: number;
    periodPnl?: number;
    timeframe?: string;
}

import { StatCard } from '../ui/StatCard';
import { useFormatting } from '@/hooks/useFormatting';

export default function KpiGrid({ metrics, totalDividends, periodRoi, periodPnl, timeframe = 'ALL' }: KpiGridProps) {
    const { formatCurrency } = useFormatting();
    const latestMetric = metrics[metrics.length - 1] || { totalValue: 0, twr: 0, cashBalance: 0, investedCapital: 0, roi: 0, unrealizedPnl: 0, fxRate: 1.08 };

    const pnl = periodPnl ?? (latestMetric.totalValue - latestMetric.investedCapital);
    const roi = periodRoi ?? latestMetric.roi;
    const fxRate = latestMetric.fxRate || 1.08;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            <StatCard
                title="Capital Investi"
                value={formatCurrency(latestMetric.investedCapital, { isTotal: true, fxRate })}
                icon={Landmark}
                color="blue"
                delay={0.1}
            />

            <StatCard
                title="Valeur Totale"
                value={formatCurrency(latestMetric.totalValue, { isTotal: true, fxRate })}
                subValue={pnl >= 0 ? `+${formatCurrency(pnl, { isTotal: true, fxRate })}` : formatCurrency(pnl, { isTotal: true, fxRate })}
                subValueColor={pnl >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}
                icon={Wallet}
                color="purple"
                delay={0.2}
            />

            <StatCard
                title={timeframe === 'ALL' ? "Performance Globale (ROI)" : `Perf. Période ROI (${timeframe})`}
                value={(roi > 0 ? '+' : '') + (roi || 0).toFixed(2) + '%'}
                icon={latestMetric.roi >= 0 ? TrendingUp : TrendingDown}
                color={latestMetric.roi >= 0 ? 'emerald' : 'rose'}
                useColorForValue={true}
                delay={0.3}
            />

            <StatCard
                title={timeframe === 'ALL' ? "Dividendes Totaux" : `Dividendes (${timeframe})`}
                value={formatCurrency(totalDividends, { isTotal: true, fxRate })}
                icon={DollarSign}
                color="indigo"
                delay={0.4}
            />
        </div>
    );
}
