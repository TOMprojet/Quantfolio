'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell } from 'recharts';
import { Activity, ShieldCheck, Trophy, Banknote, Grip, AlertTriangle } from 'lucide-react';

interface Score {
    label: string;
    value: number; // 0-100
    color: string;
    icon: any;
    description: string;
}

export interface ScoreDetails {
    cagr: number;
    pnlPct: number;
    pctGreen: number;
    maxDD: number;
    hhi: number;
    yieldPct: number;
    divGrowth: number;
    maxClusterWeight: number;
    dominantCluster: string;
}

interface PortfolioScorecardProps {
    scores: {
        global: number;
        performance: number;
        diversification: number;
        dividend: number;
        quality: number;
        correlation: number;
    };
    scoreDetails?: ScoreDetails;
    insights?: string[];
}

const GAUGE_ANGLES = {
    startAngle: 180,
    endAngle: 0,
};


function Gauge({ value, color, size = 80, showValue = true }: { value: number, color: string, size?: number, showValue?: boolean }) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);

    const height = (size / 2); // Removed +10

    const data = [
        { name: 'val', value: value },
        { name: 'rest', value: 100 - value },
    ];

    if (!isMounted) return <div style={{ width: size, height }} className="bg-foreground/5 rounded-t-full animate-pulse" />;

    return (
        <div className="relative flex items-center justify-center overflow-hidden" style={{ width: size, height }}>
            <PieChart width={size} height={height} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                    data={data}
                    cx="50%"
                    cy="100%"
                    startAngle={180}
                    endAngle={0}
                    innerRadius={size / 2 - 6}
                    outerRadius={size / 2}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={4}
                >
                    <Cell key="val" fill={color} />
                    <Cell key="rest" fill="currentColor" strokeOpacity={0.05} />
                </Pie>
            </PieChart>
            {showValue && (
                <div className="absolute bottom-0 text-center leading-none">
                    <span className="text-sm font-bold text-foreground">{Math.round(value)}</span>
                </div>
            )}
        </div>
    );
}

function PrimaryGauge({ value }: { value: number }) {
    const color = value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : '#ef4444';

    return (
        <div className="relative flex flex-col items-center justify-center">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />

            {/* Gauge */}
            <div className="relative z-10">
                <Gauge value={value} color={color} size={160} showValue={false} />
            </div>

            <div className="-mt-1 text-center relative z-10">
                <span className="text-4xl font-bold text-foreground block leading-none">{Math.round(value)}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">SCORE TOTAL</span>
            </div>
        </div>
    );
}

export default function PortfolioScorecard({ scores, scoreDetails, insights = [] }: PortfolioScorecardProps) {
    const fmt = (n?: number) => n !== undefined ? n.toFixed(1) : '?';

    const ITEMS: Score[] = [
        {
            label: 'Performance',
            value: scores.performance,
            color: '#8b5cf6',
            icon: Activity,
            description: 'Synthèse de la croissance (CAGR), du PnL réalisé, de la volatilité (Drawdown) et de la régularité des gains.'
        },
        {
            label: 'Dividendes',
            value: scores.dividend,
            color: '#f43f5e',
            icon: Banknote,
            description: 'Analyse du rendement direct (Yield) et de la dynamique de croissance de vos revenus passifs.'
        },
        {
            label: 'Corrélation',
            value: scores.correlation,
            color: '#f59e0b',
            icon: Grip,
            description: 'Évalue le risque systémique en analysant vos clusters sectoriels et l\'indépendance de vos actifs.'
        },
        {
            label: 'Diversification',
            value: scores.diversification,
            color: '#3b82f6',
            icon: ShieldCheck,
            description: 'Mesure la concentration de votre capital (Indice HHI). Une répartition équilibrée favorise la stabilité.'
        },
        {
            label: 'Qualité',
            value: scores.quality,
            color: '#10b981',
            icon: Trophy,
            description: 'Score fondamental basé sur la typologie des actifs (Cash > Actions solides > Actifs spéculatifs).'
        },
    ];

    return (
        <div className="rounded-3xl border border-foreground/10 bg-surface/50 overflow-hidden shadow-2xl relative p-6 backdrop-blur-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Trophy className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Santé du Portefeuille</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Analyse synthétique de vos actifs</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8 items-center">

                {/* Main Score - Left */}
                <div className="flex-shrink-0 flex flex-col items-center justify-center min-w-[200px] border-b xl:border-b-0 xl:border-r border-white/5 pb-8 xl:pb-0 pr-0 xl:pr-8 w-full xl:w-auto">
                    <PrimaryGauge value={scores.global} />
                </div>

                {/* Grid of Sub-Scores (Now 5 items, adjust grid) */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full text-foreground">
                    {ITEMS.map((item, i) => (
                        <div key={i} className="bg-foreground/[0.03] rounded-xl p-4 border border-foreground/5 flex flex-col items-center gap-3 hover:bg-foreground/[0.05] transition-colors group relative overflow-hidden">
                            <div className="flex items-center gap-2 w-full justify-between z-10">
                                <item.icon size={16} style={{ color: item.color }} />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">{item.label}</span>
                            </div>

                            <div className="z-10">
                                <Gauge value={item.value} color={item.color} size={90} />
                            </div>

                            {/* Hover Description overlay/tooltip */}
                            <div className="absolute inset-0 bg-surface/95 flex items-center justify-center p-3 opacity-0 group-hover:opacity-100 transition-opacity z-20 text-center">
                                <p className="text-[10px] text-foreground/80 font-medium leading-tight">
                                    {item.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Insights Footer (if any) */}
            {insights.length > 0 && (
                <div className="mt-6 pt-4 border-t border-white/5">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex flex-col gap-1">
                            {insights.map((msg, i) => (
                                <span key={i} className="text-[11px] text-foreground/80 font-medium">
                                    {msg}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
