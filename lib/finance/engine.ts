import fs from 'fs';
import path from 'path';
import { startOfDay, addDays, format, subDays, differenceInDays } from 'date-fns';
import { getHistoricalPrices, BENCHMARK_TICKERS, AssetMetadata } from './market-data-service';
import { UnifiedTransaction } from '../parsers/importers/types';
import { classifyAsset } from './classifier';

import { SettingsStore } from '../core/persistence/settings-store';
import { FinanceSettings } from '../core/types/settings';

export interface DailyMetric {
    date: string;
    totalValue: number;
    twr: number;
    twrCrypto?: number;
    twrStocks?: number;
    cashBalance: number;
    investedCapital: number;
    unrealizedPnl: number;
    benchmarks: Record<string, number>;
    assetValues?: Record<string, number>;
    assetFlows?: Record<string, number>;
}

export interface FinalHolding {
    name: string;
    symbol: string;
    value: number;
    quantity: number;
    pru: number;
    pruEur: number;
    cagr: number;
    pnl: number;
    pnlNative: number;
    performance: number;
    firstBuyDate?: string;
    currentPrice: number;
    nativePrice: number; // For backward compatibility
    nativeCurrency: string;
    currency: string;
}

export interface ClosedHolding {
    name: string;
    symbol: string;
    realizedPnl: number;
    performance: number;
    firstBuyDate?: string;
    lastSellDate?: string;
}

export interface PerformanceResult {
    metrics: DailyMetric[];
    currentHoldings: FinalHolding[];
    closedHoldings: ClosedHolding[];
    missingAssets: { symbol: string, quantity: number, isStablecoin: boolean }[];
    dividendsTotal: number;
}


export async function calculatePerformance(
    transactions: UnifiedTransaction[],
    fallbackPrices: Record<string, number> = {},
    assetMetadata: Record<string, AssetMetadata> = {},
    manualCostBasis: Record<string, { date: string, price: number }> = {}
): Promise<PerformanceResult> {
    const settings = SettingsStore.load();
    if (!transactions.length) {
        return { metrics: [], currentHoldings: [], closedHoldings: [], missingAssets: [], dividendsTotal: 0 };
    }

    // 0. SANITIZE
    const enrichedTransactions = transactions.map(t => {
        const d = (t.date instanceof Date) ? t.date : new Date(t.date);
        const qty = t.quantity || 0;
        const price = t.price || 0;
        const symbol = t.symbol || '';

        return {
            ...t,
            date: d,
            quantity: qty,
            price: price,
            symbol: symbol,
            currency: t.currency || 'EUR',
            amount: t.amount
        };
    });

    const sortedTx = enrichedTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());
    let startDt = startOfDay(sortedTx[0].date);
    const endDt = startOfDay(new Date());

    if (startDt.getTime() >= endDt.getTime()) {
        startDt = subDays(endDt, 1);
    }

    const portfolioSymbols = Array.from(new Set(sortedTx
        .filter(t => t.symbol && !t.symbol.toUpperCase().startsWith('CASH') && !t.symbol.includes('EUR.USD'))
        .map(t => t.symbol)));

    const allSymbols = Array.from(new Set([...portfolioSymbols, ...BENCHMARK_TICKERS, 'EURUSD=X']));
    const rawPrices = await getHistoricalPrices(allSymbols, startDt, endDt);

    const lookup: Record<string, Record<string, number>> = {};
    Object.entries(rawPrices).forEach(([sym, history]) => {
        lookup[sym] = {};
        history.forEach(p => {
            // Use ISO string date part to avoid timezone shifts
            const dKey = p.date instanceof Date ? p.date.toISOString().substring(0, 10) : p.date.substring(0, 10);
            lookup[sym][dKey] = p.close || p.adjClose || p.value;
        });
    });

    const todayStr = format(endDt, 'yyyy-MM-dd');
    Object.entries(fallbackPrices).forEach(([sym, price]) => {
        if (!lookup[sym]) lookup[sym] = {};
        if (!lookup[sym][todayStr] || lookup[sym][todayStr] === 0) {
            lookup[sym][todayStr] = price;
        }
    });

    // GROUP TRANSACTIONS BY DATE (O(T))
    const txByDate: Record<string, UnifiedTransaction[]> = {};
    sortedTx.forEach(t => {
        const dStr = format(t.date, 'yyyy-MM-dd');
        if (!txByDate[dStr]) txByDate[dStr] = [];
        txByDate[dStr].push(t);
    });

    let currDate = startDt;
    const cashBalances: Record<string, number> = {};
    let investedCapital = 0;
    let cumTwr = 1;
    let prevEquity = 0;

    // Sub-portfolio State
    let cumTwrCrypto = 1;
    let prevValueCrypto = 0;
    let cumTwrStocks = 1;
    let prevValueStocks = 0;

    const holdings: Record<string, number> = {};
    const benchmarkInits: Record<string, number> = {};
    const metrics: DailyMetric[] = [];
    let dividendsTotal = 0;

    // Build a map of symbols to their native currency based on transactions
    const symbolCurrencyMap: Record<string, string> = {};
    sortedTx.forEach(t => {
        if (t.symbol && t.currency && !t.symbol.startsWith('CASH:')) {
            // CRITICAL: Only trust BUY/SELL for native currency. 
            // Dividends/Fees are often already converted to EUR by the broker.
            if (['BUY', 'SELL'].includes(t.type)) {
                symbolCurrencyMap[t.symbol] = t.currency;
            }
        }
    });

    // Pre-calculated classification to avoid repeated work
    const assetClassCache: Record<string, ReturnType<typeof classifyAsset>> = {};
    const getAssetClass = (s: string) => {
        if (!assetClassCache[s]) {
            const meta = assetMetadata[s];
            // CRITICAL: We prioritize the transaction currency (imported) over Yahoo metadata
            const importedCurr = symbolCurrencyMap[s];
            const nativeCurr = importedCurr || meta?.currency;
            assetClassCache[s] = classifyAsset(s, meta?.name, meta?.sector, nativeCurr);
        }
        return assetClassCache[s];
    };

    function getFx(d: Date): number {
        const dS = d.toISOString().substring(0, 10);
        let raw = lookup['EURUSD=X']?.[dS];
        
        if (raw === undefined) {
            // Search back up to 7 days for a valid rate
            for (let i = 1; i <= 7; i++) {
                const prevDS = format(subDays(d, i), 'yyyy-MM-dd');
                raw = lookup['EURUSD=X']?.[prevDS];
                if (raw !== undefined) break;
            }
        }
        
        if (raw === undefined) raw = 1.08; // More realistic default if everything fails
        return (raw < 1.0 && raw > 0.5) ? 1 / raw : raw;
    }

    while (currDate <= endDt) {
        const dStr = currDate.toISOString().substring(0, 10);
        const dayTxs = txByDate[dStr] || [];
        let flow = 0;
        const fx = getFx(currDate);

        const getBestPrice = (sym: string, dStr: string, currDate: Date) => {
            let p = lookup[sym]?.[dStr];
            if (p === undefined) {
                // Optimized fallback lookup (limit 7 days for daily metrics)
                for (let i = 1; i <= 7; i++) {
                    p = lookup[sym]?.[format(subDays(currDate, i), 'yyyy-MM-dd')];
                    if (p !== undefined) break;
                }
            }
            return p || fallbackPrices[sym] || 0;
        };

        // Sub-Portfolio Loop Variables (moved here to avoid re-calculating below)
        let flowCrypto = 0;
        let flowStocks = 0;
        let divCrypto = 0;
        let divStocks = 0;
        const dailyAssetFlows: Record<string, number> = {};
        const dailyAssetValues: Record<string, number> = {};

        for (const t of dayTxs) {
            const sym = t.symbol || '';
            const assetClass = getAssetClass(sym);
            const isEurT = t.currency === 'EUR' || assetClass.isEurStock;
            const type = (t.type || '').toUpperCase();

            let amountEur = t.amountEur !== undefined ? t.amountEur : t.amount;
            
            if ((t as any).isManualOverride) {
                amountEur = isEurT ? ((t.price || 0) * (t.quantity || 0)) : ((t.price || 0) * (t.quantity || 0) / fx);
            } else if (t.amountEur === undefined && t.currency !== 'EUR' && Math.abs(t.amount) > 0.001) {
                amountEur = t.amount / fx;
            }

            // Fallback: If amount is missing/zero but we have price/qty
            if (Math.abs(amountEur || 0) < 0.001 && (t.price || 0) > 0 && Math.abs(t.quantity || 0) > 0.001) {
                // Prioritize pre-calculated amount (EUR) if available to avoid FX drift
                const calcAmount = t.amount !== undefined ? Math.abs(t.amount) : (isEurT ? ((t.price || 0) * (t.quantity || 0)) : ((t.price || 0) * (t.quantity || 0) / fx));
                amountEur = (type === 'BUY' || type === 'WITHDRAWAL') ? -calcAmount : calcAmount;
            }

            const src = t.source || 'Autre';

            if (type === 'DEPOSIT') {
                if (sym && !assetClass.isCash && !sym.includes('EUR.USD')) {
                    holdings[sym] = (holdings[sym] || 0) + (t.quantity || 0);
                    let val = amountEur;
                    if (Math.abs(val || 0) < 0.01) {
                        let p = getBestPrice(sym, dStr, currDate);
                        if (p) val = isEurT ? ((t.quantity || 0) * p) : ((t.quantity || 0) * p / fx);
                    }
                    flow += (val || 0);
                    investedCapital += (val || 0);
                } else {
                    cashBalances[src] = (cashBalances[src] || 0) + (amountEur || 0);
                    flow += (amountEur || 0);
                    investedCapital += (amountEur || 0);
                }
            } else if (type === 'WITHDRAWAL') {
                if (sym && !assetClass.isCash && !sym.includes('EUR.USD')) {
                    holdings[sym] = (holdings[sym] || 0) - Math.abs(t.quantity || 0);
                    const val = Math.abs(amountEur || 0);
                    investedCapital -= val;
                    flow -= val;
                } else {
                    cashBalances[src] = (cashBalances[src] || 0) + (amountEur || 0);
                    flow += (amountEur || 0);
                    investedCapital += (amountEur || 0);
                }
            } else if (type === 'BUY') {
                if (!assetClass.isCash) holdings[sym] = (holdings[sym] || 0) + (t.quantity || 0);
                // Ensure we subtract the absolute cost from cash
                cashBalances[src] = (cashBalances[src] || 0) - Math.abs(amountEur || 0);
            } else if (type === 'SELL') {
                if (!assetClass.isCash) holdings[sym] = (holdings[sym] || 0) - (t.quantity || 0);
                // Ensure we add the absolute proceed to cash
                cashBalances[src] = (cashBalances[src] || 0) + Math.abs(amountEur || 0);
            } else if (type === 'DIVIDEND') {
                cashBalances[src] = (cashBalances[src] || 0) + Math.abs(amountEur || 0);
                dividendsTotal += Math.abs(amountEur || 0);
            } else if (type === 'FEE' || type === 'TAX') {
                cashBalances[src] = (cashBalances[src] || 0) + (amountEur || 0);
            } else if (type === 'INTEREST') {
                cashBalances[src] = (cashBalances[src] || 0) + (amountEur || 0);
            }

            if (src === 'IBKR') {
                // console.log(`[CASH DEBUG] IBKR | ${type} | ${sym} | Amt: ${amountEur?.toFixed(2)} | Balance: ${cashBalances[src]?.toFixed(2)}`);
            }

            // --- TWR FLOW CALCULATION ---
            if (sym && !assetClass.isCash && !sym.includes('EUR.USD')) {
                let tradeVal = 0;
                const marketPrice = getBestPrice(sym, dStr, currDate);

                if (type === 'BUY' || type === 'DEPOSIT') {
                    const price = marketPrice || (t.price || 0);
                    const valNative = Math.abs(t.quantity || 0) * price;
                    tradeVal = isEurT ? valNative : valNative / fx;
                } else if (type === 'SELL' || type === 'WITHDRAWAL') {
                    const price = marketPrice || (t.price || 0);
                    const valNative = Math.abs(t.quantity || 0) * price;
                    tradeVal = -(isEurT ? valNative : valNative / fx);
                }

                if (assetClass.isCrypto) {
                    flowCrypto += tradeVal;
                    if (type === 'DIVIDEND') divCrypto += Math.abs(amountEur || 0);
                } else {
                    flowStocks += tradeVal;
                    if (type === 'DIVIDEND') divStocks += Math.abs(amountEur || 0);
                }
                
                dailyAssetFlows[sym] = (dailyAssetFlows[sym] || 0) + tradeVal;
                if (type === 'DIVIDEND') {
                    // Dividend is a negative flow for the asset itself
                    dailyAssetFlows[sym] = (dailyAssetFlows[sym] || 0) - Math.abs(amountEur || 0);
                }
            }
        }

        let stocksVal = 0;
        let currentCryptoVal = 0;
        let currentStocksVal = 0;

        for (const [s, q] of Object.entries(holdings)) {
            if (q <= 0.0001) continue;
            let finalP = getBestPrice(s, dStr, currDate);
            
            if (finalP > 0) {
                const assetClass = getAssetClass(s);
                const valEur = assetClass.nativeCurrency === 'EUR' ? (q * finalP) : (q * finalP / fx);

                stocksVal += valEur;
                dailyAssetValues[s] = valEur;
                if (assetClass.isCrypto) currentCryptoVal += valEur;
                else currentStocksVal += valEur;
            }
        }

        // --- GLOBAL TWR ---
        const totalCash = Object.values(cashBalances).reduce((sum, v) => sum + v, 0);
        const totalValue = stocksVal + totalCash;

        const Vi = prevEquity;
        const C = flow;
        const Vf = totalValue;
        const adjustedStart = Vi + C;

        if (adjustedStart > 1) {
            const periodReturn = Vf / adjustedStart;
            if (periodReturn > 0.3 && periodReturn < 3.0) {
                cumTwr *= periodReturn;
            }
        }

        // --- SUB-PORTFOLIO TWR (Crypto) ---
        const Vi_Crypto = prevValueCrypto;
        const C_Crypto = flowCrypto;
        const Vf_Crypto = currentCryptoVal + divCrypto;

        const adjustedStartCrypto = Vi_Crypto + C_Crypto;
        if (adjustedStartCrypto > 10) {
            const periodReturn = Vf_Crypto / adjustedStartCrypto;
            if (periodReturn > 0.1 && periodReturn < 10.0) {
                cumTwrCrypto *= periodReturn;
            }
        }

        // --- SUB-PORTFOLIO TWR (Stocks) ---
        const Vi_Stocks = prevValueStocks;
        const C_Stocks = flowStocks;
        const Vf_Stocks = currentStocksVal + divStocks;

        const adjustedStartStocks = Vi_Stocks + C_Stocks;
        if (adjustedStartStocks > 10) {
            const periodReturn = Vf_Stocks / adjustedStartStocks;
            if (periodReturn > 0.3 && periodReturn < 3.0) {
                cumTwrStocks *= periodReturn;
            }
        }

        const benchmarks: Record<string, number> = {};
        BENCHMARK_TICKERS.forEach(ticker => {
            const p = lookup[ticker]?.[dStr];
            if (p) {
                if (!benchmarkInits[ticker]) benchmarkInits[ticker] = p;
                benchmarks[ticker] = (p / benchmarkInits[ticker] - 1) * 100;
            }
        });

        metrics.push({
            date: dStr,
            totalValue: Math.round(totalValue * 100) / 100,
            twr: (cumTwr - 1) * 100,
            twrCrypto: (cumTwrCrypto - 1) * 100,
            twrStocks: (cumTwrStocks - 1) * 100,
            cashBalance: Math.round(totalCash * 100) / 100,
            investedCapital: Math.round(investedCapital * 100) / 100,
            unrealizedPnl: Math.round((totalValue - investedCapital) * 100) / 100,
            benchmarks,
            assetValues: { ...dailyAssetValues },
            assetFlows: { ...dailyAssetFlows }
        });

        prevEquity = totalValue;
        prevValueCrypto = currentCryptoVal;
        prevValueStocks = currentStocksVal;
        currDate = addDays(currDate, 1);
    }

    const holdingMeta: Record<string, { 
        totalCostEur: number, 
        totalCostNative: number, 
        totalInvestedEur: number, 
        qty: number, 
        totalQtyBought: number,
        totalExitValueEur: number,
        firstBuy: Date | null, 
        lastSell: Date | null, 
        realizedPnlEur: number 
    }> = {};
    sortedTx.forEach(t => {
        if (!t.symbol || t.symbol.toUpperCase().startsWith('CASH') || t.symbol.includes('EUR.USD')) return;
        if (!holdingMeta[t.symbol]) holdingMeta[t.symbol] = { 
            totalCostEur: 0, 
            totalCostNative: 0, 
            totalInvestedEur: 0, 
            qty: 0, 
            totalQtyBought: 0,
            totalExitValueEur: 0,
            firstBuy: null, 
            lastSell: null, 
            realizedPnlEur: 0 
        };
        const meta = holdingMeta[t.symbol];

        let p = t.price || 0;
        if (p === 0) {
            p = lookup[t.symbol]?.[format(t.date, 'yyyy-MM-dd')] || fallbackPrices[t.symbol] || 0;
        }

        if (t.type === 'BUY' || t.type === 'DEPOSIT') {
            const nativeCurrency = symbolCurrencyMap[t.symbol] || 'EUR';
            const fx = getFx(t.date); // $/€ (ex: 1.10)
            
            let costNative = 0;
            let costEur = 0;

            if (t.price > 0 && Math.abs(t.quantity) > 0.001) {
                // Scenario A: We have a price and quantity (Most reliable for native cost)
                costNative = t.price * Math.abs(t.quantity);
                
                // For costEur, we trust amountEur or amount if they look like EUR
                // If amount is close to costNative, it's probably NOT EUR.
                const amountVal = Math.abs(t.amount || 0);
                const isAmountNative = Math.abs(amountVal - costNative) < (costNative * 0.05);
                
                if (t.currency === 'EUR' || (t.amountEur && !isAmountNative)) {
                    costEur = Math.abs(t.amountEur || t.amount);
                } else {
                    costEur = costNative / fx;
                }
            } else {
                // Scenario B: We only have an amount
                const txCurrency = t.currency || 'EUR';
                const amount = Math.abs(t.amount || 0);
                
                if (txCurrency === nativeCurrency) {
                    costNative = amount;
                    costEur = (nativeCurrency === 'EUR') ? amount : amount / fx;
                } else if (txCurrency === 'EUR') {
                    costEur = amount;
                    costNative = amount * fx;
                } else {
                    // tx is USD, native is EUR (Rare)
                    costNative = amount;
                    costEur = amount / fx;
                }
            }
            
            meta.totalCostEur += costEur;
            meta.totalCostNative += costNative;
            meta.totalInvestedEur += costEur;
            meta.qty += (t.quantity || 0);
            meta.totalQtyBought += Math.abs(t.quantity || 0);
            if (!meta.firstBuy) meta.firstBuy = t.date;
        } else if (t.type === 'SELL' || t.type === 'WITHDRAWAL') {
            const ratio = Math.min(1, Math.abs(t.quantity || 0) / (meta.qty || 1e-12));
            const assetClass = getAssetClass(t.symbol);
            const fx = getFx(t.date);
            const isEurTx = t.currency === 'EUR';
            const sellValueNative = Math.abs(t.quantity || 0) * (t.price || 0);
            const sellValueEur = isEurTx ? Math.abs(t.amount || sellValueNative) : sellValueNative / fx;
            const costOfSoldEur = meta.totalCostEur * ratio;
            
            meta.realizedPnlEur += (sellValueEur - costOfSoldEur);
            meta.totalExitValueEur += sellValueEur;
            
            meta.totalCostEur -= costOfSoldEur;
            meta.totalCostNative -= meta.totalCostNative * ratio;
            meta.qty -= Math.abs(t.quantity || 0);
            meta.lastSell = t.date;
        } else if (t.type === 'DIVIDEND') {
            const assetClass = getAssetClass(t.symbol);
            const fx = getFx(t.date);
            const isEurT = t.currency === 'EUR' || assetClass.isEurStock;
            const divEur = isEurT ? t.amount : t.amount / fx;
            meta.realizedPnlEur += divEur;
            meta.totalExitValueEur += divEur;
        } else if (t.type === 'FEE' || t.type === 'TAX') {
            const assetClass = getAssetClass(t.symbol);
            const feeNative = Math.abs(t.amount);
            const isEurT = (t.currency || settings.fiatCurrency) === 'EUR' || assetClass.isEurStock;
            const feeEur = isEurT ? feeNative : feeNative / getFx(t.date);
            
            // Only add to cost basis if it's a trade fee (linked to symbol), not a dividend tax
            // In IBKR CSV, dividend tax is 'TAX' but we handle it in dividendsTotal
            if (t.symbol && t.symbol !== 'CASH' && t.type === 'FEE') {
                meta.totalCostEur += feeEur;
                meta.totalCostNative += feeNative;
            }
            
            if (t.type === 'TAX' && t.symbol && t.symbol !== 'CASH') {
                dividendsTotal -= feeEur; // Net out the dividend tax
            }
        }
    });

    const currentHoldings: FinalHolding[] = Object.entries(holdings)
        .filter(([_, q]) => q > 0.001)
        .map(([s, q]) => {
            const assetClass = getAssetClass(s);
            let p = lookup[s]?.[todayStr];
            if (p === undefined) {
                for (let i = 1; i <= 7; i++) {
                    p = lookup[s]?.[format(subDays(endDt, i), 'yyyy-MM-dd')];
                    if (p !== undefined) break;
                }
            }
            p = fallbackPrices[s] || p || 0;
            const fx = getFx(endDt);
            const meta = holdingMeta[s] || { totalCostEur: 0, totalCostNative: 0, qty: q, firstBuy: null };

            const nativeVal = q * p;
            
            // CONVERSION LOGIC: If native currency differs from dashboard currency, convert.
            const isNativeBase = assetClass.nativeCurrency === settings.fiatCurrency;
            const val = isNativeBase ? nativeVal : nativeVal / fx;
            const baseCost = isNativeBase ? meta.totalCostNative : meta.totalCostEur;

            const daysHeld = meta.firstBuy ? differenceInDays(endDt, meta.firstBuy) : 0;
            const yearsHeld = daysHeld / 365.25;
            const cagr = (yearsHeld > 0.05 && meta.totalCostNative > 0)
                ? (Math.pow(nativeVal / meta.totalCostNative, 1 / yearsHeld) - 1) * 100
                : 0;

            return {
                name: s,
                symbol: s,
                value: val,
                quantity: q,
                pru: meta.qty > 0 ? meta.totalCostNative / meta.qty : 0,
                pruEur: meta.qty > 0 ? baseCost / meta.qty : 0, // This now holds Base currency (e.g. EUR)
                cagr: cagr,
                pnl: val - baseCost,
                pnlNative: nativeVal - meta.totalCostNative,
                performance: meta.totalCostNative > 0 ? ((nativeVal / meta.totalCostNative) - 1) * 100 : 0,
                firstBuyDate: meta.firstBuy ? format(meta.firstBuy, 'yyyy-MM-dd') : undefined,
                currentPrice: p,
                nativePrice: p,
                nativeCurrency: assetClass.nativeCurrency,
                currency: settings.fiatCurrency
            };
        });

    const closedHoldings: any[] = Object.entries(holdingMeta)
        .filter(([s, meta]) => meta.qty < 0.001 && meta.firstBuy !== null)
        .map(([s, meta]) => {
            const assetMetadataEntry = assetMetadata[s];
            const displayName = assetMetadataEntry?.name || s;

            return {
                name: displayName,
                symbol: s,
                realizedPnl: meta.realizedPnlEur,
                performance: meta.totalInvestedEur > 0 ? (meta.realizedPnlEur / meta.totalInvestedEur) * 100 : 0, 
                firstBuyDate: meta.firstBuy ? format(meta.firstBuy, 'yyyy-MM-dd') : undefined,
                lastSellDate: meta.lastSell ? format(meta.lastSell, 'yyyy-MM-dd') : undefined,
                quantity: meta.totalQtyBought,
                avgBuyPrice: meta.totalQtyBought > 0 ? meta.totalInvestedEur / meta.totalQtyBought : 0,
                avgSellPrice: meta.totalQtyBought > 0 ? meta.totalExitValueEur / meta.totalQtyBought : 0
            };
        });

    // --- FINAL AGGREGATION ---
    // Netting: Group all cash balances by common Platform to deduplicate and subtract costs
    const cashByPlatform: Record<string, number> = {};
    Object.entries(cashBalances).forEach(([source, amount]) => {
        let platform = 'Autre';
        const sNormal = source.toUpperCase();
        if (sNormal.includes('PP') || sNormal.includes('PORTFOLIO PERFORMANCE')) platform = 'Portfolio Performance';
        else if (sNormal.includes('IBKR') || sNormal.includes('INTERACTIVE')) platform = 'Interactive Brokers';
        else if (sNormal.includes('BITGET')) platform = 'Bitget';
        else if (sNormal.includes('BINANCE')) platform = 'Binance';
        else if (sNormal.includes('LEDGER')) platform = 'Ledger';
        else platform = source; // Fallback to raw source name

        cashByPlatform[platform] = (cashByPlatform[platform] || 0) + amount;
    });

    Object.entries(cashByPlatform).forEach(([platform, amount]) => {
        if (Math.abs(amount) > 0.01) {
            currentHoldings.push({
                name: `Liquidités (${platform})`,
                symbol: `CASH:${platform}`,
                value: amount,
                quantity: amount,
                pru: 1,
                pruEur: 1,
                cagr: 0,
                pnl: 0,
                pnlNative: 0,
                performance: 0,
                nativePrice: 1
            });
        }
    });
    
    // Final Guard: Force consistency between Metrics and currentHoldings
    const finalMetric = metrics[metrics.length - 1];
    if (finalMetric) {
        const totalValueReal = currentHoldings.reduce((sum, h) => sum + h.value, 0);
        const totalCashNet = Object.values(cashByPlatform).reduce((sum, val) => sum + val, 0);
        finalMetric.totalValue = Math.round(totalValueReal * 100) / 100;
        finalMetric.cashBalance = Math.round(totalCashNet * 100) / 100;
    }

    return { metrics, currentHoldings, closedHoldings, missingAssets: [], dividendsTotal };
}
