'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Activity, ChevronDown, ChevronUp, Search, X, Trash2, ArrowUpDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { useRouter } from 'next/navigation';
import PageHeader from './ui/PageHeader';

import { FAIR_PRICES, FUNDAMENTALS, ASSET_NAMES, LOCAL_LOGOS } from '../lib/core/constants';
import { getAssetDisplayName } from '../lib/core/format-utils';
import ConfirmModal from './ConfirmModal';
import { useFormatting } from '@/hooks/useFormatting';

// Interface for WatchlistProps
interface WatchlistProps {
    currentHoldings: any[];
    watchlistTickers: string[];
    assetsHistory: Record<string, any[]>;
    globalChartData: any[]; // Fallback data
    userFairPrices?: Record<string, number>;
}

// Sub-component for individual items to handle local state (image error) correctly
const WatchlistItem = ({
    item,
    isExpanded,
    toggleExpand,
    assetMetadata,
    userFairPrices = {},
    assetsHistory,
    onDelete
}: any) => {
    // Independent Timeframe State
    const { formatCurrency } = useFormatting();
    const [timeframe, setTimeframe] = useState<'1M' | '6M' | '1Y' | 'YTD' | '5Y'>('5Y');
    const [imgError, setImgError] = useState(false);

    // X-Axis Formatter Logic 
    const xAxisFormatter = (tickItem: any) => {
        if (!tickItem) return '';
        const d = (tickItem instanceof Date) ? tickItem : parseISO(tickItem);
        if (timeframe === '1M') return format(d, 'dd/MM');
        if (timeframe === '6M' || timeframe === 'YTD' || timeframe === '1Y') return format(d, 'MMM');
        return format(d, 'yyyy');
    };

    // Data Setup
    const symbol = (typeof item === 'object' && item.symbol) ? item.symbol : (typeof item === 'string' ? item : item.name);
    const holding = typeof item === 'object' && item.isHolding ? item : null;

    useEffect(() => { setImgError(false); }, [symbol]);

    // Metadata & Naming
    const meta = assetMetadata[symbol] || {};
    const isCrypto = (symbol.includes('-USD') || (meta.sector === 'Crypto')) && !symbol.includes('.');
    const fullName = getAssetDisplayName(symbol, meta, isCrypto);
    const displaySymbol = isCrypto ? symbol.replace('-USD', '') : symbol;

    // Logo Logic
    let logoUrl = '';
    if (isCrypto) {
        const cryptoSymbol = symbol.toLowerCase().replace('usdt', 'usdt').replace('-usd', '');
        logoUrl = `https://assets.coincap.io/assets/icons/${cryptoSymbol}@2x.png`;
        if (cryptoSymbol === 'btc') logoUrl = 'https://assets.coincap.io/assets/icons/btc@2x.png';
    } else {
        const symbolKey = symbol.replace(/\..*$/, '');
        const localFile = LOCAL_LOGOS[symbolKey] || LOCAL_LOGOS[symbol];
        if (localFile) {
            logoUrl = `/logo/${localFile}`;
        } else {
            const nameBase = (meta.name || symbol).split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
            logoUrl = `https://logo.clearbit.com/${nameBase}.com`;
        }
    }
    const hasLogo = !imgError && logoUrl;

    // Price Logic & Currency Conversion
    let priceFromMeta = meta.currentPrice || 0;
    let rawCurrency = meta.currency || 'USD';

    if (isCrypto) {
        const eurUsdRate = assetMetadata['EURUSD=X']?.currentPrice || 1.05;
        if (symbol.endsWith('-USD') || rawCurrency === 'USD') {
            if (priceFromMeta > 0) priceFromMeta = priceFromMeta / eurUsdRate;
            rawCurrency = 'EUR';
        }
    }

    const formatNum = (n: number | undefined) => {
        if (!n) return undefined;
        if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
        if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return n.toFixed(0);
    };

    let marketCapVal = meta.marketCap || 0;
    if (isCrypto && marketCapVal > 0) {
        const eurUsdRate = assetMetadata['EURUSD=X']?.currentPrice || 1.05;
        marketCapVal = marketCapVal / eurUsdRate;
    }
    const formattedMarketCap = formatNum(marketCapVal);

    const currentPrice = priceFromMeta > 0 ? priceFromMeta : (holding ? (holding.nativePrice || (holding.quantity ? holding.value / holding.quantity : 0)) : 0);
    const fairPrice = userFairPrices[symbol] ?? FAIR_PRICES[symbol] ?? 0;

    // Performance based indicator for Crypto Trend
    const athPrice = useMemo(() => {
        if (!isCrypto) return 0;
        const assetHist = assetsHistory[symbol] || [];
        const historyMax = assetHist.length > 0 ? Math.max(...assetHist.map((pt: any) => pt.close)) : 0;
        return Math.max(currentPrice, historyMax);
    }, [isCrypto, assetsHistory, symbol, currentPrice]);

    const athDistance = useMemo(() => {
        if (!isCrypto || athPrice === 0) return 0;
        return ((currentPrice - athPrice) / athPrice) * 100;
    }, [isCrypto, currentPrice, athPrice]);

    const margin = currentPrice > 0 ? ((fairPrice - currentPrice) / currentPrice) * 100 : 0;
    const isSafe = margin > 0;

    // Chart Data Helper
    const getChartData = () => {
        const assetHist = assetsHistory[symbol] || [];
        if (assetHist.length === 0) return [];

        let allPoints = [...assetHist];
        const now = new Date();
        let startDate: Date | null = null;

        if (timeframe === '1M') startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        else if (timeframe === '6M') startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        else if (timeframe === '1Y') startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        else if (timeframe === 'YTD') startDate = new Date(now.getFullYear(), 0, 1);
        else if (timeframe === '5Y') {
            const fiveYearsAgo = new Date();
            fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
            startDate = fiveYearsAgo;
        }

        let filteredAsset = allPoints;
        if (startDate) {
            // Find the index of the first point >= startDate
            const firstIdx = allPoints.findIndex((pt: any) => new Date(pt.date) >= startDate!);
            if (firstIdx !== -1) {
                // Include one point BEFORE the start date to serve as the baseline for performance
                const startIdx = Math.max(0, firstIdx - 1);
                filteredAsset = allPoints.slice(startIdx);
            }
        }

        return filteredAsset.map((pt: any) => ({
            date: pt.date,
            value: pt.close
        }));
    };

    const itemChartData = isExpanded ? getChartData() : [];
    const performance = useMemo(() => {
        if (itemChartData.length < 2) return 0;
        const start = itemChartData[0].value;
        const end = itemChartData[itemChartData.length - 1].value;
        return start > 0 ? ((end - start) / start) * 100 : 0;
    }, [itemChartData]);

    const formatToken = (n: number | undefined) => {
        if (!n || n === 0) return undefined;
        if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
        if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
        if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
        if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
        return n.toLocaleString();
    };

    const fund = {
        per: meta.trailingPE ? meta.trailingPE.toFixed(1) : undefined,
        divYield: meta.dividendYield !== undefined ? meta.dividendYield.toFixed(2) : undefined,
        marketCap: formattedMarketCap,
        fdv: isCrypto ? formatNum((meta.fdv || 0) / (assetMetadata['EURUSD=X']?.currentPrice || 1.05)) : undefined,
        totalTokens: formatToken(meta.totalTokens),
        maxTokens: (isCrypto && (symbol === 'ETH' || symbol.startsWith('ETH-'))) ? '∞' : formatToken(meta.maxSupply),
        circulating: formatToken(meta.circulatingSupply),
        circPct: meta.circulatingPercentage !== undefined ? meta.circulatingPercentage.toFixed(1) : undefined
    };

    return (
        <motion.div layout className="rounded-xl overflow-hidden bg-surface/40 backdrop-blur-md border border-foreground/5 hover:border-foreground/10 transition-colors">
            <div
                onClick={() => toggleExpand(symbol)}
                className="p-4 flex items-center justify-between cursor-pointer group select-none"
            >
                <div className="flex items-center gap-4">
                    {hasLogo ? (
                        <img
                            src={logoUrl}
                            alt={displaySymbol}
                            className="w-10 h-10 rounded-lg object-contain bg-white/5 p-1"
                            onError={() => setImgError(true)}
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${isExpanded ? 'bg-primary/20 text-primary border-primary/20' : 'bg-white/5 text-slate-400 border-white/10'}`}>
                            <Activity size={16} className="opacity-20" />
                        </div>
                    )}
                    <div>
                        <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{displaySymbol}</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest truncate max-w-[200px] sm:max-w-md">{fullName}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <span className="text-sm font-bold text-foreground block">{formatCurrency(currentPrice, { currency: rawCurrency })}</span>
                        {isCrypto ? (
                            athDistance === 0 ? (
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-tighter">
                                    NOUVEAU ATH
                                </span>
                            ) : (
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                    ATH {athDistance.toFixed(1)}%
                                </span>
                            )
                        ) : (
                            margin !== 0 && (
                                <span className={`text-[10px] font-bold ${margin > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {margin > 0 ? '+' : ''}{margin.toFixed(1)}%
                                </span>
                            )
                        )}
                    </div>

                    <div className="hidden sm:block">
                        {isCrypto ? (
                            performance > 0 ? (
                                <span className="px-3 py-1 rounded text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">HAUSSIER</span>
                            ) : (
                                <span className="px-3 py-1 rounded text-xs font-bold bg-orange-500/20 text-orange-400 border border-orange-500/20">BAISSIER</span>
                            )
                        ) : (
                            margin > 0 ? (
                                <span className="px-3 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">ACHETER</span>
                            ) : margin < 0 ? (
                                <span className="px-3 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/20">ATTENDRE</span>
                            ) : (
                                <span className="px-3 py-1 rounded text-xs font-bold bg-slate-500/20 text-slate-400 border border-slate-500/20">NEUTRE</span>
                            )
                        )}
                    </div>

                    {onDelete && (
                        <div
                            onClick={(e) => { e.stopPropagation(); onDelete(symbol); }}
                            className="p-2 -mr-2 text-slate-600 hover:text-red-400 transition-colors cursor-pointer hover:bg-white/5 rounded-lg"
                        >
                            <Trash2 size={16} />
                        </div>
                    )}

                    <div className={`text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : ''}`}>
                        <ChevronDown size={20} />
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <div className="p-6 pt-0 border-t border-foreground/5">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                                <div className="lg:col-span-4 space-y-4">
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400 text-sm font-medium">Prix Actuel</span>
                                            <span className="text-xl font-bold text-foreground">{formatCurrency(currentPrice, { currency: rawCurrency })}</span>
                                        </div>
                                        {isCrypto ? (
                                            <>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400 text-sm font-medium">Market Cap</span>
                                                    <span className="text-lg font-bold text-foreground">{formatCurrency(marketCapVal, { currency: rawCurrency })}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400 text-sm font-medium">Fully Diluted Valuation</span>
                                                    <span className="text-lg font-bold text-foreground/80">{formatCurrency(fund.fdv || 0, { currency: rawCurrency })}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400 text-sm font-medium">Prix Juste</span>
                                                    <span className="text-xl font-bold text-foreground/80">{formatCurrency(fairPrice, { currency: rawCurrency })}</span>
                                                </div>
                                                <div className="h-px bg-white/10"></div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-slate-400 text-sm font-medium">Marge de Sécurité</span>
                                                    <span className={`text-xl font-bold ${isSafe ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {margin > 0 ? '+' : ''}{margin.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {isCrypto ? (
                                            <>
                                                <div className="p-3 bg-white/5 rounded-lg text-center border border-white/5">
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Max Supply</p>
                                                    <p className="text-sm font-bold text-foreground">{fund.maxTokens || '-'}</p>
                                                </div>
                                                <div className="p-3 bg-white/5 rounded-lg text-center border border-white/5">
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Total Supply</p>
                                                    <p className="text-sm font-bold text-foreground">{fund.totalTokens || '-'}</p>
                                                </div>
                                                <div className="p-3 bg-white/5 rounded-lg text-center border border-white/5">
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">In Circulation</p>
                                                    <p className="text-sm font-bold text-emerald-400">{fund.circulating || '-'}</p>
                                                </div>
                                                <div className="p-3 bg-white/5 rounded-lg text-center border border-white/5">
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">% Circulating</p>
                                                    <p className="text-sm font-bold text-foreground">{fund.circPct ? fund.circPct + '%' : '-'}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="p-3 bg-white/5 rounded-lg text-center border border-white/5">
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">P/E Ratio</p>
                                                    <p className="text-sm font-bold text-foreground">{fund.per || '-'}</p>
                                                </div>
                                                <div className="p-3 bg-white/5 rounded-lg text-center border border-white/5">
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Dividend Yield</p>
                                                    <p className="text-sm font-bold text-emerald-400">{fund.divYield ? fund.divYield + '%' : '-'}</p>
                                                </div>
                                                <div className="p-3 bg-white/5 rounded-lg text-center border border-white/5 col-span-2">
                                                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">MARKET CAP</p>
                                                    <p className="text-sm font-bold text-foreground">{fund.marketCap || '-'}</p>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="lg:col-span-8 bg-surface/20 rounded-xl p-4 border border-foreground/5">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                                                <Activity size={14} className="text-primary" /> Performance
                                            </h4>
                                            {itemChartData.length > 0 && (
                                                <span className={`text-xs font-bold ${performance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {performance >= 0 ? '+' : ''}{performance.toFixed(2)}%
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex bg-surface/50 rounded-lg p-1 border border-foreground/10 shadow-inner">
                                            {['1M', '6M', '1Y', 'YTD', '5Y'].map(tf => (
                                                <button
                                                    key={tf}
                                                    onClick={(e) => { e.stopPropagation(); setTimeframe(tf as any); }}
                                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all duration-200 ${timeframe === tf
                                                        ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                                                        : 'text-slate-500 hover:text-slate-300 border border-transparent'
                                                        }`}
                                                >
                                                    {tf}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="h-[200px] w-full">
                                        <ResponsiveContainer>
                                            <AreaChart data={itemChartData}>
                                                <defs>
                                                    <linearGradient id={`grad_${symbol}`} x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <XAxis
                                                    dataKey="date"
                                                    stroke="#475569"
                                                    fontSize={9}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickFormatter={xAxisFormatter}
                                                    ticks={(() => {
                                                        if (itemChartData.length === 0) return undefined;
                                                        if (timeframe === '1M') return undefined;
                                                        const ticks: string[] = [];
                                                        let lastLabel = '';
                                                        itemChartData.forEach((point: any) => {
                                                            const d = (point.date instanceof Date) ? point.date : parseISO(point.date);
                                                            let label = (timeframe === '5Y') ? format(d, 'yyyy') : format(d, 'MMM yyyy');
                                                            if (label !== lastLabel) {
                                                                ticks.push(point.date);
                                                                lastLabel = label;
                                                            }
                                                        });
                                                        return ticks;
                                                    })()}
                                                    interval={0}
                                                />
                                                <YAxis
                                                    stroke="#475569"
                                                    fontSize={9}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    domain={['auto', 'auto']}
                                                    tickFormatter={(val) => `${parseInt(val)}${rawCurrency === 'USD' ? '$' : (rawCurrency === 'EUR' ? '€' : rawCurrency)}`}
                                                />
                                                <RechartsTooltip
                                                    contentStyle={{ 
                                                        backgroundColor: 'rgb(var(--surface))', 
                                                        border: '1px solid rgb(var(--foreground) / 0.1)', 
                                                        borderRadius: '8px', 
                                                        fontSize: '12px',
                                                        color: 'rgb(var(--foreground))'
                                                    }}
                                                    labelFormatter={(l) => format((l instanceof Date) ? l : parseISO(l), 'dd MMM yyyy')}
                                                    formatter={(val: any) => [`${parseFloat(val).toFixed(2)} ${rawCurrency === 'USD' ? '$' : (rawCurrency === 'EUR' ? '€' : rawCurrency)}`, 'Prix']}
                                                />
                                                <Area
                                                    type="monotone"
                                                    dataKey="value"
                                                    stroke="#8b5cf6"
                                                    strokeWidth={2}
                                                    fill={`url(#grad_${symbol})`}
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default function Watchlist({ currentHoldings = [], watchlistTickers = [], assetsHistory, globalChartData, assetMetadata, userFairPrices = {} }: WatchlistProps & { assetMetadata: Record<string, any> }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const [sortBy, setSortBy] = useState<string>('none');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [localTickers, setLocalTickers] = useState<string[]>(watchlistTickers);
    const router = useRouter();

    // Sync local state when props change
    useEffect(() => {
        setLocalTickers(watchlistTickers);
    }, [watchlistTickers]);

    // Deletion Modal State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; symbol: string }>({
        isOpen: false,
        symbol: ''
    });

    const allWatchListItems = useMemo(() => {
        const eurUsdRate = assetMetadata['EURUSD=X']?.currentPrice || 1.05;

        const items = localTickers.map(t => {
            const meta = assetMetadata[t] || {};
            const holding = currentHoldings.find(h => h.symbol === t);

            // Logic duplicated from WatchlistItem for accurate sorting
            let priceFromMeta = meta.currentPrice || 0;
            const isCrypto = (t.includes('-USD') || (meta.sector === 'Crypto')) && !t.includes('.');

            let currentPrice = priceFromMeta > 0 ? priceFromMeta : (holding ? (holding.nativePrice || (holding.quantity ? holding.value / holding.quantity : 0)) : 0);

            // Convert to EUR for consistent sorting
            let sortPrice = currentPrice;
            if (isCrypto && (t.endsWith('-USD') || meta.currency === 'USD')) {
                sortPrice = sortPrice / eurUsdRate;
            } else if (meta.currency === 'USD') {
                sortPrice = sortPrice / eurUsdRate;
            }

            const fairPrice = userFairPrices[t] ?? FAIR_PRICES[t] ?? 0;
            const margin = currentPrice > 0 ? ((fairPrice - currentPrice) / currentPrice) * 100 : 0;

            // ATH for Crypto Sorting
            let athVal = 0;
            if (isCrypto) {
                const hist = assetsHistory[t] || [];
                const histMax = hist.length > 0 ? Math.max(...hist.map((p: any) => p.close)) : 0;
                const trueAth = Math.max(sortPrice, histMax); // Use sortPrice (EUR) for consistency
                athVal = trueAth > 0 ? ((sortPrice - trueAth) / trueAth) * 100 : 0;
            }

            const itemContent = holding ? { ...holding, isHolding: true } : {
                name: t,
                symbol: t,
                isHolding: false,
                nativePrice: meta.currentPrice || 0,
                currency: meta.currency || 'USD',
            };

            return {
                symbol: t,
                name: meta.name || t,
                currentPrice: sortPrice, // In EUR
                fairPrice,
                margin: isCrypto ? athVal : margin, // Use ATH Distance for crypto sorting if needed, or keep margin
                originalItem: itemContent
            };
        });

        // Apply Sorting
        if (sortBy === 'none') return items.map(i => i.originalItem);

        const sorted = [...items].sort((a, b) => {
            let valA: any = 0;
            let valB: any = 0;

            // Handle Crypto exclusion for stock-specific metrics
            if (sortBy === 'fair' || sortBy === 'margin') {
                const isCryptoA = a.symbol.includes('-USD') || (assetMetadata[a.symbol]?.sector === 'Crypto');
                const isCryptoB = b.symbol.includes('-USD') || (assetMetadata[b.symbol]?.sector === 'Crypto');

                if (isCryptoA && !isCryptoB) return 1; // Alpha at the end
                if (!isCryptoA && isCryptoB) return -1; // Alpha at the beginning
                if (isCryptoA && isCryptoB) return 0; // Don't sort between cryptos for these metrics
            }

            if (sortBy === 'name') {
                valA = a.symbol;
                valB = b.symbol;
            } else if (sortBy === 'price') {
                valA = a.currentPrice;
                valB = b.currentPrice;
            } else if (sortBy === 'fair') {
                valA = a.fairPrice;
                valB = b.fairPrice;
            } else if (sortBy === 'margin') {
                valA = a.margin;
                valB = b.margin;
            }

            if (typeof valA === 'string') {
                return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortDirection === 'asc' ? valA - valB : valB - valA;
        });

        return sorted.map(i => i.originalItem);
    }, [watchlistTickers, currentHoldings, assetMetadata, userFairPrices, sortBy, sortDirection]);

    const filteredItems = useMemo(() => {
        if (!searchQuery) return allWatchListItems;
        const lowerQ = searchQuery.toLowerCase();
        return allWatchListItems.filter(item => {
            const sym = (typeof item === 'object' && item.symbol) ? item.symbol : (typeof item === 'string' ? item : item.name);
            const nameFromConst = ASSET_NAMES[sym] || '';
            const metaName = assetMetadata[sym]?.name || '';
            return sym.toLowerCase().includes(lowerQ) ||
                nameFromConst.toLowerCase().includes(lowerQ) ||
                metaName.toLowerCase().includes(lowerQ);
        });
    }, [allWatchListItems, searchQuery, assetMetadata]);

    const handleDelete = async (symbol: string) => {
        setDeleteModal({ isOpen: true, symbol });
    };

    const confirmDelete = async () => {
        const symbol = deleteModal.symbol;
        // Optimistic update
        setLocalTickers(prev => prev.filter(t => t !== symbol));
        setDeleteModal({ isOpen: false, symbol: '' });

        try {
            const res = await fetch('/api/watchlist', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol })
            });
            if (res.ok) {
                // Background refresh to sync any server-side changes
                router.refresh();
            } else {
                // Revert on error
                setLocalTickers(watchlistTickers);
            }
        } catch (e) {
            console.error(e);
            setLocalTickers(watchlistTickers);
        }
    };

    const toggleExpand = (symbol: string) => {
        const newSet = new Set(expandedItems);
        if (newSet.has(symbol)) newSet.delete(symbol);
        else newSet.add(symbol);
        setExpandedItems(newSet);
    };

    const expandAll = () => {
        const allSymbols = filteredItems.map(item => (typeof item === 'object' && item.symbol) ? item.symbol : (typeof item === 'string' ? item : item.name));
        setExpandedItems(new Set(allSymbols));
    };

    const collapseAll = () => setExpandedItems(new Set());

    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar bg-background text-foreground">
            <div className="p-4 sm:p-8 lg:p-10 2xl:p-14 3xl:p-20 space-y-8 sm:space-y-12">
                <PageHeader
                    title={
                        <div className="flex items-center gap-2 sm:gap-3">
                            Watchlist
                            <span className="text-[10px] sm:text-sm font-bold bg-primary/20 text-primary px-2 sm:px-3 py-0.5 rounded-full border border-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                                {allWatchListItems.length} Actifs
                            </span>
                        </div>
                    }
                    subtitle="Suivez vos actifs favoris et identifiez les opportunités d'investissement."
                    icon={FileText}
                    rightContent={
                        <div className="flex flex-col xl:flex-row gap-3 relative z-20 w-full xl:w-auto mt-4 md:mt-0">
                            <div className="flex flex-wrap gap-3 justify-start md:justify-end">
                                {/* Sort Dropdown */}
                                <div className="relative group/sort flex-1 sm:flex-none">
                                    <button className="flex items-center gap-2 px-4 py-2 bg-foreground/5 border border-foreground/5 rounded-xl text-xs font-bold text-slate-400 hover:text-foreground hover:border-primary/50 transition-all h-full min-w-[120px] w-full sm:w-auto">
                                        <ArrowUpDown size={14} className={sortBy !== 'none' ? 'text-primary' : ''} />
                                        <span className="flex-1 text-left">
                                            {sortBy === 'none' ? 'Trier par' : (
                                                sortBy === 'name' ? 'Nom' :
                                                    sortBy === 'price' ? 'Prix' :
                                                        sortBy === 'fair' ? 'Prix Juste' : 'Marge'
                                            )}
                                        </span>
                                        <ChevronDown size={14} className="group-hover/sort:rotate-180 transition-transform" />
                                    </button>

                                    <div className="absolute top-full right-0 mt-2 w-48 bg-background/95 backdrop-blur-xl border border-foreground/10 rounded-xl shadow-2xl opacity-0 invisible group-hover/sort:opacity-100 group-hover/sort:visible transition-all duration-200 z-50 p-1">
                                        {[
                                            { id: 'none', label: 'Aucun' },
                                            { id: 'name', label: 'Nom (Ticker)' },
                                            { id: 'price', label: 'Prix Actuel' },
                                            { id: 'fair', label: 'Prix Juste' },
                                            { id: 'margin', label: 'Marge de Sécurité' }
                                        ].map(opt => (
                                            <button
                                                key={opt.id}
                                                onClick={() => {
                                                    if (sortBy === opt.id) {
                                                        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                                                    } else {
                                                        setSortBy(opt.id);
                                                        setSortDirection('desc');
                                                    }
                                                }}
                                                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${sortBy === opt.id ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:bg-white/5 hover:text-foreground'}`}
                                            >
                                                {opt.label}
                                                {sortBy === opt.id && (
                                                    <span className="text-[10px] bg-primary/20 px-1.5 py-0.5 rounded uppercase">{sortDirection}</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="relative group flex-1 sm:flex-none">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Rechercher..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10 pr-10 py-2 bg-foreground/5 border border-foreground/5 rounded-xl text-foreground placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:bg-foreground/10 transition-all w-full sm:w-48 lg:w-64"
                                    />
                                    {searchQuery && (
                                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-foreground">
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                                <div className="flex bg-foreground/5 rounded-xl p-1 border border-foreground/5 shadow-lg flex-1 sm:flex-none justify-evenly">
                                    <button
                                        onClick={expandAll}
                                        className={`px-3 lg:px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${expandedItems.size === filteredItems.length && filteredItems.length > 0
                                            ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_20px_rgba(139,92,246,0.15)] scale-[1.02]'
                                            : 'text-slate-500 hover:text-foreground'
                                            }`}
                                    >
                                        Tout Dérouler
                                    </button>
                                    <div className="w-px bg-foreground/5 my-2 mx-1"></div>
                                    <button
                                        onClick={collapseAll}
                                        className={`px-3 lg:px-4 py-2 rounded-lg text-xs font-bold transition-all duration-300 ${expandedItems.size === 0
                                            ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_20px_rgba(139,92,246,0.15)] scale-[1.02]'
                                            : 'text-slate-500 hover:text-foreground'
                                            }`}
                                    >
                                        Tout Réduire
                                    </button>
                                </div>
                            </div>
                        </div>
                    }
                />

            <div className="space-y-4">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-20 text-slate-500 italic">
                        Aucun résultat pour "{searchQuery}"
                    </div>
                ) : (
                    filteredItems.map((item, idx) => (
                        <WatchlistItem
                            key={idx}
                            item={item}
                            isExpanded={expandedItems.has(item.symbol || item.name)}
                            toggleExpand={toggleExpand}
                            assetMetadata={assetMetadata}
                            userFairPrices={userFairPrices}
                            assetsHistory={assetsHistory}
                            onDelete={handleDelete}
                        />
                    ))
                )}
            </div>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                title="Supprimer des favoris"
                message={`Êtes-vous sûr de vouloir retirer ${deleteModal.symbol} de votre watchlist ?`}
                confirmLabel="Supprimer"
                onConfirm={confirmDelete}
                onCancel={() => setDeleteModal({ isOpen: false, symbol: '' })}
                isDanger={true}
            />
        </div>
    </div>
);
}
