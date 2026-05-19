
import fs from 'fs';
import path from 'path';
import { getYahooFundamentals, getYahooHistoricalPrices, getYahooRealTimePrice, getYahooQuotes } from '../api/yahoo';
import { fetchWithCache } from '../core/cache';
import { getAssetLogoUrl } from '../core/format-utils';
import { classifyAsset } from './classifier';

// --- CONFIG ---
export const SYMBOL_OVERRIDES: Record<string, string> = {
    'E3G1': 'E3G1.F',
    'MC': 'MC.PA',
    'NOV': 'NOV.DE',
    'ASML': 'ASML.AS',
    'AIR': 'AIR.PA',
    'RMS': 'RMS.PA',
    'AI': 'AI.PA',
    'BNP': 'BNP.PA',
    'SAN': 'SAN.PA',
    'CS': 'CS.PA',
    'OR': 'OR.PA',
    'KER': 'KER.PA',
    'VIV': 'VIV.PA',
    'GLE': 'GLE.PA',
    'AIL': 'AI.PA'
};

export interface PriceData {
    date: string;
    close: number;
}

export interface AssetMetadata {
    symbol: string;
    name: string;
    longName?: string;
    shortName?: string;
    sector: string;
    industry: string;
    currency: string;
    currentPrice: number;
    marketCap: number;
    formattedMarketCap?: string;
    trailingPE?: number;
    forwardPE?: number;
    dividendYield?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    roe?: number;
    roic?: number;
    eps?: number;
    fcf?: string;
    fcfRaw?: number;
    sharesOutstanding?: number;
    logoUrl?: string;
    fdv?: number;
    circulatingSupply?: number;
    totalTokens?: number;
    maxSupply?: number;
    circulatingPercentage?: number;
    exDividendDate?: string;
    dividendRate?: number;
    dividendPayDate?: string;
    dividendAmount?: number;
}

export const BENCHMARK_TICKERS = ['CW8.PA', 'PSP5.PA', 'PUST.PA'];

// --- TRANSLATIONS ---
export const SECTOR_TRANSLATIONS: Record<string, string> = {
    'Technology': 'Technologie',
    'Financial Services': 'Services Financiers',
    'Healthcare': 'Santé',
    'Consumer Cyclical': 'Consommation Cyclique',
    'Consumer Defensive': 'Consommation Défensive',
    'Industrials': 'Industrie',
    'Communication Services': 'Services de Communication',
    'Energy': 'Énergie',
    'Basic Materials': 'Matériaux de Base',
    'Real Estate': 'Immobilier',
    'Utilities': 'Services Publics'
};

// Manual mapping for specific tickers that Yahoo doesn't categorize well (like ETFs)
export const MANUAL_SECTOR_MAP: Record<string, string> = {
    'PSP5.PA': 'ETF', 'CW8.PA': 'ETF', 'PUST.PA': 'ETF',
    'BTC': 'Crypto', 'ETH': 'Crypto', 'SOL': 'Crypto'
};

export async function getAssetsMetadata(symbols: string[], options: { fast?: boolean } = {}): Promise<Record<string, AssetMetadata>> {
    const metadata: Record<string, AssetMetadata> = {};
    const uniqueSymbols = Array.from(new Set(symbols.filter(s => s && s !== 'CASH' && s !== '-'))).sort();

    if (uniqueSymbols.length === 0) return {};

    // 1. Determine Yahoo Symbols
    // Append -USD for raw crypto symbols like BTC, ETH, SOL so Yahoo can find them.
    const getYahooSymbol = (sym: string) => {
        if (SYMBOL_OVERRIDES[sym]) return SYMBOL_OVERRIDES[sym];
        const isRawCrypto = ['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'BNB'].includes(sym);
        return isRawCrypto ? `${sym}-USD` : sym;
    };

    // 2. Batch Fetch All Metadata via Yahoo Quotes (FAST)
    const allSymbols = uniqueSymbols.length > 0 ? await getYahooQuotes(uniqueSymbols.map(getYahooSymbol)) : [];
    const quotesMap = new Map(allSymbols.map(q => [q.symbol, q]));

    // 3. Enrich All Metadata (Parallel)
    await Promise.all(uniqueSymbols.map(async (originalSym) => {
        const sym = getYahooSymbol(originalSym);
        const quote = quotesMap.get(sym);
        
        // OPTIMIZATION: If we only need "fast" data (for watchlist/dashboard),
        // we still want dividend dates for the "Upcoming Dividends" section.
        // So we use a "light" version of fundamentals which is much faster.
        const yahoo = await getYahooFundamentals(sym, { light: options.fast });
        
        if (yahoo || quote) {
            const name = quote?.shortName || quote?.longName || yahoo?.shortName || yahoo?.longName || originalSym;
            const baseSym = originalSym.split('.')[0];
            
            // Priority 1: Yahoo Sector (with translation)
            let rawSector = yahoo?.sector || '';
            let sector = SECTOR_TRANSLATIONS[rawSector] || rawSector;

            // Priority 2: Manual Map (for ETFs/Crypto)
            if (!sector) {
                sector = MANUAL_SECTOR_MAP[originalSym] || MANUAL_SECTOR_MAP[baseSym];
            }
            
            // Priority 3: Fallback to classifier
            if (!sector) {
                const classification = classifyAsset(originalSym, name);
                sector = classification.isEtf ? 'ETF' : (classification.isCrypto ? 'Crypto' : 'Autre');
            }

            metadata[originalSym] = {
                symbol: originalSym,
                name,
                longName: quote?.longName || yahoo?.longName,
                shortName: quote?.shortName || yahoo?.shortName,
                currentPrice: quote?.regularMarketPrice || yahoo?.price || 0,
                marketCap: quote?.marketCap || yahoo?.marketCapRaw || 0,
                formattedMarketCap: (quote?.marketCap || yahoo?.marketCapRaw) ? ((quote?.marketCap || yahoo?.marketCapRaw) / 1e9).toFixed(1) + 'B' : '-',
                trailingPE: quote?.trailingPE || yahoo?.per,
                forwardPE: quote?.forwardPE || yahoo?.forwardPE,
                // FIX: quote.dividendYield is already a percentage (e.g. 1.46)
                // yahoo.divYield is also a percentage (e.g. 1.46)
                dividendYield: quote?.dividendYield !== undefined ? quote.dividendYield : (yahoo?.divYield || 0),
                sector,
                industry: yahoo?.industry || sector || 'Autre',
                roe: yahoo?.roe || 0,
                eps: yahoo?.eps || 0,
                currency: quote?.currency || yahoo?.currency || 'USD',
                logoUrl: getAssetLogoUrl(originalSym, name, yahoo?.website),
                fcf: yahoo?.fcf.toString() || '0',
                fcfRaw: yahoo?.fcf || 0,
                exDividendDate: yahoo?.exDividendDate,
                dividendRate: quote?.dividendRate || yahoo?.dividendRate,
                dividendPayDate: yahoo?.dividendPayDate,
                dividendAmount: yahoo?.dividendAmount
            };
        }
    }));

    return metadata;
}

export async function getHistoricalPrices(symbols: string[], startDate: Date, endDate: Date): Promise<Record<string, any[]>> {
    const results: Record<string, any[]> = {};
    
    // Use Promise.all for parallel fetching to optimize loading time
    await Promise.all(symbols.map(async (s) => {
        const yahooSymbol = SYMBOL_OVERRIDES[s] || s;
        results[s] = await getYahooHistoricalPrices(yahooSymbol, startDate, endDate);
    }));
    
    return results;
}

export async function getRealTimePrice(symbol: string): Promise<number | null> {
    return getYahooRealTimePrice(SYMBOL_OVERRIDES[symbol] || symbol);
}
