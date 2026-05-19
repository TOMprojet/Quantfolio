'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Info, PieChart, BarChart3, Wallet, ChevronDown, Check } from 'lucide-react';
import Link from 'next/link';
import MissingBasisModal from './MissingBasisModal';
import AllocationSection from './dashboard/AllocationSection';
import AssetTable from './portfolio/AssetTable';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';

const PerformanceChart = dynamic(() => import('./portfolio/PerformanceChart'), {
    ssr: false,
    loading: () => <div className="h-[350px] flex items-center justify-center bg-foreground/[0.02] border border-foreground/5 rounded-[2rem] animate-pulse">Chargement du graphique...</div>
});
import PortfolioScorecard from './portfolio/PortfolioScorecard';
import PageHeader from './ui/PageHeader';
import ClosedPositionsTable from './portfolio/ClosedPositionsTable';
import { getAssetLogoUrl } from '../lib/core/format-utils';

interface PortfolioClientProps {
    currentHoldings: any[];
    assetMetadata: Record<string, any>;
    missingAssets?: { symbol: string, quantity: number, isStablecoin: boolean }[];
    dividends: any[];
    metrics: any[];
    benchmarks?: Record<string, any[]>; // Made optional for backward compatibility
    closedHoldings?: any[]; // NEW
}

export default function PortfolioClient({ currentHoldings, assetMetadata, missingAssets = [], dividends = [], metrics = [], benchmarks = {}, closedHoldings = [] }: PortfolioClientProps) {
    // ASSET FILTER STATE
    const [selectedAssets, setSelectedAssets] = useState<Set<string>>(() => {
        const set = new Set(currentHoldings.map(h => h.symbol));
        closedHoldings?.forEach(h => set.add(h.symbol));
        return set;
    });
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Sync state if currentHoldings changes (useful on initial hydration or updates)
    useEffect(() => {
        if (currentHoldings.length > 0 && selectedAssets.size === 0) {
            const set = new Set(currentHoldings.map(h => h.symbol));
            closedHoldings?.forEach(h => set.add(h.symbol));
            setSelectedAssets(set);
        }
    }, [currentHoldings, closedHoldings]);

    // Filter Logic
    const filteredHoldings = useMemo(() => {
        return currentHoldings.filter(h => selectedAssets.has(h.symbol));
    }, [currentHoldings, selectedAssets]);

    // Re-Calculate Chart Data based on Filter
    const assetsHistory = benchmarks;

    const chartData = useMemo(() => {
        const allHoldingsCount = currentHoldings.length + (closedHoldings?.length || 0);
        if (selectedAssets.size === allHoldingsCount && selectedAssets.size > 0) return metrics;

        // Dynamic TWR using exact historical transactions (via engine metrics)
        const finalHistory: { date: number, totalValue: number, twr: number }[] = [];
        let cumTwr = 1;
        
        metrics.forEach((m, i) => {
            let dayValue = 0;
            let prevDayValue = 0;
            let dayFlows = 0;
            
            const prevM = i > 0 ? metrics[i - 1] : null;

            selectedAssets.forEach(sym => {
                if (sym.startsWith('CASH:')) return; // Ignore any cash symbols if they slip in

                const vToday = m.assetValues?.[sym] || 0;
                const vPrev = prevM?.assetValues?.[sym] || 0;
                const fToday = m.assetFlows?.[sym] || 0;

                dayValue += vToday;
                prevDayValue += vPrev;
                dayFlows += fToday;
            });

            // Chain-link
            const adjustedStart = prevDayValue + dayFlows;
            let dailyReturn = 0;
            
            if (adjustedStart > 1) {
                dailyReturn = (dayValue - adjustedStart) / adjustedStart;
                if (dailyReturn > -0.9 && dailyReturn < 10) {
                    cumTwr *= (1 + dailyReturn);
                }
            }

            finalHistory.push({
                date: new Date(m.date).getTime(),
                totalValue: dayValue,
                twr: (cumTwr - 1) * 100
            });
        });

        return finalHistory;

    }, [selectedAssets, currentHoldings, closedHoldings, metrics]);
    const portfolioHealth = useMemo(() => {
        if (!filteredHoldings.length) return {
            scores: { global: 0, performance: 0, diversification: 0, dividend: 0, quality: 0, correlation: 0 },
            details: { cagr: 0, pnlPct: 0, pctGreen: 0, maxDD: 0, hhi: 0, yieldPct: 0, divGrowth: 0, maxClusterWeight: 0, dominantCluster: 'N/A' },
            insights: []
        };

        const totalVal = filteredHoldings.reduce((sum, h) => sum + h.value, 0) || 1;

        // 1. PERFORMANCE 🚀
        const wCagr = filteredHoldings.reduce((sum, h) => sum + (h.cagr || 0) * (h.value / totalVal), 0);
        const totalPnl = filteredHoldings.reduce((sum, h) => sum + (h.pnl || 0), 0);
        const invested = totalVal - totalPnl;
        const pnlPct = invested !== 0 ? (totalPnl / invested) * 100 : 0;

        const assetsInGreen = filteredHoldings.filter(h => (h.pnl || 0) >= 0).length;
        const pctGreen = filteredHoldings.length > 0 ? (assetsInGreen / filteredHoldings.length) * 100 : 0;

        let ddScore = 100;
        let rawMaxDD = 0;
        if (chartData.length > 50) {
            const prices = chartData.map(m => m.totalValue);
            let peak = 0;
            prices.forEach(p => {
                if (p > peak) peak = p;
                const dd = (peak - p) / peak;
                if (dd > rawMaxDD) rawMaxDD = dd;
            });
            ddScore = Math.min(100, Math.max(0, (1 - (rawMaxDD - 0.1) * 5) * 100));
        }

        const scorePerf = Math.min(100, Math.max(0,
            (wCagr / 15) * 30 +
            (pnlPct / 20) * 30 +
            pctGreen * 0.2 +
            ddScore * 0.2
        ));

        // 2. DIVERSIFICATION 🛡️
        const sectorMap: Record<string, number> = {};
        filteredHoldings.forEach(h => {
            const sector = h.sector || (h.isCrypto ? 'Crypto' : 'Autre');
            sectorMap[sector] = (sectorMap[sector] || 0) + h.value;
        });
        const weights = Object.values(sectorMap).map(v => v / totalVal);
        const hhi = weights.reduce((sum, w) => sum + w * w, 0);
        const scoreDiv = Math.min(100, Math.max(0, (1 - (hhi - 0.15) * 2.85) * 100));

        // 3. DIVIDENDS 💵
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

        const validSymbols = new Set(filteredHoldings.map(h => h.symbol));
        const filteredDividends = dividends.filter(d => validSymbols.has(d.symbol));

        const ltmDivs = filteredDividends
            .filter(d => new Date(d.date) >= oneYearAgo)
            .reduce((sum, d) => sum + d.amount, 0);

        const priorLtmDivs = filteredDividends
            .filter(d => {
                const dt = new Date(d.date);
                return dt >= twoYearsAgo && dt < oneYearAgo;
            })
            .reduce((sum, d) => sum + d.amount, 0);

        const yieldPct = (ltmDivs / totalVal) * 100;
        const yieldScore = Math.min(100, (yieldPct / 3) * 100);

        let growthScore = 50;
        let divGrowthRate = 0;
        if (priorLtmDivs > 0) {
            divGrowthRate = (ltmDivs - priorLtmDivs) / priorLtmDivs;
            growthScore = Math.min(100, Math.max(0, 50 + (divGrowthRate * 500)));
        } else if (ltmDivs > 0) {
            growthScore = 100;
            divGrowthRate = 1;
        } else {
            growthScore = 0;
        }

        const finalDivScore = (yieldScore * 0.7) + (growthScore * 0.3);

        // 4. CORRELATION 🔗
        const clusterMap: Record<string, number> = {};
        filteredHoldings.forEach(h => {
            let cluster = 'N/A';
            if (h.isCrypto) {
                cluster = 'Crypto Assets';
            } else {
                cluster = h.sector || 'Unclassified Equity';
            }
            clusterMap[cluster] = (clusterMap[cluster] || 0) + h.value;
        });

        const clusterWeights = Object.values(clusterMap).map(v => v / totalVal);
        const maxClusterWeight = clusterWeights.length > 0 ? Math.max(...clusterWeights) : 0;
        const scoreCorrelation = Math.min(100, Math.max(0, (1 - (maxClusterWeight - 0.30) * 2) * 100));

        // 5. QUALITY 🏆
        const weightedQuality = filteredHoldings.reduce((sum, h) => {
            let qScore = 50;
            const meta = assetMetadata[h.symbol] || {};

            if (meta.qualityScore !== undefined) {
                qScore = meta.qualityScore;
            } else {
                if (h.name === 'CASH') qScore = 100;
                else if (h.symbol === 'BTC') qScore = 80;
                else if (h.symbol === 'ETH') qScore = 75;
                else if (h.isCrypto) qScore = 40;
                else if (meta.marketCap > 100e9) qScore = 90;
                else if (meta.marketCap > 10e9) qScore = 75;
                else qScore = 60;
            }
            return sum + (qScore * (h.value / totalVal));
        }, 0);

        const scoreQuality = weightedQuality;

        // GLOBAL
        const global = Math.round((scorePerf + finalDivScore + scoreCorrelation + scoreDiv + scoreQuality) / 5);

        // INSIGHTS
        const insights = [];
        if (hhi > 0.4) insights.push("⚠️ Forte concentration sectorielle détectée.");
        if (pnlPct < 0) insights.push("📉 Performance globale négative sur la période.");
        if (maxClusterWeight > 0.5) insights.push(`🔗 Trop grande dépendance au cluster : ${(Object.entries(clusterMap).find(([k, v]) => v / totalVal === maxClusterWeight)?.[0])}.`);

        return {
            scores: {
                global: global || 0,
                performance: Math.round(scorePerf) || 0,
                diversification: Math.round(scoreDiv) || 0,
                dividend: Math.round(finalDivScore) || 0,
                quality: Math.round(scoreQuality) || 0,
                correlation: Math.round(scoreCorrelation) || 0
            },
            details: {
                cagr: wCagr || 0,
                pnlPct: pnlPct || 0,
                pctGreen: pctGreen || 0,
                maxDD: rawMaxDD || 0,
                hhi: hhi || 0,
                yieldPct: yieldPct || 0,
                divGrowth: divGrowthRate || 0,
                maxClusterWeight: maxClusterWeight || 0,
                dominantCluster: Object.entries(clusterMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
            },
            insights
        };

    }, [currentHoldings, filteredHoldings, chartData, metrics, dividends, assetMetadata]);

    const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);

    useEffect(() => {
        if (missingAssets && missingAssets.length > 0) {
            setTimeout(() => setIsMissingModalOpen(true), 1000);
        }
    }, [missingAssets]);

    const handleSaveMissingBasis = async (updates: Record<string, { date: string, price: number }>) => {
        try {
            await fetch('/api/manual-basis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert("Erreur lors de la sauvegarde.");
        }
    };

    const enhancedHoldings = useMemo(() => {
        return filteredHoldings.map(h => {
            let cleanTicker = h.symbol.replace('-USD', '').replace('EUR.USD', 'EUR');
            let fullName = h.name;
            const price = h.currentPrice || h.nativePrice || 0;
            const val = h.value || (h.quantity * price);

            return { ...h, name: fullName, cleanTicker, currentPrice: price, value: val };
        });
    }, [chartData, filteredHoldings]);

    const totalValue = filteredHoldings.reduce((acc, h) => acc + h.value, 0);
    const latestMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null;
    const cashBalance = latestMetric ? (latestMetric.cash || latestMetric.cashBalance || 0) : 0;



    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar bg-background text-foreground font-sans selection:bg-emerald-500/30">
            <div className="p-4 sm:p-8 lg:p-10 2xl:p-14 3xl:p-20 space-y-8 sm:space-y-12">
                <PageHeader
                    title="Portefeuille"
                    subtitle="Analyse détaillée de vos actifs."
                    icon={Wallet}
                    rightContent={
                        <div className="relative z-50 shrink-0">
                            <button
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-surface/50 border border-foreground/10 hover:border-primary/40 hover:bg-surface/80 transition-all shadow-xl min-w-[220px]"
                            >
                                <div className="flex flex-col text-left">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Filtre Actifs</span>
                                    <span className="text-xs font-bold text-foreground">
                                        {(() => {
                                            const filterableCount = currentHoldings.filter(h => !h.symbol.startsWith('CASH:')).length + (closedHoldings?.length || 0);
                                            return selectedAssets.size >= filterableCount ? 'Tous les actifs' : `${selectedAssets.size} / ${filterableCount} actifs`;
                                        })()}
                                    </span>
                                </div>
                                <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180 text-primary' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {isDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            transition={{ duration: 0.2, ease: "easeOut" }}
                                            className="absolute right-0 top-full mt-3 w-80 bg-surface/95 backdrop-blur-2xl border border-foreground/10 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
                                        >
                                            <div className="flex items-center justify-between p-3 border-b border-foreground/10 bg-foreground/[0.02]">
                                                <button
                                                    onClick={() => {
                                                        const set = new Set(currentHoldings.filter(h => !h.symbol.startsWith('CASH:')).map(h => h.symbol));
                                                        closedHoldings?.forEach(h => set.add(h.symbol));
                                                        setSelectedAssets(set);
                                                    }}
                                                    className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-md hover:bg-primary/10"
                                                >
                                                    Tout cocher
                                                </button>
                                                <button
                                                    onClick={() => setSelectedAssets(new Set())}
                                                    className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-white/5"
                                                >
                                                    Tout décocher
                                                </button>
                                            </div>

                                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                                                {(() => {
                                                    const nonCashHoldings = currentHoldings.filter(h => !h.symbol.startsWith('CASH:'));

                                                    return (
                                                        <>
                                                            {nonCashHoldings.map(h => {
                                                                const isSelected = selectedAssets.has(h.symbol);
                                                                const meta = assetMetadata[h.symbol] || {};
                                                                const name = meta.name || h.symbol;
                                                                const isCrypto = h.isCrypto || meta.sector === 'Crypto' || h.symbol.endsWith('-USD');
                                                                
                                                                let logoUrl = getAssetLogoUrl(h.symbol, name, meta.website);
                                                                if (isCrypto && !logoUrl) {
                                                                    const cleanSym = h.symbol.toLowerCase().replace('-usd','').replace('usdt','usdt');
                                                                    logoUrl = cleanSym === 'btc' ? 'https://assets.coincap.io/assets/icons/btc@2x.png' : `https://assets.coincap.io/assets/icons/${cleanSym}@2x.png`;
                                                                }

                                                                return (
                                                                    <button
                                                                        key={h.symbol}
                                                                        onClick={() => {
                                                                            const newSet = new Set(selectedAssets);
                                                                            if (isSelected) newSet.delete(h.symbol);
                                                                            else newSet.add(h.symbol);
                                                                            setSelectedAssets(newSet);
                                                                        }}
                                                                        className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 group ${isSelected ? 'bg-primary/10 border border-primary/20' : 'hover:bg-foreground/5 border border-transparent'}`}
                                                                    >
                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                                                                {logoUrl ? (
                                                                                    <img src={logoUrl} alt={h.symbol} className="w-full h-full object-contain p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                                                ) : (
                                                                                    <span className="text-[10px] font-bold text-slate-500">{h.symbol.substring(0,2)}</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex flex-col text-left min-w-0">
                                                                                <span className={`text-sm font-bold truncate transition-colors ${isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary/70'}`}>{h.symbol}</span>
                                                                                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest truncate">{name}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className={`w-5 h-5 rounded-[6px] border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-primary border-primary text-white shadow-[0_0_10px_rgba(139,92,246,0.3)]' : 'border-slate-600 group-hover:border-slate-400'}`}>
                                                                            {isSelected && <Check size={14} strokeWidth={3} />}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}

                                                            {closedHoldings && closedHoldings.length > 0 && (
                                                                <>
                                                                    <div className="pt-2 pb-1 px-3 mt-2 border-t border-white/5">
                                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Positions Clôturées</span>
                                                                    </div>
                                                                    {closedHoldings.map(h => {
                                                                        const isSelected = selectedAssets.has(h.symbol);
                                                                        const meta = assetMetadata[h.symbol] || {};
                                                                        const name = meta.name || h.name || h.symbol;
                                                                        const isCrypto = h.isCrypto || meta.sector === 'Crypto' || h.symbol.endsWith('-USD');
                                                                        
                                                                        let logoUrl = getAssetLogoUrl(h.symbol, name, meta.website);
                                                                        if (isCrypto && !logoUrl) {
                                                                            const cleanSym = h.symbol.toLowerCase().replace('-usd','').replace('usdt','usdt');
                                                                            logoUrl = cleanSym === 'btc' ? 'https://assets.coincap.io/assets/icons/btc@2x.png' : `https://assets.coincap.io/assets/icons/${cleanSym}@2x.png`;
                                                                        }

                                                                        return (
                                                                            <button
                                                                                key={h.symbol}
                                                                                onClick={() => {
                                                                                    const newSet = new Set(selectedAssets);
                                                                                    if (isSelected) newSet.delete(h.symbol);
                                                                                    else newSet.add(h.symbol);
                                                                                    setSelectedAssets(newSet);
                                                                                }}
                                                                                className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-200 group ${isSelected ? 'bg-primary/10 border border-primary/20 opacity-80' : 'hover:bg-foreground/5 border border-transparent opacity-50 hover:opacity-100'}`}
                                                                            >
                                                                                <div className="flex items-center gap-3 min-w-0 grayscale">
                                                                                    <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                                                                        {logoUrl ? (
                                                                                            <img src={logoUrl} alt={h.symbol} className="w-full h-full object-contain p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                                                        ) : (
                                                                                            <span className="text-[10px] font-bold text-slate-500">{h.symbol.substring(0,2)}</span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex flex-col text-left min-w-0">
                                                                                        <span className={`text-sm font-bold truncate transition-colors ${isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary/70'} line-through decoration-white/20`}>{h.symbol}</span>
                                                                                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-widest truncate">{name}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className={`w-5 h-5 rounded-[6px] border flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-primary border-primary text-white shadow-[0_0_10px_rgba(139,92,246,0.3)]' : 'border-slate-600 group-hover:border-slate-400'}`}>
                                                                                    {isSelected && <Check size={14} strokeWidth={3} />}
                                                                                </div>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    }
                />

                {/* DETAILED ANALYSIS GRID */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                    {/* PERFORMANCE CHART */}
                    <div className="xl:col-span-8 h-full min-h-[350px] sm:min-h-[450px]">
                        <PerformanceChart metrics={chartData} benchmarks={benchmarks} />
                    </div>

                    {/* ALLOCATION SECTION (Uses Enhanced Holdings with Correct Names) */}
                    <div className="xl:col-span-4 h-full min-h-[350px] sm:min-h-[450px]">
                        <AllocationSection
                            currentHoldings={enhancedHoldings}
                            cashBalance={cashBalance}
                            totalValue={totalValue}
                            mode="portfolio"
                        />
                    </div>
                </div>

                {/* ASSETS LIST - REFACTORED */}
                <AssetTable assets={enhancedHoldings} />
                {/* SCORECARD SECTION */}
                <div className="mt-8">
                    <PortfolioScorecard scores={portfolioHealth.scores} scoreDetails={portfolioHealth.details} insights={portfolioHealth.insights} />
                </div>

                {/* CLOSED POSITIONS SECTION */}
                <div className="mt-8">
                    <ClosedPositionsTable positions={closedHoldings} />
                </div>

                {/* MISSING INFO MODAL */}
                <MissingBasisModal
                    isOpen={isMissingModalOpen}
                    onClose={() => setIsMissingModalOpen(false)}
                    missingAssets={missingAssets}
                    onSave={handleSaveMissingBasis}
                />
            </div>
        </div>
    );
}

// Helper for glass effect
const glassStyle = {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
};
