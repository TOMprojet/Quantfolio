'use client';
import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, Activity } from 'lucide-react';
import { formatSmart, getAssetLogoUrl } from '@/lib/core/format-utils';
import { useFormatting } from '@/hooks/useFormatting';

interface AssetTableProps {
    assets: any[];
}

export default function AssetTable({ assets }: AssetTableProps) {
    const { formatCurrency } = useFormatting();
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedHoldings = useMemo(() => {
        let sortableItems = assets
            .filter(h => !h.symbol.startsWith('CASH:'))
            .map(h => {
                const nativePnl = h.pnlNative ?? 0;
                const nativeCurrency = h.nativeCurrency || 'USD';
                const nativeVal = h.currentPrice * h.quantity;
                const impliedFx = (nativeVal > 0 && h.value > 0) ? (h.value / nativeVal) : 1;
                const fxImpact = (nativeCurrency !== 'EUR' && h.symbol !== 'USDT' && !h.isCrypto)
                    ? (h.pnl - (nativePnl * impliedFx))
                    : 0;
                return { ...h, fxImpactVal: fxImpact, nativeCurrency };
            });

        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aVal = a[sortConfig.key as keyof typeof a];
                let bVal = b[sortConfig.key as keyof typeof b];
                if (sortConfig.key === 'pnlNative') { aVal = a.pnlNative ?? a.pnl; bVal = b.pnlNative ?? b.pnl; }
                if (sortConfig.key === 'fxImpact') { aVal = a.fxImpactVal; bVal = b.fxImpactVal; }
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
            sortableItems.sort((a, b) => b.value - a.value);
        }
        return sortableItems;
    }, [assets, sortConfig]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <DollarSign className="text-emerald-400" size={24} />
                    Liste des Actifs
                </h3>
            </div>

            <div className="rounded-3xl border border-foreground/10 bg-surface/50 overflow-hidden shadow-2xl ring-1 ring-foreground/5 backdrop-blur-sm">
                {/* HEADERS */}
                <div className="grid grid-cols-[3fr_1fr_1fr] md:grid-cols-[4fr_1fr_1fr_1.5fr] xl:grid-cols-[4.5fr_0.9fr_0.9fr_0.9fr_1.3fr_0.8fr_0.8fr_1.3fr] gap-1 px-4 sm:px-6 py-4 border-b border-foreground/10 text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold bg-foreground/[0.02] items-center">
                    <div className="cursor-pointer hover:text-foreground transition-colors flex items-center gap-1" onClick={() => requestSort('name')}>Actif</div>
                    <div className="text-right cursor-pointer hover:text-foreground transition-colors" onClick={() => requestSort('quantity')}>Qté</div>
                    <div className="text-right cursor-pointer hover:text-foreground transition-colors hidden md:block" onClick={() => requestSort('currentPrice')}>Prix</div>
                    <div className="text-right cursor-pointer hover:text-foreground transition-colors hidden xl:block" onClick={() => requestSort('pru')}>PRU</div>
                    <div className="text-right cursor-pointer hover:text-foreground transition-colors hidden md:block" onClick={() => requestSort('performance')}>Perf.</div>
                    <div className="text-right cursor-pointer hover:text-foreground transition-colors hidden xl:block text-purple-400/80" onClick={() => requestSort('cagr')}>CAGR</div>
                    <div className="text-right cursor-pointer hover:text-foreground transition-colors hidden xl:block text-amber-400/80" onClick={() => requestSort('fxImpact')}>Change</div>
                    <div className="text-right cursor-pointer hover:text-foreground transition-colors" onClick={() => requestSort('value')}>Valeur</div>
                </div>

                {/* LIST ROWS */}
                <div className="divide-y divide-white/5 font-sans">
                    {sortedHoldings.map((h, i) => {
                        // DASHBOARD CURRENCY (usually EUR, but dynamic)
                        const baseCurrency = h.currency || 'EUR';
                        
                        // NATIVE CURRENCY - Trusting Master Store Persistence
                        const nCurr = h.nativeCurrency || 'EUR';
                        
                        const nativePnl = h.pnlNative ?? 0;
                        const isNativePos = nativePnl >= 0;
                        
                        // FX IMPACT: Difference between Total PnL (Base) and Stock PnL (Native converted at current rate)
                        const currentValNative = h.currentPrice * h.quantity;
                        const currentRate = (currentValNative > 0) ? (h.value / currentValNative) : 1;
                        
                        const stockPnlBase = nativePnl * currentRate;
                        const fxImpact = (nCurr !== baseCurrency && !h.isCrypto) ? (h.pnl - stockPnlBase) : 0;
                        const showFx = nCurr !== baseCurrency && Math.abs(fxImpact) >= 0.01;

                        const displayPrice = h.currentPrice || h.nativePrice || 0;
                        const displayPru = h.pru || 0;

                        // Logo Logic
                        const logoUrl = getAssetLogoUrl(h.symbol, h.name);

                        return (
                            <div key={i} className="group grid grid-cols-[3fr_1fr_1fr] md:grid-cols-[4fr_1fr_1fr_1.5fr] xl:grid-cols-[4.5fr_0.9fr_0.9fr_0.9fr_1.3fr_0.8fr_0.8fr_1.3fr] gap-1 px-4 sm:px-6 py-4 items-center hover:bg-primary/5 transition-all duration-200 relative">
                                <div className="absolute left-0 bottom-0 top-0 w-[2px] bg-transparent group-hover:bg-primary transition-colors" />
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-foreground/5 flex items-center justify-center overflow-hidden shrink-0 border border-foreground/10 p-1 sm:p-1.5 shadow-sm group-hover:scale-105 transition-transform duration-300 relative">
                                        <img 
                                            src={logoUrl} 
                                            alt={h.name} 
                                            className="w-full h-full object-contain relative z-10" 
                                            onError={(e) => { 
                                                (e.target as HTMLImageElement).style.display = 'none'; 
                                                const fallback = (e.target as HTMLElement).nextElementSibling;
                                                if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                            }} 
                                        />
                                        <TrendingUp className="hidden absolute w-4 h-4 text-slate-500/20" />
                                    </div>
                                    <div className="flex flex-col min-w-0 pr-1 sm:pr-2">
                                        <span className="text-foreground text-[12px] sm:text-sm font-semibold leading-tight break-words" title={h.name}>{h.name}</span>
                                        <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 bg-foreground/5 px-1 sm:px-1.5 rounded uppercase tracking-wider w-fit mt-0.5">{h.cleanTicker}</span>
                                    </div>
                                </div>
                                <div className="text-right text-slate-600 dark:text-slate-300 text-[11px] sm:text-[13px] tracking-tight font-medium">{formatSmart(h.quantity, true)}</div>
                                
                                {/* PRICE */}
                                <div className="text-right text-slate-700 dark:text-slate-200 text-[11px] sm:text-[13px] tracking-tight font-medium hidden md:block">
                                    {formatCurrency(displayPrice, { currency: nCurr })}
                                </div>
                                
                                {/* PRU */}
                                <div className="text-right text-slate-500 dark:text-slate-400 text-[11px] sm:text-[13px] hidden xl:block tracking-tight font-medium">
                                    {formatCurrency(displayPru, { currency: nCurr })}
                                </div>

                                {/* PERF */}
                                <div className="text-right flex flex-col items-end hidden md:flex">
                                    <div className={`text-[11px] sm:text-[13px] tracking-tight font-medium ${isNativePos ? 'text-emerald-400' : 'text-red-400'}`}>{isNativePos ? '+' : ''}{formatCurrency(nativePnl, { currency: nCurr })}</div>
                                    <div className={`text-[9px] sm:text-[10px] font-medium ${h.performance >= 0 ? 'text-emerald-500/70' : 'text-red-500/70'}`}>{h.performance >= 0 ? '+' : ''}{(h.performance || 0).toFixed(2)}%</div>
                                </div>

                                {/* CAGR */}
                                <div className="text-right text-[11px] sm:text-[13px] tracking-tight font-medium text-purple-400 opacity-90 hidden xl:block">{(h.cagr || 0).toFixed(1)}%</div>
                                
                                {/* FX Impact */}
                                <div className="text-right text-[11px] sm:text-[13px] tracking-tight font-medium w-full flex items-center justify-end hidden xl:flex">
                                    {showFx ? <span className={`${fxImpact >= 0 ? 'text-amber-500 dark:text-amber-400' : 'text-amber-800 dark:text-amber-700'} opacity-90`}>{fxImpact > 0 ? '+' : ''}{Math.round(fxImpact)} €</span> : '-'}
                                </div>

                                {/* VALUE */}
                                <div className="text-right flex flex-col items-end justify-center">
                                    <div className="text-foreground font-bold text-[12px] sm:text-sm tracking-tight">{Math.round(h.value).toLocaleString()} €</div>
                                    <div className={`text-[8px] sm:text-[10px] font-bold ${h.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'} flex items-center gap-1`}>
                                        {h.pnl >= 0 ? <TrendingUp size={10} /> : <TrendingUp className="rotate-180" size={10} />}
                                        {h.pnl >= 0 ? '+' : ''}{Math.round(h.pnl)} €
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
