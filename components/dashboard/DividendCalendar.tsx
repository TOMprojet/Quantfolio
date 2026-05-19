'use client';
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronRight, Bell, Timer, TrendingUp, Activity } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useFormatting } from '@/hooks/useFormatting';
import { getAssetLogoUrl } from '@/lib/core/format-utils';

interface DividendCalendarProps {
    currentHoldings: any[];
    assetMetadata: Record<string, any>;
}

export default function DividendCalendar({ currentHoldings, assetMetadata }: DividendCalendarProps) {
    const { formatCurrency, fiatCurrency } = useFormatting();

    // Get current EUR/USD rate for conversion if needed
    const fxRate = assetMetadata['EURUSD=X']?.currentPrice || 1.08;

    const upcomingDividends = useMemo(() => {
        const now = new Date();
        const list: any[] = [];

        currentHoldings.forEach(holding => {
            const meta = assetMetadata[holding.symbol] || {};
            // Prefer dividendPayDate if available, fallback to exDividendDate
            const dateStr = meta.dividendPayDate || meta.exDividendDate;
            
            if (dateStr) {
                const targetDate = new Date(dateStr);
                
                // Show if it's today or in the future
                if (isAfter(targetDate, addDays(now, -1))) {
                    const currency = meta.currency || 'USD';
                    const amountNative = meta.dividendAmount || (meta.dividendRate / 4) || 0; // Fallback to Q if amount missing
                    
                    // Convert to EUR for the internal "estimatedTotal" (which formatCurrency expects)
                    let amountEur = amountNative;
                    if (currency === 'USD') {
                        amountEur = amountNative / fxRate;
                    }

                    list.push({
                        symbol: holding.symbol,
                        name: meta.name || holding.name,
                        displayDate: targetDate,
                        isPayDate: !!meta.dividendPayDate,
                        rateNative: amountNative,
                        nativeCurrency: currency,
                        quantity: holding.quantity,
                        estimatedTotalEur: amountEur * holding.quantity
                    });
                }
            }
        });

        return list.sort((a, b) => a.displayDate.getTime() - b.displayDate.getTime());
    }, [currentHoldings, assetMetadata, fxRate]);

    const hasData = upcomingDividends.length > 0;

    if (!hasData) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="glass-card rounded-[2rem] p-8 shadow-2xl h-full flex flex-col transition-all duration-500 hover:border-foreground/10"
        >
            <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-glow shadow-indigo-500/10">
                        <Calendar size={22} className="text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-foreground tracking-tight">Dividendes à venir</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Prochains versements estimés</p>
                    </div>
                </div>
                {hasData && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <Timer size={14} className="text-indigo-400" />
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">{upcomingDividends.length} ÉVÉNEMENTS</span>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {hasData ? (
                    upcomingDividends.map((div, idx) => {
                        const isVerySoon = isBefore(div.displayDate, addDays(new Date(), 7));
                        
                        return (
                            <div 
                                key={div.symbol} 
                                className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-foreground/[0.02] border border-foreground/5 hover:bg-foreground/[0.04] hover:border-foreground/10 transition-all duration-300 gap-3 sm:gap-0"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 p-1.5 border border-white/10 flex items-center justify-center relative">
                                            <img 
                                                src={getAssetLogoUrl(div.symbol, div.name)} 
                                                alt={div.name} 
                                                className="w-full h-full object-contain relative z-10"
                                                onError={(e) => { 
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    const fallback = (e.target as HTMLElement).nextElementSibling;
                                                    if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                                }}
                                            />
                                            <TrendingUp className="hidden absolute w-4 h-4 text-slate-500/20" />
                                        </div>
                                        {isVerySoon && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background animate-pulse" />
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-foreground line-clamp-1">{div.name}</h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{div.symbol}</span>
                                            <span className="text-[10px] text-slate-600">•</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-tight ${isVerySoon ? 'text-emerald-400' : 'text-slate-400'}`}>
                                                {div.isPayDate ? 'Paiement' : 'Détachement'} : {format(div.displayDate, 'dd MMMM yyyy', { locale: fr })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-left sm:text-right shrink-0">
                                    <p className="text-sm font-bold text-foreground">
                                        {formatCurrency(div.estimatedTotalEur, { isTotal: true, fxRate })} <span className="text-[10px] text-slate-500 font-medium">(brut)</span>
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                        {formatCurrency(div.rateNative, { currency: div.nativeCurrency })}/action
                                    </p>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="p-4 bg-foreground/5 rounded-full mb-4">
                            <Timer size={24} className="text-slate-500" />
                        </div>
                        <p className="text-sm font-bold text-slate-400">Aucun dividende à venir annoncé</p>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest text-balance max-w-[200px]">
                            Les entreprises annoncent généralement leurs dates 1 à 3 mois à l'avance.
                        </p>
                    </div>
                )}
            </div>

            {hasData && (
                <div className="mt-8 pt-6 border-t border-foreground/5 flex justify-center">
                    <button className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-widest group">
                        Voir tout le calendrier <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            )}
        </motion.div>
    );
}
