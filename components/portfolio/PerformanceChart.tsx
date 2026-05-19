'use client';
import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, subMonths, subYears, startOfYear, isAfter, isBefore, isEqual } from 'date-fns';
import { fr } from 'date-fns/locale';

interface PerformanceChartProps {
    metrics: any[];
    benchmarks: Record<string, any[]>; // Key: Asset Symbol, Value: History Array
}

// Colors for Benchmarks
const COLORS: Record<string, string> = {
    'Portfolio': '#8b5cf6', // Violet Primary
    'S&P 500 (PSP5)': '#0ea5e9', // Sky Blue
    'MSCI World (CW8)': '#0ea5e9',
    'Nasdaq 100 (PUST)': '#0ea5e9',
};

// Mapping of Ticker to Display Name 
const BENCHMARK_NAMES: Record<string, string> = {
    'PSP5.PA': 'S&P 500 (PSP5)',
    'CW8.PA': 'MSCI World (CW8)',
    'PUST.PA': 'Nasdaq 100 (PUST)'
};

export default function PerformanceChart({ metrics, benchmarks }: PerformanceChartProps) {
    const [timeFrame, setTimeFrame] = useState<'1M' | '3M' | 'YTD' | '1Y' | 'ALL'>('YTD');
    const [visibleBenchmarks, setVisibleBenchmarks] = useState<string[]>(['S&P 500 (PSP5)']);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const chartData = useMemo(() => {
        if (!metrics || metrics.length === 0) return [];

        // 1. Determine Start Date
        const lastDate = new Date(metrics[metrics.length - 1].date);
        let startDate = new Date(metrics[0].date); // Default ALL

        if (timeFrame === '1M') startDate = subMonths(lastDate, 1);
        if (timeFrame === '3M') startDate = subMonths(lastDate, 3);
        if (timeFrame === '1Y') startDate = subYears(lastDate, 1);
        if (timeFrame === 'YTD') startDate = startOfYear(lastDate);

        // 2. Filter Portfolio Data
        const filteredMetrics = metrics
            .filter(m => {
                const d = new Date(m.date);
                return isAfter(d, startDate) || isEqual(d, startDate);
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (filteredMetrics.length === 0) return [];

        // 3. Prepare Benchmarks (Forward Fill Logic)
        const benchmarkMaps: Record<string, Map<string, number>> = {};

        Object.entries(benchmarks).forEach(([symbol, history]) => {
            const map = new Map<string, number>();
            const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            sortedHistory.forEach(h => {
                const dStr = h.date instanceof Date ? h.date.toISOString().split('T')[0] : h.date.split('T')[0];
                // Use Adjusted Close for Total Return comparison (Dividends reinvested)
                map.set(dStr, h.adjClose || h.close);
            });
            benchmarkMaps[symbol] = map;
        });

        // 4. Find Baselines
        // FIX: For TWR accuracy, we need the TWR value of the day BEFORE the period starts.
        // If we use the first day's TWR as a baseline, we miss that first day's move.
        let startTWR = 0;
        const baselineMetric = [...metrics].reverse().find(m => {
            const d = new Date(m.date);
            return isBefore(d, startDate);
        });
        if (baselineMetric && baselineMetric.twr !== undefined) {
            startTWR = baselineMetric.twr;
        } else {
            // Fallback to first available if no prior data
            startTWR = filteredMetrics[0]?.twr ?? 0;
        }
        
        const startTotalValue = filteredMetrics[0]?.totalValue || 1;

        const benchmarkBaselines: Record<string, number> = {};
        // ... (lines 69-87 unchanged, but context requires careful replacement)

        Object.entries(benchmarks).forEach(([symbol, history]) => {
            const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // FIX: For proper TWR/YTD, Baseline must be the price of the Previous Close relative to StartDate.
            // e.g. If StartDate = Jan 1, we want Dec 31 Price.
            // Search backwards for first date <= startDate
            let baselinePoint = [...sorted].reverse().find(h => {
                const d = new Date(h.date);
                return isBefore(d, startDate) || isEqual(d, startDate);
            });

            // Fallback: If no history before (e.g. IPO after start date), take first available
            if (!baselinePoint) {
                baselinePoint = sorted.find(h => {
                    const d = new Date(h.date);
                    return isAfter(d, startDate) || isEqual(d, startDate);
                });
            }

            if (baselinePoint) benchmarkBaselines[symbol] = baselinePoint.adjClose || baselinePoint.close;
        });

        // 5. Build Data Points with Forward Fill
        let lastKnownBenchmarkPrices: Record<string, number> = {};
        Object.keys(benchmarkBaselines).forEach(sym => {
            lastKnownBenchmarkPrices[sym] = benchmarkBaselines[sym];
        });

        return filteredMetrics.map(m => {
            let dateStr = '';
            if (m.date instanceof Date) dateStr = m.date.toISOString().split('T')[0];
            else if (typeof m.date === 'string') dateStr = m.date.split('T')[0];
            else if (typeof m.date === 'number') dateStr = new Date(m.date).toISOString().split('T')[0];
            const mDate = new Date(m.date);
            let rebasedTWR = 0;
            if (m.twr !== undefined) {
                rebasedTWR = ((1 + m.twr / 100) / (1 + startTWR / 100) - 1) * 100;
            } else if (m.totalValue !== undefined && startTotalValue > 0) {
                rebasedTWR = ((m.totalValue / startTotalValue) - 1) * 100;
            }

            const point: any = {
                date: dateStr,
                timestamp: mDate.getTime(),
                Portfolio: rebasedTWR
            };

            Object.keys(benchmarks).forEach(symbol => {
                const name = BENCHMARK_NAMES[symbol];
                if (!visibleBenchmarks.includes(name)) return;

                const map = benchmarkMaps[symbol];
                let price = map.get(dateStr);

                if (price !== undefined) {
                    lastKnownBenchmarkPrices[symbol] = price;
                } else {
                    price = lastKnownBenchmarkPrices[symbol];
                }

                if (price !== undefined && benchmarkBaselines[symbol]) {
                    const base = benchmarkBaselines[symbol];
                    const perf = ((price - base) / base) * 100;
                    point[name] = perf;
                } else {
                    point[name] = point[name] || null;
                }
            });
            return point;
        });
    }, [metrics, benchmarks, timeFrame, visibleBenchmarks]);

    const activeBenchmark = visibleBenchmarks.length > 0 ? visibleBenchmarks[0] : 'none';

    const performances = useMemo(() => {
        if (chartData.length < 2) return { portfolio: 0, benchmark: null };
        const last = chartData[chartData.length - 1];
        const benchVal = activeBenchmark !== 'none' ? last[activeBenchmark] : null;
        return {
            portfolio: last.Portfolio || 0,
            benchmark: benchVal
        };
    }, [chartData, activeBenchmark]);

    const alpha = (performances.benchmark !== null && performances.portfolio !== undefined)
        ? performances.portfolio - performances.benchmark
        : null;

    const formattedAlpha = alpha !== null ? `${alpha > 0 ? '+' : ''}${alpha.toFixed(2)}%` : null;

    const formatXAxis = (tickItem: number) => {
        const date = new Date(tickItem);
        if (timeFrame === 'ALL' || timeFrame === '1Y') {
            // For long periods, show simpler date (Month/Year)
            return format(date, 'MMM yy', { locale: fr });
        }
        return format(date, 'dd MMM', { locale: fr });
    };

    return (
        <div className="glass-card rounded-[2rem] p-8 shadow-2xl flex flex-col h-full relative overflow-hidden transition-all duration-500 hover:border-foreground/10">
            {/* Gradient Background Effect */}
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

            {/* HEADER: Title & Timeframe */}
            <div className="flex justify-between items-center mb-6 z-20 relative">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                    Performance TWR
                </h3>

                <div className="flex gap-1 bg-foreground/5 p-1 rounded-lg">
                    {['1M', '3M', 'YTD', '1Y', 'ALL'].map(tf => (
                        <button
                            key={tf}
                            onClick={() => setTimeFrame(tf as any)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-bold tracking-widest transition-all duration-300 border ${timeFrame === tf ? 'bg-primary/20 text-primary border-primary/30 shadow-glow shadow-primary/20 backdrop-blur-md' : 'border-transparent text-slate-500 hover:text-foreground hover:bg-foreground/5'}`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>
            </div>

            {/* STATS ROW & BENCHMARK CONTROLS */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-6 z-20 relative">

                {/* COMBINED STATS BLOCK */}
                <div className="flex items-center gap-6">
                    {/* PORTFOLIO */}
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                            PORTEFEUILLE
                        </span>
                        <span className={`text-2xl font-bold tracking-tight ${performances.portfolio >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {performances.portfolio > 0 ? '+' : ''}{performances.portfolio.toFixed(2)}%
                        </span>
                    </div>

    {/* VS & BENCHMARK */}
    {activeBenchmark !== 'none' && performances.benchmark !== null && (
        <div className="flex items-center gap-4 pl-4 border-l border-white/10">
            <span className="text-[10px] font-bold text-slate-600 uppercase mt-2">VS</span>

            <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">
                    {activeBenchmark.split(' (')[0]}
                </span>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold tracking-tight text-sky-400">
                        {performances.benchmark > 0 ? '+' : ''}{Number(performances.benchmark).toFixed(2)}%
                    </span>
                    {/* Alpha Badge */}
                    {formattedAlpha && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${alpha! >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                            {formattedAlpha}
                        </span>
                    )}
                </div>
            </div>
        </div>
    )}
                </div>

                {/* DROPDOWN SELECTOR (Right Aligned below Timeframe) */}
                <div className="relative z-50">
                    <div className="flex flex-col items-end gap-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">COMPARATIF</label>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className={`flex items-center gap-2 backdrop-blur-md border text-[10px] font-bold rounded-lg pl-3 pr-2 py-1.5 transition-all min-w-[110px] justify-between cursor-pointer active:scale-95 text-right shadow-sm
                                ${activeBenchmark !== 'none' 
                                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/30 shadow-glow shadow-sky-500/20' 
                                    : 'bg-surface/80 border-foreground/10 text-foreground hover:bg-foreground/5'}
                            `}
                        >
                            <span className="truncate w-full text-right">
                                {activeBenchmark === 'none' ? 'Comparer' : activeBenchmark}
                            </span>
                            <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`transform transition-transform duration-200 text-slate-500 ${isDropdownOpen ? 'rotate-180' : ''}`}
                            >
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                    </div>

                    {isDropdownOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                            <div className="absolute top-full right-0 mt-2 w-[150px] bg-surface/90 backdrop-blur-xl border border-foreground/10 rounded-lg shadow-2xl overflow-hidden py-1 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
                                <button
                                    onClick={() => {
                                        setVisibleBenchmarks([]);
                                        setIsDropdownOpen(false);
                                    }}
                                    className={`text-left px-3 py-2 text-[10px] font-bold transition-colors w-full cursor-pointer flex items-center justify-between ${activeBenchmark === 'none' ? 'text-primary bg-primary/5' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <span>Aucun</span>
                                    {activeBenchmark === 'none' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                </button>
                                {Object.values(BENCHMARK_NAMES).map(name => (
                                    <button
                                        key={name}
                                        onClick={() => {
                                            setVisibleBenchmarks([name]);
                                            setIsDropdownOpen(false);
                                        }}
                                        className={`text-left mx-1 px-3 py-2 text-[10px] font-bold transition-all duration-300 rounded-lg cursor-pointer flex items-center justify-between border ${activeBenchmark === name ? 'bg-sky-500/20 text-sky-400 border-sky-500/30 shadow-glow shadow-sky-500/20 backdrop-blur-md' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <span>{name}</span>
                                        {activeBenchmark === name && <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-glow shadow-sky-500/50" />}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 w-full min-h-0 z-10 transition-all duration-500 ease-in-out">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                        <defs>
                            <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS['Portfolio']} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={COLORS['Portfolio']} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.05} vertical={false} />
                        <XAxis
                            dataKey="timestamp"
                            tickFormatter={formatXAxis}
                            stroke="#475569"
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            scale="time"
                            minTickGap={40}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="#475569"
                            tickFormatter={(val) => `${val > 0 ? '+' : ''}${val.toFixed(0)}%`}
                            tick={{ fontSize: 10, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                            dx={-10}
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-surface/90 border border-foreground/10 rounded-lg p-3 shadow-xl backdrop-blur-md z-50">
                                            <p className="text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-wider">
                                                {format(new Date(label), 'dd MMMM yyyy', { locale: fr })}
                                            </p>
                                            <div className="flex flex-col gap-1.5">
                                                {payload.map((p: any) => (
                                                    <div key={p.name} className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                                            <span className="text-xs font-bold text-foreground">
                                                                {p.name === 'Portfolio' ? 'Portefeuille' : p.name}
                                                            </span>
                                                        </div>
                                                        <span className={`text-xs font-bold ${p.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {p.value > 0 ? '+' : ''}{Number(p.value).toFixed(2)}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                            cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                        />

                        <Area
                            type="monotone"
                            dataKey="Portfolio"
                            stroke={COLORS['Portfolio']}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorPortfolio)"
                        />

                        {visibleBenchmarks.includes('S&P 500 (PSP5)') && (
                            <Area connectNulls type="monotone" dataKey="S&P 500 (PSP5)" stroke={COLORS['S&P 500 (PSP5)']} strokeWidth={2} fill="url(#colorBenchmark)" fillOpacity={1} />
                        )}
                        {visibleBenchmarks.includes('MSCI World (CW8)') && (
                            <Area connectNulls type="monotone" dataKey="MSCI World (CW8)" stroke={COLORS['MSCI World (CW8)']} strokeWidth={2} fill="url(#colorBenchmark)" fillOpacity={1} />
                        )}
                        {visibleBenchmarks.includes('Nasdaq 100 (PUST)') && (
                            <Area connectNulls type="monotone" dataKey="Nasdaq 100 (PUST)" stroke={COLORS['Nasdaq 100 (PUST)']} strokeWidth={2} fill="url(#colorBenchmark)" fillOpacity={1} />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
