'use client';
import React from 'react';
import { TrendingUp } from 'lucide-react';
import { 
    ResponsiveContainer, 
    ComposedChart, 
    CartesianGrid, 
    XAxis, 
    YAxis, 
    Tooltip, 
    Area, 
    Line 
} from 'recharts';

interface ValuationChartProps {
    symbol: string;
    finalChartData: any[];
    ticks: number[];
    results: any;
    currency: string;
}

export default function ValuationChart({ symbol, finalChartData, ticks, results, currency }: ValuationChartProps) {
    return (
        <div key={symbol} className="bg-surface/30 border border-foreground/5 rounded-3xl p-6 relative flex flex-col shadow-xl backdrop-blur-sm overflow-hidden h-full min-h-[400px]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 px-2 gap-4">
                <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <TrendingUp size={16} className="text-secondary" />
                    Projection de la Valeur
                </h3>
                {/* Legend */}
                <div className="flex gap-4 text-[10px] font-bold bg-foreground/5 px-4 py-2 rounded-lg border border-foreground/5">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span className="text-foreground/80">Prix</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div
                            className="w-2 h-2 rounded-full shadow-lg"
                            style={{
                                backgroundColor: results.mos > 0 ? '#34d399' : '#f43f5e',
                                boxShadow: results.mos > 0 ? '0 0 8px rgba(52, 211, 153, 0.5)' : '0 0 8px rgba(244, 63, 94, 0.5)'
                            }}
                        ></div>
                        <span style={{ color: results.mos > 0 ? '#34d399' : '#f43f5e' }}>Fair Value</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 border-t-2 border-dashed border-blue-400"></div>
                        <span className="text-foreground/80">Prix Cible</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={finalChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--foreground) / 0.05)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            ticks={ticks}
                            stroke="#475569"
                            fontSize={10}
                            tickFormatter={(ts) => new Date(ts).getFullYear().toString()}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                            dy={10}
                        />
                        <YAxis
                            stroke="#475569"
                            fontSize={10}
                            tickFormatter={(val) => `${val}${currency}`}
                            tickLine={false}
                            axisLine={false}
                            domain={['auto', 'auto']}
                            dx={-10}
                        />
                        <Tooltip
                            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    const d = new Date(label);
                                    return (
                                        <div className="bg-surface/90 border border-foreground/10 rounded-xl p-4 shadow-2xl backdrop-blur-xl">
                                            <p className="text-slate-400 text-[10px] font-bold mb-3 uppercase tracking-wider">{d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</p>
                                            <div className="space-y-2">
                                                {payload.map((entry: any, idx: number) => {
                                                    if (entry.value === null || entry.value === undefined) return null;
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between gap-8 text-xs font-bold">
                                                            <span className="flex items-center gap-2 text-foreground/80">
                                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }}></div>
                                                                {entry.name === 'historicalPrice' ? 'Prix Réel' :
                                                                    entry.name === 'forecastPrice' ? 'Cible Projetée' :
                                                                        entry.name === 'fairValuePoint' ? 'Fair Value' : ''}
                                                            </span>
                                                            <span style={{ color: entry.color || entry.stroke }} className="font-mono">
                                                                {entry.value?.toFixed(2)} {currency}
                                                            </span>
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
                        <Area
                            type="monotone"
                            dataKey="historicalPrice"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fill="url(#priceGradient)"
                            activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="forecastPrice"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="fairValuePoint"
                            stroke={results.mos > 0 ? '#34d399' : '#f43f5e'}
                            strokeWidth={0}
                            dot={{
                                r: 6,
                                fill: results.mos > 0 ? '#34d399' : '#f43f5e',
                                stroke: '#fff',
                                strokeWidth: 2
                            }}
                            isAnimationActive={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
