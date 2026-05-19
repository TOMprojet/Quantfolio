'use client';
import React, { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip,
    ResponsiveContainer
} from 'recharts';
import { format, parseISO, subMonths, subYears } from 'date-fns';
import { useFormatting } from '@/hooks/useFormatting';

interface CapitalEvolutionChartProps {
    metrics: any[];
    externalTimeframe?: '1M' | '3M' | '1Y' | 'YTD' | 'ALL';
}

export default function CapitalEvolutionChart({ metrics, externalTimeframe = 'ALL' }: CapitalEvolutionChartProps) {
    const { formatCurrency, formatNumber } = useFormatting();
    const timeframe = externalTimeframe;

    const fxRate = (metrics.length > 0 && metrics[metrics.length - 1].fxRate) ? metrics[metrics.length - 1].fxRate : 1.08;

    const chartData = useMemo(() => {
        if (!metrics.length) return [];
        let filtered = [...metrics];
        const lastMetricDate = new Date(metrics[metrics.length - 1].date);
        if (timeframe === '1M') {
            const start = subMonths(lastMetricDate, 1);
            filtered = metrics.filter(m => new Date(m.date) >= start);
        } else if (timeframe === '3M') {
            const start = subMonths(lastMetricDate, 3);
            filtered = metrics.filter(m => new Date(m.date) >= start);
        } else if (timeframe === '1Y') {
            const start = subYears(lastMetricDate, 1);
            filtered = metrics.filter(m => new Date(m.date) >= start);
        } else if (timeframe === 'YTD') {
            const yearStart = `${lastMetricDate.getFullYear()}-01-01`;
            filtered = metrics.filter(m => m.date >= yearStart);
        }

        if (filtered.length === 0) return [];

        return filtered.map(m => {
            let fmt = 'dd/MM';
            if (timeframe === 'ALL' || timeframe === 'YTD') {
                fmt = 'dd/MM/yy';
            }

            return {
                date: m.date,
                shortDate: format(parseISO(m.date), fmt),
                value: m.totalValue,
                twr: m.twr,
                invested: m.investedCapital
            };
        });
    }, [metrics, timeframe]);

    const periodStats = useMemo(() => {
        if (chartData.length < 2) return { absolute: 0, percent: 0 };
        const first = chartData[0];
        const last = chartData[chartData.length - 1];

        if (timeframe === 'ALL') {
            const absolute = last.value - last.invested;
            const percent = last.invested > 0 ? (absolute / last.invested) * 100 : 0;
            return { absolute, percent };
        }

        // FIND BASELINE TWR (The day BEFORE the start of the period)
        // This ensures we capture the first day's performance.
        let startTwrRaw = 0;
        const firstDate = new Date(first.date);
        const baselineMetric = [...metrics].reverse().find(m => {
            const d = new Date(m.date);
            return d < firstDate;
        });

        if (baselineMetric) {
            startTwrRaw = (baselineMetric.twr || 0) / 100;
        } else {
            // Fallback: If no data before, we calculate from the first day's starting value
            // (But this is less accurate than having the previous close)
            startTwrRaw = (first.twr / 100);
        }

        const endTwrRaw = last.twr / 100;
        const percent = ((1 + endTwrRaw) / (1 + startTwrRaw) - 1) * 100;

        const absolute = last.value - first.value - (last.invested - first.invested);
        return { absolute, percent };
    }, [metrics, chartData, timeframe]);

    return (
        <div className="glass-card rounded-[2rem] p-8 shadow-2xl h-full flex flex-col transition-all duration-500 hover:border-foreground/10">
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                        <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground tracking-tight">Évolution du Capital</h2>
                </div>
            </div>

            <div className="flex flex-wrap gap-x-10 gap-y-4 mb-8 px-2">
                <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em]">Valeur Actuelle</p>
                    <p className="text-2xl sm:text-3xl font-bold text-foreground">
                        {chartData.length > 0 ? formatCurrency(chartData[chartData.length - 1].value, { isTotal: true, fxRate }) : formatCurrency(0, { isTotal: true, fxRate })}
                    </p>
                </div>

                <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em]">Performance ROI ({timeframe})</p>
                    <div className="flex items-baseline gap-2">
                        <p className={`text-2xl sm:text-3xl font-bold ${periodStats.percent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {periodStats.percent >= 0 ? '+' : ''}{periodStats.percent.toFixed(2)}%
                        </p>
                    </div>
                </div>
            </div>
            <div className="h-[350px] relative">
                <ResponsiveContainer>
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 15, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis 
                            dataKey="shortDate" 
                            stroke="rgb(var(--foreground) / 0.3)" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            minTickGap={40} 
                            tick={{ fontWeight: 700, fill: 'rgb(var(--foreground) / 0.5)' }}
                        />
                        <YAxis 
                            stroke="rgb(var(--foreground) / 0.3)" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            width={50}
                            tick={{ fontWeight: 700, fill: 'rgb(var(--foreground) / 0.5)' }}
                            tickFormatter={(val) => {
                                if (formatNumber(val) === '***') return '***';
                                if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M€`;
                                if (val >= 1000) return `${(val / 1000).toFixed(0)}k€`;
                                return `${val}€`;
                            }} 
                        />
                        <RechartsTooltip
                            contentStyle={{ 
                                backgroundColor: 'rgb(var(--surface) / 0.9)', 
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgb(var(--foreground) / 0.1)', 
                                borderRadius: '16px',
                                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'
                            }}
                            itemStyle={{ fontSize: '12px', fontWeight: 900 }}
                            labelStyle={{ color: 'rgb(var(--foreground) / 0.5)', fontSize: '10px', fontWeight: 900, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-surface/90 border border-foreground/10 rounded-lg p-3 shadow-xl backdrop-blur-md z-50">
                                            <p className="text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-wider">{data.shortDate}</p>
                                            <div className="flex flex-col gap-2 mt-1">
                                                <div className="flex items-center justify-between gap-6">
                                                    <span className="text-xs text-slate-400">Valeur Totale</span>
                                                    <span className="text-xs font-bold text-foreground">{formatCurrency(data.value, { isTotal: true, fxRate })}</span>
                                                </div>
                                                <div className="flex items-center justify-between gap-6">
                                                    <span className="text-xs text-slate-400">Capital Investi</span>
                                                    <span className="text-xs font-bold text-slate-300">{formatCurrency(data.invested, { isTotal: true, fxRate })}</span>
                                                </div>
                                                <div className="border-t border-white/5 pt-1.5 flex items-center justify-between gap-6">
                                                    <span className="text-xs text-slate-400">Performance (ROI)</span>
                                                    <span className={`text-xs font-bold ${data.value >= data.invested ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {data.value >= data.invested ? '+' : ''}{data.invested > 0 ? (((data.value / data.invested) - 1) * 100).toFixed(2) : '0.00'}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorValue)" name="value" />
                        <Area type="monotone" dataKey="invested" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fill="url(#colorInvested)" name="invested" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
