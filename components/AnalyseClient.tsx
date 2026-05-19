
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
    Search, 
    Plus, 
    TrendingUp, 
    Info, 
    Activity, 
    Star, 
    ChevronRight, 
    BarChart3, 
    Globe, 
    ShieldCheck,
    Building2,
    Briefcase,
    DollarSign,
    Percent,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Loader2,
    X,
    Calculator,
    ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip as RechartsTooltip, 
    ComposedChart,
    Bar,
    Legend
} from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getAssetLogoUrl, getExchangeName, translateSector } from '@/lib/core/format-utils';
import Link from 'next/link';
import { useFormatting } from '@/hooks/useFormatting';

import PageHeader from './ui/PageHeader';

interface SearchResult {
    symbol: string;
    name: string;
    exchange: string;
    type: string;
}

interface AnalyseClientProps {
    initialWatchlist?: string[];
    portfolioHoldings?: any[];
    portfolioMetadata?: Record<string, any>;
}

export default function AnalyseClient({ 
    initialWatchlist = [],
    portfolioHoldings = [],
    portfolioMetadata = {}
}: AnalyseClientProps) {
    const { formatCurrency } = useFormatting();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [timeframe, setTimeframe] = useState('1Y');
    const [watchlist, setWatchlist] = useState<string[]>(initialWatchlist);
    const [isWatchlistLoading, setIsWatchlistLoading] = useState(false);

    // Search Logic
    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            setIsSearching(false);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setResults(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error('Search error:', e);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query]);

    // Fetch Data for Selected Symbol
    useEffect(() => {
        if (!selectedSymbol) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch Fundamentals
                const fundRes = await fetch(`/api/fundamentals?symbol=${selectedSymbol}`);
                const fundData = await fundRes.json();
                setMetadata(fundData);

                // Fetch History
                const histRes = await fetch(`/api/history?symbol=${selectedSymbol}`);
                const histData = await histRes.json();
                setHistory(histData);
            } catch (e) {
                console.error('Fetch error:', e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [selectedSymbol]);

    const handleSelect = (symbol: string) => {
        setSelectedSymbol(symbol);
        setQuery('');
        setResults([]);
    };

    const toggleWatchlist = async () => {
        if (!selectedSymbol) return;
        setIsWatchlistLoading(true);
        const inWatchlist = watchlist.includes(selectedSymbol);
        
        try {
            const method = inWatchlist ? 'DELETE' : 'POST';
            const res = await fetch('/api/watchlist', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol: selectedSymbol })
            });
            const data = await res.json();
            if (data.success) {
                setWatchlist(data.watchlist);
            }
        } catch (e) {
            console.error('Watchlist toggle error:', e);
        } finally {
            setIsWatchlistLoading(false);
        }
    };

    const filteredHistory = useMemo(() => {
        if (!history || history.length === 0) return [];
        const now = new Date();
        let cutoff: Date | null = new Date();
        
        if (timeframe === '1M') cutoff.setMonth(now.getMonth() - 1);
        else if (timeframe === '6M') cutoff.setMonth(now.getMonth() - 6);
        else if (timeframe === 'YTD') cutoff = new Date(now.getFullYear(), 0, 1);
        else if (timeframe === '1Y') cutoff.setFullYear(now.getFullYear() - 1);
        else if (timeframe === '5Y') cutoff.setFullYear(now.getFullYear() - 5);
        else cutoff = null;

        if (!cutoff) return history;

        const firstIdx = history.findIndex((d: any) => new Date(d.date) >= cutoff!);
        if (firstIdx !== -1) {
            const startIdx = Math.max(0, firstIdx - 1);
            return history.slice(startIdx);
        }
        return history;
    }, [history, timeframe]);

    const performance = useMemo(() => {
        if (filteredHistory.length < 2) return null;
        const first = filteredHistory[0].close;
        const last = filteredHistory[filteredHistory.length - 1].close;
        return ((last - first) / first) * 100;
    }, [filteredHistory]);

    const isInWatchlist = selectedSymbol ? watchlist.includes(selectedSymbol) : false;

    return (
        <div className="flex flex-col gap-8 w-full mx-auto px-4 sm:px-6 lg:px-10 py-8 h-full overflow-y-auto custom-scrollbar pb-32">
            <PageHeader 
                title="Analyse"
                subtitle="Explorez les marchés et analysez n'importe quel titre."
                icon={BarChart3}
                rightContent={selectedSymbol ? (
                    <button 
                        onClick={() => setSelectedSymbol(null)}
                        className="flex items-center gap-2 px-4 py-2 bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 rounded-xl text-slate-400 hover:text-primary transition-all font-bold text-xs uppercase tracking-widest group"
                    >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Retour
                    </button>
                ) : undefined}
            />

            {/* Search Section */}
            <div className="relative z-[150]">
                <div className="max-w-3xl relative group">
                    <div className="absolute inset-0 bg-primary/20 blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-full" />
                    <div className="relative flex items-center bg-surface/50 backdrop-blur-2xl border border-foreground/10 rounded-2xl px-6 py-4 shadow-2xl transition-all duration-300 hover:border-primary/30 group-hover:shadow-primary/5">
                        <Search className="text-slate-500 w-6 h-6 mr-4" />
                        <input 
                            type="text"
                            placeholder="Rechercher un ticker ou une entreprise (ex: AAPL, LVMH)..."
                            className="w-full bg-transparent border-none focus:ring-0 outline-none text-foreground font-bold placeholder:text-slate-600 placeholder:font-medium text-lg"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        {query && (
                            <button 
                                onClick={() => setQuery('')}
                                className="p-2 hover:bg-white/5 rounded-full transition-colors group/clear"
                            >
                                <X className="w-4 h-4 text-slate-500 group-hover/clear:text-primary transition-colors" />
                            </button>
                        )}
                        {isSearching && <Loader2 className="w-5 h-5 animate-spin text-primary ml-2" />}
                    </div>

                    {/* Results Dropdown */}
                    <AnimatePresence>
                        {results.length > 0 && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full left-0 right-0 mt-4 bg-[#1a1c23] border border-white/10 rounded-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)] z-[999] p-2 backdrop-blur-3xl overflow-hidden flex flex-col"
                            >
                                <div className="max-h-[350px] overflow-y-auto overflow-x-hidden custom-scrollbar pr-1">
                                    <div className="flex flex-col gap-1">
                                        {results.map((r) => (
                                            <button 
                                                key={r.symbol}
                                                onClick={() => handleSelect(r.symbol)}
                                                className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-all group/item shrink-0"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-primary/30 transition-all shrink-0 overflow-hidden relative">
                                                        {r.logoUrl ? (
                                                            <img 
                                                                src={r.logoUrl} 
                                                                alt={r.symbol} 
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                    (e.target as HTMLImageElement).parentElement?.classList.add('fallback-icon');
                                                                }}
                                                            />
                                                        ) : (
                                                            <TrendingUp className="w-4 h-4 text-slate-600 opacity-40 group-hover/item:text-primary group-hover/item:opacity-100 transition-all" />
                                                        )}
                                                        {/* Fallback icon if image fails */}
                                                        <TrendingUp className="w-4 h-4 text-slate-600 opacity-40 group-hover/item:text-primary group-hover/item:opacity-100 transition-all absolute inset-0 m-auto hidden [.fallback-icon_&]:block" />
                                                    </div>
                                                    <div className="flex flex-col items-start min-w-0">
                                                        <span className="font-bold text-slate-200 text-base group-hover/item:text-primary transition-colors truncate">
                                                            {r.symbol}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
                                                            {r.name}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="px-2 py-1 bg-white/5 rounded-lg text-[8px] font-bold text-slate-500 uppercase">
                                                        {getExchangeName(r.exchange)}
                                                    </span>
                                                    <ChevronRight className="w-4 h-4 text-slate-700 group-hover/item:text-primary group-hover/item:translate-x-0.5 transition-all" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        {query && !isSearching && results.length === 0 && query.length >= 2 && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute top-full left-0 right-0 mt-4 bg-[#1a1c23]/90 backdrop-blur-3xl border border-white/10 rounded-2xl p-8 text-center shadow-2xl z-[999]"
                            >
                                <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Aucun résultat pour "{query}"</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Content Section */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                    <div className="relative">
                        <Loader2 className="w-16 h-16 animate-spin text-primary opacity-20" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Activity className="w-6 h-6 text-primary animate-pulse" />
                        </div>
                    </div>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.2em] animate-pulse">Chargement des données du marché...</p>
                </div>
            ) : selectedSymbol && metadata ? (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col gap-10"
                >
                    {/* Header Card */}
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 pb-10 border-b border-foreground/5">
                        <div className="flex items-center gap-8">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2.5rem] bg-foreground/5 p-4 flex items-center justify-center overflow-hidden border border-foreground/10 shadow-2xl relative group/logo">
                                <img 
                                    src={getAssetLogoUrl(selectedSymbol, metadata.longName || metadata.shortName)} 
                                    alt={selectedSymbol}
                                    className="w-full h-full object-contain relative z-10 transition-transform duration-500 group-hover/logo:scale-110"
                                    onError={(e) => { 
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        const parent = (e.target as HTMLElement).parentElement;
                                        if (parent) {
                                            const icon = parent.querySelector('.fallback-icon');
                                            if (icon) (icon as HTMLElement).style.opacity = '1';
                                        }
                                    }}
                                />
                                <TrendingUp className="fallback-icon absolute w-12 h-12 text-slate-500/20 opacity-0 transition-opacity" />
                                <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500" />
                            </div>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-4 flex-wrap">
                                    <h2 className="text-3xl sm:text-5xl font-black text-foreground tracking-tighter">{selectedSymbol}</h2>
                                    <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-xl text-primary text-[10px] font-black uppercase tracking-[0.2em]">
                                        {translateSector(metadata.sector) || 'Marché Global'}
                                    </div>
                                </div>
                                <h3 className="text-lg sm:text-2xl font-bold text-slate-400 max-w-2xl leading-tight">
                                    {metadata.longName || metadata.shortName}
                                </h3>
                                <div className="flex items-center gap-6 mt-2">
                                    <div className="flex flex-col">
                                        <span className="text-4xl font-black text-foreground tabular-nums">
                                            {formatCurrency(metadata.price || 0, { currency: metadata.currency })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                            <button 
                                onClick={toggleWatchlist}
                                disabled={isWatchlistLoading}
                                className={`flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-5 rounded-[2rem] font-bold text-base transition-all duration-300 shadow-xl ${
                                    isInWatchlist 
                                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20' 
                                    : 'bg-foreground/5 border border-foreground/10 text-foreground hover:bg-foreground/10'
                                }`}
                            >
                                {isWatchlistLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Star className={`w-6 h-6 ${isInWatchlist ? 'fill-amber-500' : ''}`} />}
                                {isInWatchlist ? 'Dans la Watchlist' : 'Suivre'}
                            </button>
                            <Link 
                                href={`/valuation?ticker=${selectedSymbol}`}
                                className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-5 bg-primary/20 backdrop-blur-md border border-primary/30 rounded-[2rem] font-black text-primary text-base hover:bg-primary/30 hover:scale-105 transition-all duration-300 shadow-xl shadow-primary/10 group/val"
                            >
                                <Calculator className="w-6 h-6" />
                                Valoriser
                                <ChevronRight className="w-5 h-5 group-hover/val:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-10">
                        
                        {/* Left Column: Chart & Stats */}
                        <div className="flex flex-col gap-10">
                            
                            {/* Chart Card */}
                            <div className="bg-surface/30 border border-foreground/5 rounded-[2.5rem] p-8 backdrop-blur-sm shadow-2xl relative overflow-hidden flex flex-col gap-8 min-h-[500px]">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20 shadow-glow">
                                            <TrendingUp className="text-primary w-6 h-6" />
                                        </div>
                                        <div className="flex flex-col">
                                            <h4 className="text-xl font-bold text-foreground">Historique du Cours</h4>
                                            {performance !== null && (
                                                <span className={`text-xs font-bold ${performance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {performance >= 0 ? '+' : ''}{performance.toFixed(2)}% sur la période
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex bg-foreground/5 p-1.5 rounded-2xl border border-foreground/5 gap-1 shadow-inner">
                                        {['1M', '6M', 'YTD', '1Y', '5Y'].map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => setTimeframe(t)}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timeframe === t ? 'bg-surface text-primary shadow-xl ring-1 ring-primary/20' : 'text-slate-500 hover:text-foreground'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="w-full h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={filteredHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                                            <XAxis 
                                                dataKey="date" 
                                                hide 
                                                domain={['dataMin', 'dataMax']}
                                            />
                                            <YAxis 
                                                orientation="left"
                                                domain={['auto', 'auto']}
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700 }}
                                                width={40}
                                                tickFormatter={(val) => Math.round(val).toString()}
                                            />
                                            <RechartsTooltip 
                                                content={({ active, payload }: any) => {
                                                    if (active && payload && payload.length) {
                                                        const d = payload[0].payload;
                                                        return (
                                                            <div className="bg-surface/90 backdrop-blur-2xl border border-foreground/10 p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                                                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                                                                    {format(new Date(d.date), 'dd MMMM yyyy', { locale: fr })}
                                                                </p>
                                                                <p className="text-2xl font-black text-foreground">
                                                                    {formatCurrency(d.close, { currency: metadata.currency })}
                                                                </p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Area 
                                                type="monotone" 
                                                dataKey="close" 
                                                stroke="#a855f7" 
                                                strokeWidth={3}
                                                fill="url(#chartGradient)" 
                                                animationDuration={1500}
                                                activeDot={{ r: 6, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }}
                                            />
                                            {filteredHistory.length === 0 && !isLoading && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest bg-background/50 px-6 py-3 rounded-2xl backdrop-blur-sm border border-white/5">
                                                        Données d'historique indisponibles
                                                    </p>
                                                </div>
                                            )}
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                <div className="bg-surface/30 border border-foreground/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Briefcase className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Market Cap</span>
                                    </div>
                                    <span className="text-2xl font-black text-foreground">{metadata.marketCap}</span>
                                </div>
                                <div className="bg-surface/30 border border-foreground/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Activity className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">P/E Ratio</span>
                                    </div>
                                    <span className="text-2xl font-black text-foreground">{metadata.per ? metadata.per.toFixed(2) : '-'}</span>
                                </div>
                                <div className="bg-surface/30 border border-foreground/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Percent className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Div. Yield</span>
                                    </div>
                                    <span className={`text-2xl font-black ${metadata.divYield > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                        {metadata.divYield > 0 ? `${metadata.divYield.toFixed(2)}%` : '-'}
                                    </span>
                                </div>
                                <div className="bg-surface/30 border border-foreground/5 rounded-3xl p-6 backdrop-blur-sm shadow-xl flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-slate-500">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">EPS</span>
                                    </div>
                                    <span className="text-2xl font-black text-foreground">{formatCurrency(metadata.eps || 0, { currency: metadata.currency })}</span>
                                </div>
                            </div>

                            {/* Description / Summary Section (If profile data added to API) */}
                            {metadata.industry && (
                                <div className="bg-surface/30 border border-foreground/5 rounded-3xl p-8 backdrop-blur-sm shadow-xl flex flex-col gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-primary/10 rounded-2xl">
                                            <Building2 className="text-primary w-6 h-6" />
                                        </div>
                                        <h4 className="text-xl font-bold text-foreground">Profil de l'Entreprise</h4>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-2">
                                        <div className="bg-foreground/[0.03] p-3 rounded-2xl border border-foreground/5">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Employés</span>
                                            <span className="text-sm font-bold text-foreground">{metadata.employees?.toLocaleString() || '-'}</span>
                                        </div>
                                        <div className="bg-foreground/[0.03] p-3 rounded-2xl border border-foreground/5">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Siège</span>
                                            <span className="text-sm font-bold text-foreground">{metadata.city || '-'}, {metadata.country || '-'}</span>
                                        </div>
                                        <div className="bg-foreground/[0.03] p-3 rounded-2xl border border-foreground/5">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Secteur</span>
                                            <span className="text-sm font-bold text-foreground truncate" title={translateSector(metadata.sector)}>{translateSector(metadata.sector) || '-'}</span>
                                        </div>
                                        <div className="bg-foreground/[0.03] p-3 rounded-2xl border border-foreground/5">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Site Web</span>
                                            <a href={metadata.website} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary hover:underline truncate block">
                                                {metadata.website?.replace('https://', '').replace('www.', '') || '-'}
                                            </a>
                                        </div>
                                    </div>
                                    <p className="text-slate-400 leading-relaxed font-medium text-sm whitespace-pre-wrap">
                                        {metadata.description || `Cette entreprise opère dans le secteur ${metadata.sector?.toLowerCase() || 'global'} (${metadata.industry?.toLowerCase() || 'diversifié'}). Elle est suivie mondialement pour sa performance opérationnelle et ses fondamentaux financiers solides.`}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Dividend Info or Similar */}
                        <div className="flex flex-col gap-8">
                             {/* AI ANALYSIS (Moved to Top) */}
                             <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-[2.5rem] p-8 backdrop-blur-sm shadow-xl flex flex-col gap-6 group hover:scale-[1.02] transition-all duration-500">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary/20 rounded-2xl border border-primary/30">
                                        <ShieldCheck className="text-primary w-6 h-6" />
                                    </div>
                                    <h4 className="text-xl font-bold text-foreground">Analyse IA</h4>
                                </div>
                                <div className="space-y-4">
                                    <p className="text-slate-400 text-sm font-medium leading-relaxed">
                                        {(() => {
                                            const parts = [];
                                            const sector = metadata.sector || '';
                                            const isTech = sector.includes('Technology') || sector.includes('Communication');
                                            const isFinance = sector.includes('Financial');
                                            const isConsumer = sector.includes('Consumer');
                                            
                                            // Personalized Opening based on Profile
                                            if (isTech && metadata.per > 30) {
                                                parts.push(`${selectedSymbol} est une valeur de croissance technologique typique, où le marché privilégie l'expansion future au détriment de la valorisation immédiate.`);
                                            } else if (metadata.divYield > 3.5 && metadata.roe > 10) {
                                                parts.push(`${selectedSymbol} se présente comme une valeur de rendement solide, combinant une rentabilité correcte et un retour aux actionnaires attractif.`);
                                            } else if (isConsumer && metadata.per < 20) {
                                                parts.push(`En tant qu'acteur de la consommation, ${selectedSymbol} affiche un profil défensif avec une valorisation qui semble protégée par ses fondamentaux.`);
                                            } else {
                                                parts.push(`L'analyse des fondamentaux de ${selectedSymbol} révèle un profil ${metadata.per < 15 ? 'axé sur la valeur (Value)' : 'équilibré'} dans son secteur.`);
                                            }

                                            // Valuation nuance
                                            if (metadata.per > 50) {
                                                parts.push("La valorisation est très tendue, ce qui ne laisse aucune place à l'erreur lors des prochaines publications de résultats.");
                                            } else if (metadata.per < 12 && metadata.eps > 0) {
                                                parts.push("Le multiple de bénéfices est particulièrement bas, ce qui pourrait indiquer une sous-évaluation ou une méfiance injustifiée du marché.");
                                            }

                                            // Profitability / ROE nuance
                                            if (metadata.roe > 25) {
                                                parts.push("Son excellente rentabilité en fait un actif de 'haute qualité' capable de s'auto-financer.");
                                            }

                                            // Growth nuance
                                            if (metadata.forwardPE && metadata.per && metadata.forwardPE < metadata.per * 0.8) {
                                                parts.push("Une accélération significative des profits est attendue, ce qui pourrait agir comme un catalyseur pour le cours.");
                                            }

                                            return parts.join(' ');
                                        })()}
                                    </p>
                                    <div className="flex flex-col gap-3 pt-4">
                                        <div className="flex justify-between items-center px-4 py-2 bg-black/20 rounded-xl">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Santé Financière</span>
                                            <span className={`text-[10px] font-bold uppercase ${(metadata.roe > 15 || metadata.fcf > 0) ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                {metadata.roe > 15 ? 'Optimale' : (metadata.fcf > 0 ? 'Solide' : 'Stable')}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center px-4 py-2 bg-black/20 rounded-xl">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Potentiel de Croissance</span>
                                            <span className={`text-[10px] font-bold uppercase ${(metadata.growth?.est5Y > 10 || metadata.per > 30) ? 'text-primary' : 'text-slate-400'}`}>
                                                {(() => {
                                                    const growth = metadata.growth?.est5Y || 0;
                                                    if (growth > 15 || (metadata.per > 40 && metadata.forwardPE < metadata.per)) return 'Élevé';
                                                    if (growth > 5 || metadata.per > 25) return 'Modéré';
                                                    return 'Limité';
                                                })()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                             </div>

                             {/* DIVIDENDS (Moved to Bottom) */}
                             <div className="bg-surface/30 border border-foreground/5 rounded-[2.5rem] p-8 backdrop-blur-sm shadow-xl flex flex-col gap-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                        <DollarSign className="text-emerald-400 w-6 h-6" />
                                    </div>
                                    <h4 className="text-xl font-bold text-foreground">Dividendes</h4>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Rendement</span>
                                        <span className={`text-2xl font-black ${metadata.divYield > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                                            {metadata.divYield > 0 ? `${metadata.divYield.toFixed(2)}%` : '-'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Montant Annuel</span>
                                        <span className={`text-xl font-black ${metadata.dividendRate > 0 ? 'text-foreground' : 'text-slate-500'}`}>
                                            {metadata.dividendRate > 0 ? formatCurrency(metadata.dividendRate, { currency: metadata.currency }) : '-'}
                                            {metadata.dividendRate > 0 && <span className="text-[10px] text-slate-500 font-medium lowercase ml-1">(brut)</span>}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Détachement</span>
                                        <span className={`text-sm font-bold ${metadata.exDividendDate && metadata.divYield > 0 ? 'text-foreground' : 'text-slate-500'}`}>
                                            {metadata.exDividendDate && metadata.divYield > 0 ? format(new Date(metadata.exDividendDate), 'dd MMM yyyy', { locale: fr }) : '-'}
                                        </span>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-foreground/5">
                                    <div className="bg-emerald-500/5 rounded-2xl p-4 border border-emerald-500/10">
                                        <p className="text-[10px] font-bold text-emerald-400/80 leading-relaxed uppercase tracking-widest text-center">
                                            {metadata.divYield > 4 ? 'Haut Rendement' : metadata.divYield > 0 ? 'Croissance Dividende' : 'Pas de Dividende'}
                                        </p>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>

                    {/* Fundamental Evolution Charts (Blurred for now) */}
                    <div className="mt-16 space-y-12 relative">
                        {/* Overlay for Restricted Content */}
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/5 backdrop-blur-[8px] rounded-[3rem] border border-white/5">
                            <div className="bg-surface/80 p-8 rounded-3xl border border-primary/20 shadow-2xl flex flex-col items-center gap-4 max-w-md text-center">
                                <div className="p-4 bg-primary/10 rounded-2xl">
                                    <ShieldCheck className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-black text-foreground uppercase tracking-tighter">Analyse Fondamentale Avancée</h3>
                                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                                    Les graphiques de rentabilité (ROIC, Marges) et l'allocation du capital seront bientôt disponibles via une connexion directe aux flux professionnels.
                                </p>
                                <div className="px-4 py-2 bg-primary/20 border border-primary/30 rounded-xl text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                                    Bientôt disponible
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 border-l-4 border-primary pl-6 opacity-40">
                            <h3 className="text-2xl font-black text-foreground tracking-tight">Évolution Fondamentale</h3>
                            <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">Performances historiques sur les dernières années</p>
                        </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Revenue & Net Income */}
                                <div className="bg-surface/30 border border-foreground/5 rounded-[2.5rem] p-8 backdrop-blur-sm shadow-xl">
                                    <h4 className="text-lg font-bold text-foreground mb-8 flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                        Chiffre d'Affaires & Résultat Net
                                    </h4>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer>
                                            <ComposedChart data={metadata.history}>
                                                <defs>
                                                    <linearGradient id="grad_revenue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.2} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                <XAxis dataKey="year" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1e9).toFixed(1)}B`} />
                                                <RechartsTooltip 
                                                    contentStyle={{ backgroundColor: 'rgb(var(--surface))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                                                    formatter={(val: any) => [formatCurrency(val, { currency: metadata.currency }), '']}
                                                />
                                                <Legend verticalAlign="top" height={36}/>
                                                <Bar dataKey="revenue" name="Chiffre d'Affaires" fill="url(#grad_revenue)" stroke="#6366f1" strokeWidth={1} radius={[4, 4, 0, 0]} barSize={40} />
                                                <Area type="monotone" dataKey="netIncome" name="Résultat Net" stroke="#10b981" fill="rgba(16, 185, 129, 0.1)" strokeWidth={3} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Free Cash Flow */}
                                <div className="bg-surface/30 border border-foreground/5 rounded-[2.5rem] p-8 backdrop-blur-sm shadow-xl">
                                    <h4 className="text-lg font-bold text-foreground mb-8 flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                                        Free Cash Flow (FCF)
                                    </h4>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer>
                                            <AreaChart data={metadata.history}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                <XAxis dataKey="year" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1e9).toFixed(1)}B`} />
                                                <RechartsTooltip 
                                                    contentStyle={{ backgroundColor: 'rgb(var(--surface))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                                                    formatter={(val: any) => [formatCurrency(val, { currency: metadata.currency }), '']}
                                                />
                                                <Area type="monotone" dataKey="fcf" name="Free Cash Flow" stroke="#60a5fa" fill="rgba(96, 165, 250, 0.1)" strokeWidth={3} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* ROIC Chart */}
                                <div className="bg-surface/30 border border-foreground/5 rounded-[2.5rem] p-8 backdrop-blur-sm shadow-xl">
                                    <h4 className="text-lg font-bold text-foreground mb-8 flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                                        Rentabilité du Capital (ROIC %)
                                    </h4>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer>
                                            <AreaChart data={metadata.history}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                <XAxis dataKey="year" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                                                <RechartsTooltip 
                                                    contentStyle={{ backgroundColor: 'rgb(var(--surface))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                                                    formatter={(val: any) => [`${parseFloat(val).toFixed(2)}%`, '']}
                                                />
                                                <Area type="monotone" dataKey="roic" name="ROIC" stroke="#fbbf24" fill="rgba(251, 191, 36, 0.1)" strokeWidth={3} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Capital Allocation (Buybacks & Dividends) */}
                                <div className="bg-surface/30 border border-foreground/5 rounded-[2.5rem] p-8 backdrop-blur-sm shadow-xl">
                                    <h4 className="text-lg font-bold text-foreground mb-8 flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        Allocation du Capital (Buybacks & Divi)
                                    </h4>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer>
                                            <ComposedChart data={metadata.history}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                <XAxis dataKey="year" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val / 1e6).toFixed(0)}M`} />
                                                <RechartsTooltip 
                                                    contentStyle={{ backgroundColor: 'rgb(var(--surface))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                                                    formatter={(val: any) => [formatCurrency(val, { currency: metadata.currency }), '']}
                                                />
                                                <Legend verticalAlign="top" height={36}/>
                                                <Bar dataKey="buybacks" name="Rachats d'Actions" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                                                <Bar dataKey="dividends" name="Dividendes Versés" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Margins Chart */}
                                <div className="bg-surface/30 border border-foreground/5 rounded-[2.5rem] p-8 backdrop-blur-sm shadow-xl">
                                    <h4 className="text-lg font-bold text-foreground mb-8 flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-pink-500" />
                                        Évolution des Marges (%)
                                    </h4>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer>
                                            <AreaChart data={metadata.history}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                <XAxis dataKey="year" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                                                <RechartsTooltip 
                                                    contentStyle={{ backgroundColor: 'rgb(var(--surface))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                                                    formatter={(val: any) => [`${parseFloat(val).toFixed(2)}%`, '']}
                                                />
                                                <Legend verticalAlign="top" height={36}/>
                                                <Area type="monotone" dataKey="opMargin" name="Marge Opérationnelle" stroke="#ec4899" fill="rgba(236, 72, 153, 0.1)" strokeWidth={3} />
                                                <Area type="monotone" dataKey="netMargin" name="Marge Nette" stroke="#10b981" fill="rgba(16, 185, 129, 0.05)" strokeWidth={3} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* ROE Chart */}
                                <div className="bg-surface/30 border border-foreground/5 rounded-[2.5rem] p-8 backdrop-blur-sm shadow-xl">
                                    <h4 className="text-lg font-bold text-foreground mb-8 flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                                        Rentabilité (ROE %)
                                    </h4>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer>
                                            <AreaChart data={metadata.history}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                                <XAxis dataKey="year" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
                                                <RechartsTooltip 
                                                    contentStyle={{ backgroundColor: 'rgb(var(--surface))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                                                    formatter={(val: any) => [`${parseFloat(val).toFixed(2)}%`, '']}
                                                />
                                                <Area type="monotone" dataKey="roe" name="ROE" stroke="#fbbf24" fill="rgba(251, 191, 36, 0.1)" strokeWidth={3} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col gap-2">
                        <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                            <Briefcase className="text-primary w-6 h-6" />
                            Vos Actifs en Portefeuille
                        </h3>
                        <p className="text-slate-500 text-sm font-medium">Sélectionnez l'un de vos titres pour une analyse approfondie.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {portfolioHoldings.filter(h => !h.symbol.startsWith('CASH:')).map((h, i) => (
                            <button
                                key={h.symbol + i}
                                onClick={() => handleSelect(h.symbol)}
                                className="group bg-surface/30 border border-foreground/10 rounded-3xl p-6 backdrop-blur-sm shadow-xl hover:border-primary/40 hover:bg-surface/50 transition-all duration-300 text-left relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-12 h-12 rounded-2xl bg-foreground/5 p-1.5 flex items-center justify-center border border-foreground/5 overflow-hidden group-hover:scale-110 transition-transform duration-500 relative">
                                        <img 
                                            src={getAssetLogoUrl(h.symbol, h.name)} 
                                            alt={h.symbol}
                                            className="w-full h-full object-contain relative z-10"
                                            onError={(e) => { 
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                const parent = (e.target as HTMLElement).parentElement;
                                                if (parent) {
                                                    const icon = parent.querySelector('.fallback-icon');
                                                    if (icon) (icon as HTMLElement).style.opacity = '1';
                                                }
                                            }}
                                        />
                                        <TrendingUp className="fallback-icon absolute w-6 h-6 text-slate-500/20 opacity-0 transition-opacity" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-black text-foreground text-lg group-hover:text-primary transition-colors">{h.symbol}</span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase truncate tracking-wider">{h.name}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Bottom Actions Floating Bar? Maybe not needed for now */}
        </div>
    );
}
