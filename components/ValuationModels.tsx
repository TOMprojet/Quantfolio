'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Calculator, 
    TrendingUp, 
    RefreshCcw, 
    Save, 
    Settings, 
    Info, 
    ChevronDown, 
    Check, 
    Activity, 
    Clock 
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { ASSET_NAMES } from '../lib/core/constants';
import { financeService, FundamentalData } from '../lib/finance/finance-service';
import { calculateModel } from '../lib/finance/valuation';
import DCFInputs from './valuation/DCFInputs';
import ValuationChart from './valuation/ValuationChart';
import { formatCurrency, getAssetLogoUrl } from '../lib/core/format-utils';

interface ValuationModelsProps {
    symbol: string;
    metadata: Record<string, any>;
    chartData: any[];
    watchlistData?: any[];
    userFairPrices?: Record<string, number>;
    onUpdateFairPrice?: (symbol: string, price: number) => void;
    onTickerChange?: (symbol: string) => void;
}

// ... (Rest of file unchanged until bottom)

// Fixing the bottom closing tags in a separate/subsequent chunk via string matching would be hard due to context. 
// I will target the imports first, then a separate call for the bottom to be safe? 
// No, I can't do two disjoint edits with `replace_file_content` unless I use `multi_replace`.
// I will use `replace_file_content` for imports first.

// Helper Component (Outside to prevent re-renders)
const InputField = ({ label, value, onChange, suffix, hint }: any) => (
    <div className="flex flex-col gap-1.5 mb-3">
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
        <div className="relative">
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-surface/50 border border-foreground/10 rounded-lg px-2 py-1.5 text-xs font-bold text-foreground focus:outline-none focus:border-primary transition-all pr-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-500">{suffix}</span>
        </div>
        {hint && <p className="text-[9px] text-slate-600 font-medium">{hint}</p>}
    </div>
);

export default function ValuationModels({
    symbol,
    metadata,
    chartData,
    watchlistData = [],
    userFairPrices = {},
    onUpdateFairPrice,
    onTickerChange
}: ValuationModelsProps) {
    const router = useRouter();
    const setSelectedValuationTicker = (sym: string) => {
        if (onTickerChange) {
            onTickerChange(sym);
        } else if (typeof window !== 'undefined') {
            window.location.href = `/valuation?ticker=${sym}`;
        }
    };
    const meta = metadata[symbol] || {};

    // Determine Currency Display
    const isCrypto = meta.sector === 'Crypto' || symbol.endsWith('-USD') || symbol.includes('BTC') || symbol.includes('ETH');
    const isEurStock = symbol.endsWith('.PA') || symbol.endsWith('.AS') || symbol.endsWith('.DE') || symbol.endsWith('.F') || symbol.endsWith('.MC') || symbol.endsWith('.LS') || symbol.endsWith('.MI') || symbol.endsWith('.BR');
    const currency = (isEurStock || meta.currency === 'EUR') ? '€' : '$';
    // --- State: EPS & FCF Params ---
    const [epsParams, setEpsParams] = useState<any>({
        baseValue: 0,
        growthRate: 0,
        terminalMultiple: 0,
        discountRate: 12
    });

    const [fcfParams, setFcfParams] = useState<any>({
        baseValue: 0,
        growthRate: 0,
        terminalMultiple: 0,
        discountRate: 12
    });

    const [modelType, setModelType] = useState<'double' | 'eps' | 'fcf'>('double');
    const [horizon, setHorizon] = useState(5);
    const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
    const [fundamentals, setFundamentals] = useState<FundamentalData | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);

    const currentPrice = meta.currentPrice || fundamentals?.price || 0;

    // Flag to avoid overwriting user edits with stale metadata
    const [isModified, setIsModified] = useState(false);

    // Initial Load from LocalStorage
    useEffect(() => {
        setIsModified(false);
        const saved = localStorage.getItem(`val_v2_${symbol}`);
        if (saved) {
            try {
                const p = JSON.parse(saved);
                setEpsParams(p.eps);
                setFcfParams(p.fcf);
                setHorizon(p.horizon || 5);
                setModelType(p.modelType || 'double');
                setIsModified(true); // Don't let metadata overwrite saved state
            } catch (e) {
                console.error("Error loading saved valuation", e);
            }
        }
    }, [symbol]);

    // Save to LocalStorage
    useEffect(() => {
        if (isModified) {
            const data = { eps: epsParams, fcf: fcfParams, horizon, modelType };
            localStorage.setItem(`val_v2_${symbol}`, JSON.stringify(data));
        }
    }, [epsParams, fcfParams, horizon, modelType, symbol, isModified]);

    // Async Data Fetching (Alpha Vantage/Service Data)
    useEffect(() => {
        const loadData = async () => {
            setAuthError(null);
            try {
                const data = await financeService.getFundamentals(symbol);
                setFundamentals(data);

                // Pre-filling DISABLED per user request
                /*
                if (data && !isModified) {
                    setEpsParams((prev: any) => ({
                        ...prev,
                        baseValue: data.eps || prev.baseValue,
                    }));
                    setFcfParams((prev: any) => ({
                        ...prev,
                        baseValue: data.fcf || prev.baseValue,
                    }));
                }
                */
            } catch (err: any) {
                if (err.message === 'TOKEN_LIMIT_REACHED') {
                    setAuthError("Limite d'appels API atteinte (Token Limit). Revenez plus tard.");
                }
            }
        };
        loadData();
    }, [symbol]);

    // Fallback Static Metadata Initialization (Only if not modified)
    // DISABLED per user request: "Mets juste tout vide"
    /*
    useEffect(() => {
        if (meta && !isModified) {
            setEpsParams((prev: any) => ({
                ...prev,
                baseValue: meta.eps || prev.baseValue,
                terminalMultiple: meta.trailingPE ? parseFloat(meta.trailingPE.toFixed(2)) : 15,
            }));
            setFcfParams((prev: any) => ({
                ...prev,
                baseValue: meta.fcfRaw && meta.sharesOutstanding
                    ? parseFloat((meta.fcfRaw / meta.sharesOutstanding).toFixed(2))
                    : (meta.fcf ? parseFloat(meta.fcf) : prev.baseValue),
            }));
        }
    }, [symbol, meta.symbol]); 
    */

    // --- Results ---
    const results = useMemo(() => {
        const epsRes = calculateModel(epsParams, horizon, false);
        const fcfRes = calculateModel(fcfParams, horizon, true);

        let fairPrice = 0;
        let futurePrice = 0;

        if (modelType === 'eps') {
            fairPrice = epsRes.fairPrice;
            futurePrice = epsRes.futurePrice;
        } else if (modelType === 'fcf') {
            fairPrice = fcfRes.fairPrice;
            futurePrice = fcfRes.futurePrice;
        } else {
            // Double
            fairPrice = (epsRes.fairPrice + fcfRes.fairPrice) / 2;
            futurePrice = (epsRes.futurePrice + fcfRes.futurePrice) / 2;
        }

        const mos = currentPrice > 0 ? ((fairPrice - currentPrice) / currentPrice) * 100 : 0;
        const impliedReturn = currentPrice > 0 ? (Math.pow(futurePrice / currentPrice, 1 / horizon) - 1) * 100 : 0;

        return { fairPrice, futurePrice, mos, impliedReturn, epsRes, fcfRes };
    }, [epsParams, fcfParams, horizon, currentPrice, modelType]);

    // --- Chart Data Logic (Complete Rewrite) ---
    const { finalChartData, ticks } = useMemo(() => {
        // 1. Safe Input Processing
        const rawHistory = Array.isArray(chartData) ? chartData : [];

        // 2. Extract Valid History Points
        // We map to a clean structure: { date: number, historicalPrice: number }
        const validHistory = rawHistory
            .map(d => {
                const ts = new Date(d.date).getTime();
                const v = d.close || d.adjClose || d.value || null;
                return { ts, v };
            })
            .filter(d => d.v !== null && !isNaN(d.v))
            .sort((a, b) => a.ts - b.ts);

        // If history is empty, seed it with current price generally or fail gracefully
        if (validHistory.length === 0 && currentPrice > 0) {
            validHistory.push({ ts: Date.now(), v: currentPrice });
        }

        const historyPoints = validHistory.map(d => ({
            date: d.ts,
            historicalPrice: d.v,
            forecastPrice: null, // History has no forecast
            fairValuePoint: null
        }));

        // 3. Determine "Now" (Transition Point)
        const lastHistoryPoint = historyPoints[historyPoints.length - 1] || { date: Date.now(), historicalPrice: currentPrice };
        const startDate = lastHistoryPoint.date;
        const startPrice = lastHistoryPoint.historicalPrice;

        const targetPrice = results.futurePrice;
        const fairValue = results.fairPrice;

        // 4. Create Transition Point
        // This point bridges the gap. It belongs to BOTH history (visually ending the area) and forecast (starting the line).
        const transitionPoint = {
            date: startDate,
            historicalPrice: startPrice, // End Area here
            forecastPrice: startPrice,   // Start Line here
            fairValuePoint: fairValue    // The SINGLE DOT location
        };

        // 5. Generate Projection Points
        const projectionPoints = [];
        const months = horizon * 12;

        for (let i = 1; i <= months; i++) {
            const nextDate = new Date(startDate);
            nextDate.setMonth(nextDate.getMonth() + i);
            const ts = nextDate.getTime();

            // Exponential Interpolation for Target Path
            const t = i / months;
            const price = startPrice * Math.pow(targetPrice / startPrice, t);

            projectionPoints.push({
                date: ts,
                historicalPrice: null, // No area in future
                forecastPrice: price,
                fairValuePoint: null
            });
        }

        // 6. Assembly
        // We replace the last history point with the Transition Point to ensure connectivity without duplication
        const historyMinusLast = historyPoints.slice(0, -1);
        const fullData = [...historyMinusLast, transitionPoint, ...projectionPoints];

        // 7. Tick Generation (Yearly)
        const minTime = fullData[0]?.date || Date.now();
        const maxTime = fullData[fullData.length - 1]?.date || Date.now();
        const startYear = new Date(minTime).getFullYear();
        const endYear = new Date(maxTime).getFullYear();

        const yearTicks = [];
        for (let y = startYear; y <= endYear; y++) {
            yearTicks.push(new Date(y, 0, 1).getTime());
        }

        return { finalChartData: fullData, ticks: yearTicks };
    }, [chartData, results, horizon, currentPrice]);

    const handleSave = async () => {
        // Optimistic UI update
        if (onUpdateFairPrice) onUpdateFairPrice(symbol, results.fairPrice);

        // Persist to Server
        try {
            await fetch('/api/user-fair-prices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol, price: results.fairPrice })
            });
            router.refresh();
        } catch (e) {
            console.error("Failed to save fair price", e);
        }

        setShowSaveConfirmation(true);
        setTimeout(() => setShowSaveConfirmation(false), 3000);
    };

    return (
        <div className="flex flex-col bg-transparent gap-6 relative">
            <AnimatePresence>
                {showSaveConfirmation && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 20, x: '-50%' }}
                        className="fixed bottom-10 left-1/2 z-[100] bg-surface/90 border border-emerald-500/30 text-emerald-400 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-md"
                    >
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <Check size={20} className="text-emerald-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground">Sauvegarde Effectuée</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* HEADER */}
            <div className="shrink-0 flex flex-col lg:flex-row items-start lg:items-center justify-between border-b border-white/5 pb-6 gap-6 lg:gap-0">
                <div className="flex flex-col gap-6 w-full lg:w-auto">
                    <div className="flex items-center gap-6">
                        {/* Asset Selector */}
                        <div className="relative group z-50 flex-grow sm:flex-grow-0">
                            <button className="flex items-center gap-4 text-left hover:opacity-80 transition-opacity group w-full">
                                {/* Main Logo */}
                                <div className="w-12 h-12 rounded-2xl bg-foreground/5 p-1.5 flex items-center justify-center overflow-hidden border border-foreground/10 shrink-0 shadow-inner relative">
                                    <img 
                                        src={getAssetLogoUrl(symbol, meta.name || symbol)} 
                                        alt={symbol} 
                                        className="w-full h-full object-contain relative z-10"
                                        onError={(e) => { 
                                            (e.target as HTMLImageElement).style.display = 'none'; 
                                            const fallback = (e.target as HTMLElement).nextElementSibling;
                                            if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                        }}
                                    />
                                    <TrendingUp className="hidden absolute w-8 h-8 text-slate-500/10" />
                                </div>

                                <div className="flex flex-col min-w-0">
                                    <span className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
                                        {symbol}
                                        <ChevronDown size={24} className="text-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
                                    </span>
                                    <span
                                        className="text-[10px] sm:text-sm font-bold text-slate-500 uppercase tracking-widest truncate max-w-[180px] sm:max-w-[300px] lg:max-w-md"
                                        title={ASSET_NAMES[symbol] || meta.name || symbol}
                                    >
                                        {ASSET_NAMES[symbol] || meta.name || symbol}
                                    </span>
                                </div>
                            </button>

                            <div className="absolute top-full left-0 mt-3 w-[300px] max-h-[400px] overflow-y-auto custom-scrollbar bg-surface/90 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 p-2 z-50">
                                {watchlistData.map((item: any) => {
                                    const itemMeta = metadata[item.symbol] || {};
                                    const metaName = itemMeta.name;
                                    const constName = ASSET_NAMES[item.symbol];
                                    const realName = constName || metaName || item.name || item.symbol;
                                    const showName = realName && realName !== item.symbol;

                                    return (
                                        <button
                                            key={item.symbol}
                                            onClick={() => setSelectedValuationTicker(item.symbol)}
                                            className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-white/10 transition-colors rounded-xl mb-1 last:mb-0 ${item.symbol === symbol ? 'bg-primary/10' : ''}`}
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-foreground/5 p-1 flex items-center justify-center overflow-hidden border border-foreground/5 shrink-0 relative">
                                                <img 
                                                    src={getAssetLogoUrl(item.symbol, realName)} 
                                                    alt={item.symbol} 
                                                    className="w-full h-full object-contain relative z-10"
                                                    onError={(e) => { 
                                                        (e.target as HTMLImageElement).style.display = 'none'; 
                                                        const fallback = (e.target as HTMLElement).nextElementSibling;
                                                        if (fallback) (fallback as HTMLElement).style.display = 'flex';
                                                    }}
                                                />
                                                <TrendingUp className="hidden absolute w-4 h-4 text-slate-500/20" />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className={`font-bold text-sm truncate ${item.symbol === symbol ? 'text-primary' : 'text-foreground'}`}>{item.symbol}</span>
                                                {showName && (
                                                    <span className="text-[10px] text-slate-500 font-medium uppercase truncate">{realName}</span>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Model Selector */}
                        <div className="relative group z-40 flex-shrink-0">
                            <button className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 hover:border-primary/40 text-primary text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap">
                                <Calculator size={12} />
                                <span className="hidden sm:inline">
                                    {modelType === 'double' ? 'Double Valorisation' :
                                        modelType === 'eps' ? 'Modèle EPS' : 'Modèle DCF'}
                                </span>
                                <span className="sm:hidden">
                                    {modelType === 'double' ? 'Double Val.' :
                                        modelType === 'eps' ? 'EPS' : 'DCF'}
                                </span>
                                <ChevronDown size={12} />
                            </button>

                            <div className="absolute top-full left-0 mt-2 w-56 bg-surface/90 backdrop-blur-xl border border-foreground/10 rounded-xl shadow-xl p-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <button
                                    onClick={() => setModelType('double')}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors ${modelType === 'double' ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:bg-white/5 hover:text-foreground'}`}
                                >
                                    Double Valorisation
                                    {modelType === 'double' && <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>}
                                </button>
                                <button
                                    onClick={() => setModelType('eps')}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors ${modelType === 'eps' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:bg-white/5 hover:text-foreground'}`}
                                >
                                    Modèle EPS
                                    {modelType === 'eps' && <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>}
                                </button>
                                <button
                                    onClick={() => setModelType('fcf')}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors ${modelType === 'fcf' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:bg-white/5 hover:text-foreground'}`}
                                >
                                    Modèle DCF
                                    {modelType === 'fcf' && <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-3 w-full lg:w-auto mt-4 lg:mt-0">
                    {/* 1. Fairness (The Anchor) */}
                    <div className="flex flex-col items-center justify-center min-w-0 px-3 sm:px-4 py-3 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 relative overflow-hidden group/kpi">
                        <div className="absolute inset-0 bg-primary/5 blur-xl group-hover/kpi:blur-2xl transition-all"></div>
                        <span className="text-[8px] sm:text-[10px] font-bold text-primary/80 uppercase tracking-widest mb-1 relative z-10">Prix Juste</span>
                        <span className="text-base sm:text-xl lg:text-2xl font-bold text-primary relative z-10 whitespace-nowrap">
                            {results.fairPrice.toFixed(2)} {currency}
                        </span>
                    </div>

                    {/* 1.5. Current Price (New) */}
                    <div className="flex flex-col items-center justify-center min-w-0 px-3 sm:px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-colors">
                        <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Prix Actuel</span>
                        <span className="text-base sm:text-lg lg:text-xl font-bold text-foreground whitespace-nowrap">{currentPrice.toFixed(2)} {currency}</span>
                    </div>

                    {/* 2. Safety (The Risk) */}
                    <div className="flex flex-col items-center justify-center min-w-0 px-3 sm:px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-colors">
                        <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Marge Séc.</span>
                        <span className={`text-base sm:text-lg lg:text-xl font-bold whitespace-nowrap ${results.mos > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {results.mos > 0 ? '+' : ''}{results.mos.toFixed(1)}%
                        </span>
                    </div>

                    {/* 3. Return (The Reward) */}
                    <div className="flex flex-col items-center justify-center min-w-0 px-3 sm:px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-colors">
                        <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">CAGR Est.</span>
                        <span className={`text-base sm:text-lg lg:text-xl font-bold whitespace-nowrap ${results.impliedReturn > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {results.impliedReturn > 0 ? '+' : ''}{results.impliedReturn.toFixed(2)}%
                        </span>
                    </div>

                    {/* 4. Target (The Future) */}
                    <div className="flex flex-col items-center justify-center min-w-0 px-3 sm:px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 hover:bg-white/[0.05] transition-colors">
                        <span className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Prix Final</span>
                        <span className="text-base sm:text-lg lg:text-xl font-bold text-foreground whitespace-nowrap">{results.futurePrice.toFixed(2)} {currency}</span>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT (Chart + Sidebar) - Natural Height */}
            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8 min-h-[480px]">

                {/* LEFT Sidebar - DCF Inputs */}
                <DCFInputs
                    symbol={symbol}
                    horizon={horizon}
                    setHorizon={setHorizon}
                    modelType={modelType}
                    epsParams={epsParams}
                    setEpsParams={setEpsParams}
                    fcfParams={fcfParams}
                    setFcfParams={setFcfParams}
                    setIsModified={setIsModified}
                    handleSave={handleSave}
                    results={results}
                    currency={currency}
                />

                {/* RIGHT: Chart */}
                <ValuationChart
                    symbol={symbol}
                    finalChartData={finalChartData}
                    ticks={ticks}
                    results={results}
                    currency={currency}
                />
            </div>

            {/* FUNDAMENTAL CONTEXT (Bottom Section) - Blurred for now */}
            <div className="shrink-0 pb-6 relative pt-0 mt-0">
                {/* Overlay for Restricted Content */}
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/5 backdrop-blur-[6px] rounded-[3rem] border border-white/5">
                    <div className="bg-surface/80 px-8 py-6 rounded-3xl border border-primary/20 shadow-2xl flex flex-col items-center gap-2 text-center">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Activity className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="text-sm font-black text-foreground uppercase tracking-tighter">Indicateurs Avancés</h3>
                        <p className="text-slate-400 text-[10px] font-medium max-w-[300px]">
                            Les indicateurs de rentabilité historique et de croissance prévisionnelle seront bientôt disponibles.
                        </p>
                    </div>
                </div>

                <div className="opacity-40 transition-all duration-500">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <Activity size={20} className="text-primary" />
                        <h3 className="font-bold text-foreground text-sm">Contexte Fondamental & Aide à la Décision</h3>
                    </div>


                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
                        {/* 1. Growth Engine */}
                        <div className="bg-surface/30 border border-foreground/5 rounded-3xl p-3 sm:p-5 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
                            <div className="flex items-center gap-3 mb-4">
                                <TrendingUp size={20} className="text-blue-400" />
                                <h3 className="font-bold text-foreground text-sm">Moteur de Croissance</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                {/* EPS Row */}
                                <div className="bg-foreground/[0.03] rounded-xl p-2 sm:p-3 border border-foreground/5 min-w-0">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">EPS (Actuel)</span>
                                    <span className="text-lg font-bold text-foreground">{fundamentals?.eps !== undefined ? fundamentals.eps : '-'} {currency}</span>
                                </div>
                                <div className="bg-foreground/[0.03] rounded-xl p-2 sm:p-3 border border-foreground/5 min-w-0">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">CAGR (5Y)</span>
                                    {fundamentals?.growth && fundamentals.growth.past5Y !== undefined ? (
                                        <span className={`text-lg font-bold ${fundamentals.growth.past5Y >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {fundamentals.growth.past5Y === 0 ? '-' : (
                                                <>{fundamentals.growth.past5Y > 0 ? '+' : ''}{fundamentals.growth.past5Y}%</>
                                            )}
                                        </span>
                                    ) : <span className="text-lg font-bold text-slate-500">-</span>}
                                </div>
                                <div className="bg-foreground/[0.03] rounded-xl p-2 sm:p-3 border border-foreground/5 min-w-0">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">CAGR Est. (5Y)</span>
                                    {fundamentals?.growth && fundamentals.growth.est5Y !== 0 ? (
                                        <span className="text-lg font-bold text-foreground">{fundamentals.growth.est5Y}%</span>
                                    ) : <span className="text-lg font-bold text-slate-500">-</span>}
                                </div>

                                {/* FCF Row */}
                                <div className="bg-foreground/[0.03] rounded-xl p-2 sm:p-3 border border-foreground/5 min-w-0">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">FCF/Share (Actuel)</span>
                                    <span className="text-lg font-bold text-foreground">{fundamentals?.fcf !== undefined ? fundamentals.fcf : '-'} {currency}</span>
                                </div>
                                <div className="bg-foreground/[0.03] rounded-xl p-2 sm:p-3 border border-foreground/5 min-w-0">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">CAGR (5Y)</span>
                                    {fundamentals?.growth?.fcfPast5Y !== undefined && fundamentals.growth.fcfPast5Y !== 0 ? (
                                        <span className={`text-lg font-bold ${fundamentals.growth.fcfPast5Y >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {fundamentals.growth.fcfPast5Y > 0 ? '+' : ''}{fundamentals.growth.fcfPast5Y}%
                                        </span>
                                    ) : <span className="text-lg font-bold text-slate-500">-</span>}
                                </div>
                                <div className="bg-foreground/[0.03] rounded-xl p-2 sm:p-3 border border-foreground/5 min-w-0">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">CAGR Est. (5Y)</span>
                                    {fundamentals?.growth?.fcfEst5Y !== undefined && fundamentals.growth.fcfEst5Y !== 0 ? (
                                        <span className="text-lg font-bold text-foreground">{fundamentals.growth.fcfEst5Y}%</span>
                                    ) : <span className="text-lg font-bold text-slate-500">-</span>}
                                </div>
                            </div>
                        </div>

                        {/* 2. Valuation History */}
                        <div className="bg-surface/30 border border-foreground/5 rounded-3xl p-3 sm:p-5 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300">
                            <div className="flex items-center gap-3 mb-4">
                                <Calculator size={20} className="text-purple-400" />
                                <h3 className="font-bold text-foreground text-sm">Niveaux de Valorisation</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                {/* PER Row */}
                                <div className="bg-foreground/[0.03] rounded-xl p-2 sm:p-3 border border-foreground/5 min-w-0">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">PER Actuel</span>
                                    <span className="text-lg font-bold text-foreground">
                                        {currentPrice && fundamentals?.eps
                                            ? (currentPrice / fundamentals.eps).toFixed(2)
                                            : '-'}
                                    </span>
                                </div>
                                <div className="bg-foreground/[0.03] rounded-xl p-2 sm:p-3 border border-foreground/5 min-w-0">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Moyenne 5Y</span>
                                    {fundamentals?.historicalPE ? (
                                        <span className="text-lg font-bold text-foreground">{fundamentals.historicalPE}</span>
                                    ) : <span className="text-lg font-bold text-slate-500">-</span>}
                                </div>
                                <div className="bg-foreground/[0.03] rounded-xl p-2 sm:p-3 border border-foreground/5 min-w-0">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Forward PE</span>
                                    {fundamentals?.forwardPE ? (
                                        <span className="text-lg font-bold text-foreground">{fundamentals.forwardPE?.toFixed(2)}</span>
                                    ) : <span className="text-lg font-bold text-slate-500">-</span>}
                                </div>

                                {/* FCF Row */}
                                <div className="bg-foreground/[0.03] rounded-xl p-2 sm:p-3 border border-foreground/5 min-w-0">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">P/FCF Actuel</span>
                                    <span className="text-lg font-bold text-foreground">
                                        {currentPrice && fundamentals?.fcf
                                            ? (currentPrice / fundamentals.fcf).toFixed(2)
                                            : '-'}
                                    </span>
                                </div>
                                <div className="bg-foreground/[0.03] rounded-xl p-2 sm:p-3 border border-foreground/5 min-w-0">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Moyenne 5Y</span>
                                    {fundamentals?.historicalPFCF ? (
                                        <span className="text-lg font-bold text-foreground">{fundamentals.historicalPFCF}</span>
                                    ) : <span className="text-lg font-bold text-slate-500">-</span>}
                                </div>
                                <div className="bg-foreground/[0.03] rounded-xl p-2 sm:p-3 border border-foreground/5 min-w-0">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Forward P/FCF</span>
                                    {fundamentals?.forwardPFCF ? (
                                        <span className="text-lg font-bold text-foreground">{fundamentals.forwardPFCF}</span>
                                    ) : <span className="text-lg font-bold text-slate-500">-</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
