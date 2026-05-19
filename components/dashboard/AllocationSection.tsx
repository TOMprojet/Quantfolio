'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart as PieIcon } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';
import { useFormatting } from '@/hooks/useFormatting';

interface AllocationSectionProps {
    currentHoldings: any[];
    cashBalance: number;
    totalValue: number;
    mode?: 'dashboard' | 'portfolio'; // New prop
}

const SECTOR_TRANSLATIONS: Record<string, string> = {
    'Technology': 'Technologie',
    'Health': 'Santé',
    'Healthcare': 'Santé',
    'Health Care': 'Santé',
    'Finance': 'Finance',
    'Financial Services': 'Finance',
    'Consumer Cyclical': 'Conso. Cyclique',
    'Consumer Defensive': 'Conso. Base',
    'Consumer': 'Consommation',
    'Communication Services': 'Communication',
    'Utilities': 'Services Publics',
    'Energy': 'Énergie',
    'Industrials': 'Industrie',
    'Real Estate': 'Immobilier',
    'Basic Materials': 'Matériaux',
    'Information Technology': 'Technologie'
};

const COLORS: Record<string, string> = {
    // Platforms
    'Interactive Brokers': '#f472b6',
    'Portfolio Performance': '#2dd4bf', // Re-added
    'PEA': '#34d399',
    'Bitget': '#22d3ee',
    'Ledger': '#fbbf24',

    // Classes
    'Actions': '#818cf8',
    'Crypto': '#6366f1',
    'ETF': '#f43f5e',
    'Liquidités': '#8b5cf6', // Primary Violet

    // Assets
    'Bitcoin': '#f7931a',
    'BTC-USD': '#f7931a', // Fallback
    'BTC': '#f7931a',
    'Ethereum': '#627eea',
    'ETH-USD': '#627eea', // Fallback
    'ETH': '#627eea',
    'Tether': '#26a17b',
    'USDT-USD': '#26a17b',
    'S&P 500 (PSP5)': '#f59e0b',
    'World (CW8)': '#3b82f6',

    // Sectors (French Keys)
    'Technologie': '#3b82f6',
    'Santé': '#ef4444',
    'Finance': '#10b981',
    'Consommation': '#f59e0b',
    'Conso. Cyclique': '#f59e0b',
    'Conso. Base': '#fcd34d',
    'Communication': '#8b5cf6',
    'Services Publics': '#64748b',
    'Énergie': '#f97316',
    'Industrie': '#6366f1',
    'Immobilier': '#ec4899',
    'Matériaux': '#a855f7',

    // Legacy/English Fallbacks just in case
    'Technology': '#3b82f6',
    'Health': '#ef4444',
    'Consumer': '#f59e0b',

    // Fallback
    'Autre': '#cbd5e1',
    'Other': '#cbd5e1'
};

const DEFAULT_COLORS = [
    '#fbbf24', '#10b981', '#f472b6', '#6366f1', '#f43f5e',
    '#06b6d4', '#f97316', '#a855f7', '#3b82f6', '#ec4899'
];

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
        <g>
            <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        </g>
    );
};

export default function AllocationSection({ currentHoldings, cashBalance, totalValue, mode = 'portfolio' }: AllocationSectionProps) {
    const { formatCurrency } = useFormatting();
    const fxRate = (currentHoldings.length > 0 && currentHoldings[0].fxRate) ? currentHoldings[0].fxRate : 1.08;

    // Determine available view modes based on the 'mode' prop
    // Dashboard: 'class' | 'platform'
    // Portfolio: 'sector' | 'asset'

    const [viewMode, setViewMode] = useState<string>(mode === 'dashboard' ? 'class' : 'sector');
    const [activeIndex, setActiveIndex] = useState(-1);

    // Reset viewMode when mode prop changes
    useEffect(() => {
        setViewMode(mode === 'dashboard' ? 'class' : 'sector');
    }, [mode]);

    const data = useMemo(() => {
        const map: Record<string, number> = {};

        // Helper to normalize platform name
        const getPlatformName = (sources: string[]) => {
            if (!sources || sources.length === 0) return 'Autre';

            // Normalize sources check
            // Check for Bitget explicitly case-insensitive
            const hasBitget = sources.some(s => s.toLowerCase().includes('bitget'));
            if (hasBitget) return 'Bitget';

            // Check for Portfolio Performance (PP) or PEA related accounts
            const hasPP = sources.some(s => 
                s.includes('PP') || 
                s.includes('Portfolio Performance') || 
                s.toUpperCase().includes('PEA')
            );
            if (hasPP) return 'Portfolio Performance';

            // Check others
            const s = sources[0];
            if (s.toUpperCase().includes('IBKR')) return 'Interactive Brokers';
            if (s.toUpperCase().includes('LEDGER')) return 'Ledger';

            return s;
        };

        // 1. Aggregate Data
        currentHoldings.forEach(h => {
            let key = 'Autre';
            const isCash = h.symbol && h.symbol.startsWith('CASH:');

            if (viewMode === 'sector') {
                const rawSector = h.sector || (h.isCrypto ? 'Crypto' : 'Autre');
                key = SECTOR_TRANSLATIONS[rawSector] || rawSector;
                if (isCash) key = 'Liquidités';
                if (h.isEtf) key = 'ETF';
            } else if (viewMode === 'asset') {
                key = h.name;
                if (isCash) key = 'Liquidités';
            } else if (viewMode === 'class') {
                if (isCash) key = 'Liquidités';
                else if (h.isCrypto) key = 'Crypto';
                else if (h.isEtf) key = 'ETF';
                else key = 'Actions';
            } else if (viewMode === 'platform') {
                key = getPlatformName(h.sources);
            }

            map[key] = (map[key] || 0) + h.value;
        });

        // 3. Convert to Array and Sort
        let result = Object.entries(map)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return result;

    }, [currentHoldings, cashBalance, viewMode]);

    const localTotal = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

    return (
        <div className="h-full flex flex-col gap-5">
            <div className="glass-card rounded-[2rem] p-8 shadow-2xl flex flex-col flex-1 transition-all duration-500 hover:border-foreground/10">
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                            <PieIcon size={18} className="text-primary" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground tracking-tight">Allocation</h2>
                    </div>
                    <div className="flex shrink-0 w-full sm:w-auto">
                        <div className="flex bg-foreground/5 p-1 rounded-lg border border-foreground/5 gap-1 w-full sm:w-auto sm:min-w-[240px]">
                            {mode === 'dashboard' ? (
                                <>
                                    <button onClick={() => setViewMode('class')} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-widest transition-all duration-300 border flex-1 ${viewMode === 'class' ? 'bg-primary/20 text-primary border-primary/30 shadow-glow shadow-primary/20 backdrop-blur-md' : 'border-transparent text-slate-500 hover:text-foreground hover:bg-foreground/5'}`}>CLASSE</button>
                                    <button onClick={() => setViewMode('platform')} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-widest transition-all duration-300 border flex-1 ${viewMode === 'platform' ? 'bg-primary/20 text-primary border-primary/30 shadow-glow shadow-primary/20 backdrop-blur-md' : 'border-transparent text-slate-500 hover:text-foreground hover:bg-foreground/5'}`}>PLATEFORME</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setViewMode('sector')} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-widest transition-all duration-300 border flex-1 ${viewMode === 'sector' ? 'bg-primary/20 text-primary border-primary/30 shadow-glow shadow-primary/20 backdrop-blur-md' : 'border-transparent text-slate-500 hover:text-foreground hover:bg-foreground/5'}`}>SECTEUR</button>
                                    <button onClick={() => setViewMode('asset')} className={`px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-widest transition-all duration-300 border flex-1 ${viewMode === 'asset' ? 'bg-primary/20 text-primary border-primary/30 shadow-glow shadow-primary/20 backdrop-blur-md' : 'border-transparent text-slate-500 hover:text-foreground hover:bg-foreground/5'}`}>ACTIFS</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-6 sm:gap-10 flex-1 justify-center min-h-0">
                    <div className="h-60 sm:h-64 md:h-72 w-full relative">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    activeIndex={activeIndex >= 0 ? activeIndex : undefined}
                                    activeShape={renderActiveShape}
                                    data={data}
                                    innerRadius="65%"
                                    outerRadius="85%"
                                    fill="#8884d8"
                                    dataKey="value"
                                    paddingAngle={4}
                                    onMouseEnter={(_, index) => setActiveIndex(index)}
                                    onMouseLeave={() => setActiveIndex(-1)}
                                >
                                    {data.map((entry, index) => {
                                        const color = COLORS[entry.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                                        return <Cell key={`cell-${index}`} fill={color} stroke="none" />;
                                    })}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Centered Label */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center px-4">
                                <AnimatePresence mode="wait">
                                    {activeIndex >= 0 ? (
                                        <motion.div 
                                            key={data[activeIndex]?.name} 
                                            initial={{ opacity: 0, scale: 0.8 }} 
                                            animate={{ opacity: 1, scale: 1 }} 
                                            className="flex flex-col items-center max-w-[140px]"
                                        >
                                            <p className="text-slate-500 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.15em] mb-0.5 sm:mb-1 line-clamp-2 leading-tight">
                                                {data[activeIndex]?.name}
                                            </p>
                                            <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground leading-none">
                                                {formatCurrency(data[activeIndex]?.value || 0, { isTotal: true, fxRate })}
                                            </p>
                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-foreground/5 mt-1 sm:mt-2 border border-foreground/5">
                                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full" style={{ backgroundColor: COLORS[data[activeIndex]?.name] || DEFAULT_COLORS[activeIndex % DEFAULT_COLORS.length] }} />
                                                <p className="text-[9px] sm:text-[10px] font-bold" style={{ color: COLORS[data[activeIndex]?.name] || DEFAULT_COLORS[activeIndex % DEFAULT_COLORS.length] }}>
                                                    {((data[activeIndex]?.value || 0) / (localTotal || 1) * 100).toFixed(1)}%
                                                </p>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div key="total" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                                            <p className="text-slate-500 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.15em] mb-0.5 sm:mb-1">CAPITAL TOTAL</p>
                                            <p className="text-lg sm:text-xl md:text-2xl font-bold text-foreground leading-none">
                                                {formatCurrency(totalValue, { isTotal: true, fxRate })}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    <div className="w-full space-y-2 max-h-[180px] overflow-y-auto pr-3 custom-scrollbar">
                        {data.map((d, i) => {
                            const color = COLORS[d.name] || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
                            return (
                                <button key={i} onMouseEnter={() => setActiveIndex(i)} onMouseLeave={() => setActiveIndex(-1)} className={`w-full flex items-center justify-between p-3.5 rounded-[1.25rem] border transition-all duration-300 transform ${activeIndex === i ? 'bg-primary/10 border-primary/30 -translate-x-1' : 'bg-foreground/[0.02] border-foreground/5'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full shadow-lg" style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}66` }}></div>
                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-tighter leading-tight">{d.name}</span>
                                    </div>
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500">{formatCurrency(d.value, { isTotal: true, fxRate })}</span>
                                        <span className="text-[12px] font-bold min-w-[45px] text-right" style={{ color: color }}>{((d.value / (localTotal || 1)) * 100).toFixed(1)}%</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
