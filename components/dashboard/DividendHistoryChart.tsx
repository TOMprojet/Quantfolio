'use client';
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronDown, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { parseISO } from 'date-fns';
import { useFormatting } from '../../hooks/useFormatting';

interface DividendHistoryChartProps {
    dividends: any[];
    assetMetadata: Record<string, any>;
}

const ASSET_COLORS = [
    '#fbbf24', '#10b981', '#f472b6', '#6366f1', '#f43f5e',
    '#06b6d4', '#f97316', '#a855f7', '#3b82f6', '#ec4899',
    '#eab308', '#14b8a6'
];

export default function DividendHistoryChart({ dividends, assetMetadata }: DividendHistoryChartProps) {
    const { formatCurrency } = useFormatting();
    const [divGranularity, setDivGranularity] = useState<'month' | 'quarter' | 'year'>('month');

    // Default fxRate if not available, since dividends are EUR-based in store
    const fxRate = 1.08;
    const [isDivYearOpen, setIsDivYearOpen] = useState(false);
    const [isDivDetailed, setIsDivDetailed] = useState(false);

    const availableDivYears = useMemo(() => {
        const years = new Set(dividends.map(d => (typeof d.date === 'string' ? parseISO(d.date) : d.date).getFullYear().toString()));
        const yearArray = Array.from(years).sort().reverse();
        return ['ALL', ...yearArray]; // Add ALL option
    }, [dividends]);

    const [selectedDivYear, setSelectedDivYear] = useState<string>(() => {
        const years = new Set(dividends.map(d => (typeof d.date === 'string' ? parseISO(d.date) : d.date).getFullYear().toString()));
        const yearArray = Array.from(years).sort().reverse();
        return yearArray.length > 0 ? yearArray[0] : new Date().getFullYear().toString();
    });

    const activeAssets = useMemo(() => {
        const set = new Set(dividends.map(d => d.symbol));
        return Array.from(set).sort();
    }, [dividends]);

    const dividendHistory = useMemo(() => {
        const data: any[] = [];

        if (selectedDivYear === 'ALL') {
            // Show by YEAR
            const yearsMap: Record<string, any> = {};
            dividends.forEach(d => {
                const date = typeof d.date === 'string' ? parseISO(d.date) : d.date;
                const y = date.getFullYear().toString();
                if (!yearsMap[y]) yearsMap[y] = { name: y, value: 0 };
                if (isDivDetailed) {
                    yearsMap[y][d.symbol] = (yearsMap[y][d.symbol] || 0) + d.amount;
                }
                yearsMap[y].value += d.amount;
            });
            Object.values(yearsMap).forEach(v => data.push(v));
            data.sort((a, b) => parseInt(a.name) - parseInt(b.name));
            return data;
        }

        const targetYear = parseInt(selectedDivYear);

        if (divGranularity === 'month') {
            const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
            data.push(...months.map(m => ({ name: m, value: 0 })));

            dividends.forEach(d => {
                const date = typeof d.date === 'string' ? parseISO(d.date) : d.date;
                if (date.getFullYear() === targetYear) {
                    const idx = date.getMonth();
                    if (isDivDetailed) {
                        data[idx][d.symbol] = (data[idx][d.symbol] || 0) + d.amount;
                    }
                    data[idx].value += d.amount;
                }
            });
        } else if (divGranularity === 'quarter') {
            const quarters = ['T1', 'T2', 'T3', 'T4'];
            data.push(...quarters.map(q => ({ name: q, value: 0 })));

            dividends.forEach(d => {
                const date = typeof d.date === 'string' ? parseISO(d.date) : d.date;
                if (date.getFullYear() === targetYear) {
                    const q = Math.floor(date.getMonth() / 3);
                    if (isDivDetailed) {
                        data[q][d.symbol] = (data[q][d.symbol] || 0) + d.amount;
                    }
                    data[q].value += d.amount;
                }
            });
        } else {
            // "Year" granularity with a specific year selected? 
            // Usually if year is selected, we show months.
            // If granularity is year and ALL is selected, we show years.
            // Let's fallback to month for specific year if granularity is year but a year is selected.
            const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
            data.push(...months.map(m => ({ name: m, value: 0 })));
            dividends.forEach(d => {
                const date = typeof d.date === 'string' ? parseISO(d.date) : d.date;
                if (date.getFullYear() === targetYear) {
                    const idx = date.getMonth();
                    data[idx].value += d.amount;
                    if (isDivDetailed) data[idx][d.symbol] = (data[idx][d.symbol] || 0) + d.amount;
                }
            });
        }
        return data;
    }, [dividends, divGranularity, selectedDivYear, isDivDetailed]);

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-[2rem] p-8 shadow-2xl h-full flex flex-col transition-all duration-500 hover:border-foreground/10">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-glow">
                        <BarChart3 size={22} className="text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground tracking-tight">Historique des Dividendes</h3>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex bg-foreground/5 p-1.5 rounded-xl border border-foreground/5">
                        <button onClick={() => setIsDivDetailed(false)} className={`px-4 py-1.5 rounded-xl text-[10px] font-bold tracking-widest transition-all duration-300 border ${!isDivDetailed ? 'bg-primary/20 text-primary border-primary/30 shadow-glow shadow-primary/20 backdrop-blur-md' : 'border-transparent text-slate-500 hover:text-foreground hover:bg-foreground/5'}`}>GLOBAL</button>
                        <button onClick={() => setIsDivDetailed(true)} className={`px-4 py-1.5 rounded-xl text-[10px] font-bold tracking-widest transition-all duration-300 border ${isDivDetailed ? 'bg-primary/20 text-primary border-primary/30 shadow-glow shadow-primary/20 backdrop-blur-md' : 'border-transparent text-slate-500 hover:text-foreground hover:bg-foreground/5'}`}>DÉTAIL</button>
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsDivYearOpen(!isDivYearOpen)}
                            className="px-4 py-2.5 rounded-xl text-[10px] font-bold tracking-widest transition-all duration-300 border bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:border-primary/30 shadow-glow shadow-primary/5 backdrop-blur-md flex items-center gap-2 uppercase"
                        >
                            {selectedDivYear === 'ALL' ? 'TOUT' : selectedDivYear} <ChevronDown size={14} className={`transition-transform duration-300 ${isDivYearOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isDivYearOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute top-full right-0 mt-3 w-32 glass-panel border border-foreground/10 rounded-2xl shadow-2xl z-20 overflow-hidden py-2"
                            >
                                {availableDivYears.map(y => (
                                    <button 
                                        key={y} 
                                        onClick={() => { setSelectedDivYear(y); setIsDivYearOpen(false); }} 
                                        className="w-full text-left px-5 py-2.5 text-[10px] font-bold tracking-widest text-slate-500 hover:bg-primary/10 hover:text-primary transition-all uppercase"
                                    >
                                        {y === 'ALL' ? 'TOUT' : y}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </div>

                    {selectedDivYear !== 'ALL' && (
                        <div className="flex bg-foreground/5 p-1.5 rounded-xl border border-foreground/5">
                            <button onClick={() => setDivGranularity('month')} className={`px-4 py-1.5 rounded-xl text-[10px] font-bold tracking-widest transition-all duration-300 border ${divGranularity === 'month' ? 'bg-primary/20 text-primary border-primary/30 shadow-glow shadow-primary/20 backdrop-blur-md' : 'border-transparent text-slate-500 hover:text-foreground hover:bg-foreground/5'}`}>MOIS</button>
                            <button onClick={() => setDivGranularity('quarter')} className={`px-4 py-1.5 rounded-xl text-[10px] font-bold tracking-widest transition-all duration-300 border ${divGranularity === 'quarter' ? 'bg-primary/20 text-primary border-primary/30 shadow-glow shadow-primary/20 backdrop-blur-md' : 'border-transparent text-slate-500 hover:text-foreground hover:bg-foreground/5'}`}>TRIMESTRE</button>
                        </div>
                    )}
                </div>
            </div>
            <div className="h-[250px]">
                <ResponsiveContainer>
                    <BarChart data={dividendHistory} barSize={24} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                                <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                            </linearGradient>
                            {ASSET_COLORS.map((color, i) => (
                                <linearGradient key={i} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity={1} />
                                    <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                                </linearGradient>
                            ))}
                        </defs>
                        <XAxis 
                            dataKey="name" 
                            stroke="rgb(var(--foreground) / 0.3)" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fontWeight: 800 }}
                        />
                        <YAxis 
                            stroke="rgb(var(--foreground) / 0.3)" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            width={80}
                            tick={{ fontWeight: 800 }}
                            tickFormatter={(val) => formatCurrency(val, { isTotal: true, fxRate })} 
                        />
                        <RechartsTooltip 
                            cursor={{ fill: 'rgb(var(--foreground) / 0.05)' }} 
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="glass-panel border border-foreground/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
                                            <p className="text-slate-500 dark:text-slate-500 text-[10px] font-bold mb-3 uppercase tracking-widest border-b border-foreground/5 pb-2">{label}</p>
                                            <div className="space-y-2">
                                                {[...payload].reverse().map((entry, idx) => {
                                                    const nameKey = entry.name as string;
                                                    if (!nameKey) return null;
                                                    
                                                    const metadata = assetMetadata?.[nameKey] || {};
                                                    const displayName = metadata.name || nameKey;
                                                    const assetIdx = activeAssets.indexOf(nameKey);
                                                    const color = assetIdx >= 0 ? ASSET_COLORS[assetIdx % ASSET_COLORS.length] : 'var(--primary)';

                                                    return (
                                                        <div key={idx} className="flex items-center justify-between gap-6">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}></div>
                                                                <span className="text-[11px] font-bold text-foreground uppercase tracking-tight">{entry.name === 'value' ? 'Total' : displayName}</span>
                                                            </div>
                                                            <span className="text-[11px] font-bold text-foreground">{formatCurrency(entry.value as number, { isTotal: true, fxRate })}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }} 
                        />
                        {!isDivDetailed ? (
                            <Bar dataKey="value" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                        ) : (
                            activeAssets.map((asset, index) => (
                                <Bar
                                    key={asset}
                                    dataKey={asset}
                                    stackId="a"
                                    fill={`url(#gradient-${index % ASSET_COLORS.length})`}
                                    stroke="rgba(var(--background), 0.5)"
                                    strokeWidth={2}
                                    radius={index === activeAssets.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                                />
                            ))
                        )}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
