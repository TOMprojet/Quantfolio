'use client';
import React, { useState, useMemo } from 'react';
import { History, TrendingUp, Calendar, ArrowRightLeft } from 'lucide-react';
import { formatSmart, getAssetLogoUrl } from '@/lib/core/format-utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFormatting } from '@/hooks/useFormatting';

interface ClosedPositionsTableProps {
    positions: any[];
}

export default function ClosedPositionsTable({ positions }: ClosedPositionsTableProps) {
    const { formatCurrency } = useFormatting();
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedPositions = useMemo(() => {
        let sortableItems = [...positions];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aVal = a[sortConfig.key as keyof typeof a];
                let bVal = b[sortConfig.key as keyof typeof b];
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            sortableItems.sort((a, b) => new Date(b.lastSellDate).getTime() - new Date(a.lastSellDate).getTime());
        }
        return sortableItems;
    }, [positions, sortConfig]);

    const stats = useMemo(() => {
        if (positions.length === 0) return null;
        const totalPnl = positions.reduce((sum, p) => sum + (p.realizedPnl || 0), 0);
        const avgPerf = positions.reduce((sum, p) => sum + (p.performance || 0), 0) / positions.length;
        return { totalPnl, avgPerf };
    }, [positions]);

    if (positions.length === 0) return null;

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-1 gap-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                        <History className="text-indigo-400" size={24} />
                        Positions Clôturées
                    </h3>
                    <span className="text-slate-500 text-xs font-medium bg-foreground/5 px-2 py-1 rounded-full border border-foreground/10">
                        {positions.length} actifs
                    </span>
                </div>

                <div className="flex items-center gap-6 bg-surface/30 p-4 rounded-2xl border border-foreground/5 backdrop-blur-md">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Réalisé</span>
                        <span className={`text-lg font-bold ${stats!.totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {formatCurrency(stats!.totalPnl, { isTotal: true })}
                        </span>
                    </div>
                    <div className="w-px h-8 bg-foreground/10" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Perf. Moyenne</span>
                        <span className={`text-lg font-bold ${stats!.avgPerf >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {stats!.avgPerf >= 0 ? '+' : ''}{stats!.avgPerf.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            <div className="rounded-3xl border border-foreground/10 bg-surface/50 overflow-hidden shadow-2xl ring-1 ring-foreground/5 backdrop-blur-sm">
                {/* HEADERS */}
                <div className="grid grid-cols-[1.5fr_0.6fr_1.2fr_1.2fr_1.2fr_1fr] md:grid-cols-[1.8fr_0.7fr_1.5fr_1.2fr_1.2fr_1.2fr_1fr] gap-4 px-6 py-4 border-b border-foreground/10 text-[10px] text-slate-500 uppercase tracking-wider font-bold bg-foreground/[0.02] items-center">
                    <div className="cursor-pointer hover:text-foreground transition-colors" onClick={() => requestSort('name')}>Actif</div>
                    <div className="text-right cursor-pointer hover:text-foreground transition-colors" onClick={() => requestSort('quantity')}>Qté</div>
                    <div className="text-center cursor-pointer hover:text-foreground transition-colors" onClick={() => requestSort('firstBuyDate')}>Période</div>
                    <div className="text-right cursor-pointer hover:text-foreground transition-colors" onClick={() => requestSort('avgBuyPrice')}>Achat Moy.</div>
                    <div className="text-right cursor-pointer hover:text-foreground transition-colors" onClick={() => requestSort('avgSellPrice')}>Vente Moy.</div>
                    <div className="text-right cursor-pointer hover:text-foreground transition-colors" onClick={() => requestSort('realizedPnl')}>P&L</div>
                    <div className="text-right cursor-pointer hover:text-foreground transition-colors" onClick={() => requestSort('performance')}>Perf.</div>
                </div>

                {/* LIST ROWS */}
                <div className="divide-y divide-white/5">
                    {sortedPositions.map((p, i) => {
                        const firstDate = p.firstBuyDate ? format(new Date(p.firstBuyDate), 'dd/MM/yyyy') : '-';
                        const lastDate = p.lastSellDate ? format(new Date(p.lastSellDate), 'dd/MM/yyyy') : '-';
                        const curr = p.currency || 'EUR';

                        return (
                            <div key={i} className="group grid grid-cols-[1.5fr_0.6fr_1.2fr_1.2fr_1.2fr_1fr] md:grid-cols-[1.8fr_0.7fr_1.5fr_1.2fr_1.2fr_1.2fr_1fr] gap-4 px-6 py-4 items-center hover:bg-white/5 transition-all duration-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center relative overflow-hidden shrink-0 p-1">
                                        <img 
                                            src={getAssetLogoUrl(p.symbol, p.name)} 
                                            alt={p.name} 
                                            className="w-full h-full object-contain relative z-10"
                                            onError={(e) => { 
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                const fallback = (e.target as HTMLElement).nextElementSibling;
                                                if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                            }}
                                        />
                                        <div className="hidden absolute inset-0 items-center justify-center text-indigo-400">
                                            <ArrowRightLeft size={14} />
                                        </div>
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-foreground text-xs font-semibold truncate leading-tight">{p.name}</span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{p.symbol}</span>
                                    </div>
                                </div>

                                <div className="text-right text-xs text-slate-300 font-medium">
                                    {p.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                </div>

                                <div className="text-center flex flex-col gap-0.5">
                                    <span className="text-[10px] text-slate-400 font-medium">{firstDate}</span>
                                    <div className="flex items-center justify-center gap-1">
                                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                                    </div>
                                    <span className="text-[10px] text-slate-300 font-bold">{lastDate}</span>
                                </div>

                                <div className="text-right text-xs text-slate-300 font-medium">
                                    {formatCurrency(p.avgBuyPrice, { currency: curr })}
                                </div>

                                <div className="text-right text-xs text-slate-300 font-bold">
                                    {formatCurrency(p.avgSellPrice, { currency: curr })}
                                </div>

                                <div className={`text-right font-bold text-xs ${p.realizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {formatCurrency(p.realizedPnl, { currency: curr })}
                                </div>

                                <div className="text-right">
                                    <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg inline-block border ${p.performance >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {p.performance >= 0 ? '+' : ''}{p.performance.toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
