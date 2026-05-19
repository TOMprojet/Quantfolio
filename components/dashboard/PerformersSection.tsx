'use client';
import React, { useMemo } from 'react';
import { getAssetDisplayName, getAssetLogoUrl } from '../../lib/core/format-utils';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, CircuitBoard } from 'lucide-react';
import { useFormatting } from '@/hooks/useFormatting';
import Image from 'next/image';

interface PerformersSectionProps {
    currentHoldings: any[];
    assetMetadata: Record<string, any>;
}

export default function PerformersSection({ currentHoldings, assetMetadata }: PerformersSectionProps) {
    const { formatCurrency } = useFormatting();
    const fxRate = (currentHoldings.length > 0 && (currentHoldings[0].fxRate || currentHoldings[0].currency === 'EUR' ? 1.08 : currentHoldings[0].fxRate)) || 1.08;

    const { winners, losers } = useMemo(() => {
        const filtered = currentHoldings.filter(h => h.symbol && !h.symbol.startsWith('CASH:') && h.name !== 'CASH' && h.symbol !== 'CASH' && h.value > 10);
        const sorted = [...filtered].sort((a, b) => (b.performance || 0) - (a.performance || 0));
        return {
            winners: sorted.slice(0, 3),
            losers: sorted.slice(-3).reverse()
        };
    }, [currentHoldings]);

    const renderCard = (h: any, i: number, isWinner: boolean) => {
        const meta = assetMetadata[h.symbol] || {};

        // Name Resolution: Unified
        const fullName = getAssetDisplayName(h.symbol, meta, h.isCrypto);

        // Logo Resolution: Try local override first, then Yahoo/meta provided
        // We assume local logos are named exactly as symbol .png based on user files
        // But we handle fallback with simple img onError if needed (hard in Next Image without state).
        // Strategy: Use a standard img tag for simplicity with local paths, 
        // fallback to meta.logourl if available.

        // Clean symbol for file path (e.g. PSP5.PA -> PSP5? No, user files were distinct. 
        // User had FTNT.png, GOOG.png. 
        // If symbol is PSP5.PA, check if we strip suffix.
        const cleanSymbol = h.symbol.split('.')[0];
        // But some files might be exact match? I saw GOOG.png.
        // Let's try flexible search or just default to cleanSymbol.

        const localLogoPath = `/logo/${cleanSymbol}.png`;
        const localLogoPath2 = `/logo/${h.symbol}.png`;

        // Ticker Logic: Strip -USD for cleaner look
        const cleanTicker = h.symbol.replace('-USD', '');

        const isPositive = h.performance >= 0;

        return (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-foreground/[0.02] rounded-2xl border border-foreground/5 hover:bg-foreground/[0.05] hover:border-primary/20 transition-all duration-300 group shadow-sm gap-3 sm:gap-0">
                <div className="flex items-center gap-5">
                    <div className={`text-sm font-bold w-6 ${isPositive ? 'text-emerald-500/30' : 'text-rose-500/30'}`}>#{i + 1}</div>

                    {/* Logo Container */}
                    <div className="w-12 h-12 rounded-2xl bg-foreground/5 p-1.5 flex-shrink-0 overflow-hidden relative border border-foreground/5 shadow-inner flex items-center justify-center">
                        <img 
                            src={getAssetLogoUrl(h.symbol, fullName)} 
                            alt={fullName} 
                            className="w-full h-full object-contain filter group-hover:brightness-110 transition-all relative z-10"
                            onError={(e) => { 
                                (e.target as HTMLImageElement).style.display = 'none';
                                const fallback = (e.target as HTMLElement).nextElementSibling;
                                if (fallback) (fallback as HTMLElement).style.display = 'flex';
                            }}
                        />
                        <div className="hidden absolute inset-0 items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                            {h.symbol.substring(0, 2)}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none z-20" />
                    </div>

                    <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-bold text-foreground text-sm leading-snug break-words" title={fullName}>
                            {fullName}
                        </span>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{cleanTicker}</span>
                           <div className="w-1 h-1 rounded-full bg-slate-700" />
                           <span className="text-[10px] text-slate-500 font-bold uppercase">{formatCurrency(h.value, { isTotal: true, fxRate })}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-1 shrink-0 pl-11 sm:pl-0">
                    <div className={`flex items-center gap-1.5 font-bold text-xl ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? <ArrowUpRight size={22} className="drop-shadow-glow-emerald" /> : <ArrowDownRight size={22} className="drop-shadow-glow-rose" />}
                        {h.performance > 0 ? '+' : ''}{h.performance.toFixed(2)}%
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
            {/* WINNERS */}
            <div className="glass-card rounded-[2rem] p-8 shadow-2xl relative overflow-hidden transition-all duration-500 hover:border-emerald-500/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32 rounded-full opacity-50" />
                
                <h3 className="text-xl font-bold text-foreground mb-8 flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-glow-emerald">
                        <TrendingUp size={22} className="text-emerald-400" />
                    </div>
                    Top Performers
                </h3>
                <div className="space-y-4 relative z-10">
                    {winners.map((h, i) => renderCard(h, i, true))}
                    {winners.length === 0 && (
                        <div className="p-10 text-center glass-panel rounded-3xl border-dashed border-foreground/10">
                            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Aucun gagnant détecté</p>
                        </div>
                    )}
                </div>
            </div>

            {/* LOSERS */}
            <div className="glass-card rounded-[2rem] p-8 shadow-2xl relative overflow-hidden transition-all duration-500 hover:border-rose-500/20">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[100px] -mr-32 -mt-32 rounded-full opacity-50" />
                
                <h3 className="text-xl font-bold text-foreground mb-8 flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 shadow-glow-rose">
                        <TrendingDown size={22} className="text-rose-400" />
                    </div>
                    Moins Bonnes Performances
                </h3>
                <div className="space-y-4 relative z-10">
                    {losers.map((h, i) => renderCard(h, i, false))}
                    {losers.length === 0 && (
                        <div className="p-10 text-center glass-panel rounded-3xl border-dashed border-foreground/10">
                            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Aucune perte détectée</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
