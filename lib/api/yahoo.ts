import YahooFinance2 from 'yahoo-finance2';
const yahooFinance = new YahooFinance2() as any;

import { subYears, startOfDay, endOfDay, format } from 'date-fns';
import { fetchWithCache } from '../core/cache';
import { getAssetLogoUrl } from '../core/format-utils';

export interface YahooFundamentals {
    per: number;
    divYield: number;
    roic: number;
    roe: number;
    marketCap: string;
    marketCapRaw: number;
    eps: number;
    fcf: number;
    price: number;
    growth: {
        past5Y: number;
        est5Y: number;
        fcfPast5Y: number;
        fcfEst5Y: number;
    };
    historicalPE: number;
    forwardPE: number;
    historicalPFCF: number;
    forwardPFCF: number;
    shortName?: string;
    longName?: string;
    currency?: string;
    sector?: string;
    industry?: string;
    exDividendDate?: string;
    description?: string;
    dividendRate?: number;
    dividendPayDate?: string;
    dividendAmount?: number;
    website?: string;
    employees?: number;
    city?: string;
    country?: string;
    history?: any[]; // For fundamental charts
}

export interface YahooPriceQuote {
    date: Date;
    close: number;
}

export async function getYahooFundamentals(symbol: string, options: { light?: boolean } = {}): Promise<YahooFundamentals | null> {
    const fullCacheKey = symbol;
    const lightCacheKey = `${symbol}_light`;

    // Always try full cache first, regardless of mode
    const fullCached = await fetchWithCache('yahoo-fundamentals', fullCacheKey, async () => null, 3600);
    if (fullCached) return fullCached;

    // If light mode and not in full cache, try light cache
    return fetchWithCache('yahoo-fundamentals', options.light ? lightCacheKey : fullCacheKey, async () => {
        const queryOptions = {
            modules: options.light ? [
                'summaryDetail',
                'calendarEvents',
                'price',
                'summaryProfile'
            ] : [
                'financialData',
                'defaultKeyStatistics',
                'summaryDetail',
                'earningsTrend',
                'price',
                'summaryProfile',
                'calendarEvents',
                'incomeStatementHistory',
                'balanceSheetHistory',
                'cashflowStatementHistory'
            ]
        };
        // @ts-ignore
        const qSummary: any = await yahooFinance.quoteSummary(symbol, queryOptions, { lang: 'fr-FR', region: 'FR' });
        
        const fin = qSummary.financialData || {};
        const stats = qSummary.defaultKeyStatistics || {};
        const summary = qSummary.summaryDetail || {};
        const price = qSummary.price || {};
        const profile = qSummary.summaryProfile || {};
        const trends = qSummary.earningsTrend?.trend || [];
        const calendar = qSummary.calendarEvents || {};

        let currentPrice = fin.currentPrice || price.regularMarketPrice || summary.previousClose || 0;
        
        // ETF/Asset Fix: If price is missing or zero, try a focused quote fetch
        if (currentPrice === 0) {
            try {
                const q: any = await yahooFinance.quote(symbol);
                currentPrice = q.regularMarketPrice || q.ask || q.bid || 0;
            } catch (e) { /* ignore */ }
        }

        const eps = stats.trailingEps || summary.trailingEPS || 0;
        const totalFcf = fin.freeCashflow?.raw || fin.freeCashflow || 0;
        const shares = stats.sharesOutstanding?.raw || stats.sharesOutstanding || summary.sharesOutstanding || 1;
        const fcfPerShare = (totalFcf && shares) ? totalFcf / shares : 0;

        const trend5y = trends.find((t: any) => t.period === '5y' || t.period === '+5y');
        let growthEst5Y = 0;
        if (trend5y && trend5y.growth) {
            growthEst5Y = (trend5y.growth.raw || parseFloat(trend5y.growth.fmt || '0')) * 100;
        }

        // --- DIVIDEND ENHANCEMENT ---
        // 1. Get Ex-Date and Pay-Date from Calendar
        const exDate = calendar.exDividendDate?.toISOString?.() || calendar.exDividendDate || summary.exDividendDate?.toISOString?.() || summary.exDividendDate;
        const payDate = calendar.dividendDate?.toISOString?.() || calendar.dividendDate;
        
        // 2. Get Per-Payment Amount (Inferred from frequency)
        let dividendAmount = summary.dividendRate; // Default to annual if we can't find frequency
        if (summary.dividendRate > 0) {
            try {
                // Fetch last year of dividends to see frequency
                const oneYearAgo = subYears(new Date(), 1);
                const chartResult: any = await yahooFinance.chart(symbol, { period1: oneYearAgo });
                const recentDividends = chartResult?.events?.dividends || [];
                
                if (recentDividends.length > 0) {
                    // Count how many dividends in a typical year
                    const frequency = recentDividends.length;
                    // If frequency is reasonable (1, 2, 4, 12), use it to divide annual rate
                    if ([1, 2, 4, 12].includes(frequency)) {
                        dividendAmount = summary.dividendRate / frequency;
                    } else {
                        // Fallback: use the last actual dividend amount
                        dividendAmount = recentDividends[recentDividends.length - 1].amount;
                    }
                }
            } catch (e) {
                // Fallback to annual if chart fails
            }
        }

        return {
            per: summary.trailingPE || (eps ? currentPrice / eps : 0),
            divYield: (summary.dividendYield || 0) * 100,
            roic: 0,
            roe: fin.returnOnEquity ? (fin.returnOnEquity.raw || fin.returnOnEquity) * 100 : 0,
            marketCap: summary.marketCap ? (summary.marketCap / 1e9).toFixed(1) + 'B' : '-',
            marketCapRaw: summary.marketCap || 0,
            eps: parseFloat(eps.toFixed(2)),
            fcf: parseFloat(fcfPerShare.toFixed(2)),
            price: currentPrice,
            growth: {
                past5Y: 0, // Requires historical calculation if needed
                est5Y: parseFloat(growthEst5Y.toFixed(2)),
                fcfPast5Y: 0,
                fcfEst5Y: parseFloat(growthEst5Y.toFixed(2))
            },
            historicalPE: 0,
            forwardPE: summary.forwardPE || stats.forwardPE || 0,
            historicalPFCF: 0,
            forwardPFCF: (currentPrice && fcfPerShare && growthEst5Y) ? currentPrice / (fcfPerShare * (1 + growthEst5Y / 100)) : 0,
            shortName: price.shortName,
            longName: price.longName,
            currency: price.currency || fin.financialCurrency,
            sector: profile.sector,
            industry: profile.industry,
            exDividendDate: exDate,
            dividendRate: summary.dividendRate,
            dividendPayDate: payDate,
            dividendAmount: dividendAmount,
            description: profile.longBusinessSummary,
            website: profile.website,
            employees: profile.fullTimeEmployees,
            city: profile.city,
            country: profile.country,
            history: (() => {
                const h: any[] = [];
                const incH = qSummary.incomeStatementHistory?.incomeStatementHistory || [];
                const cfH = qSummary.cashflowStatementHistory?.cashflowStatementHistory || [];
                const bsH = qSummary.balanceSheetHistory?.balanceSheetHistory || [];

                incH.forEach((inc: any) => {
                    const date = inc.endDate;
                    if (!date) return;
                    const d = new Date(date);
                    const y = format(d, 'yyyy');

                    const rev = inc.totalRevenue?.raw || inc.totalRevenue || 0;
                    const net = inc.netIncome?.raw || inc.netIncome || 0;
                    const opInc = inc.operatingIncome?.raw || inc.operatingIncome || 0;

                    const cf = cfH.find((c: any) => format(new Date(c.endDate), 'yyyy') === y) || {};
                    const bs = bsH.find((b: any) => format(new Date(b.endDate), 'yyyy') === y) || {};

                    const fcf = cf.freeCashflow?.raw || cf.freeCashflow || 0;
                    const equity = bs.totalStockholderEquity?.raw || bs.totalStockholderEquity || 0;

                    h.push({
                        date: d,
                        year: y,
                        revenue: rev,
                        netIncome: net,
                        fcf: fcf,
                        opMargin: rev > 0 ? (opInc / rev) * 100 : 0,
                        netMargin: rev > 0 ? (net / rev) * 100 : 0,
                        roe: equity > 0 ? (net / equity) * 100 : 0
                    });
                });

                return h.sort((a, b) => a.date.getTime() - b.date.getTime());
            })()
        };
    }, 3600); // 1 hour cache - metadata like sector/name doesn't change often
}

export async function getYahooHistoricalPrices(symbol: string, startDate: Date, endDate: Date): Promise<YahooPriceQuote[]> {
    // Normalize dates to the day to ensure consistent cache keys
    const startStr = format(startOfDay(startDate), 'yyyyMMdd');
    const endStr = format(endOfDay(endDate), 'yyyyMMdd');
    const cacheKey = `${symbol}_${startStr}_${endStr}`;
    
    const isToday = endDate >= startOfDay(new Date());
    const ttl = isToday ? 1800 : 3600 * 24; // 30 min if today, 24h otherwise

    const result = await fetchWithCache('yahoo-history', cacheKey, async () => {
        const queryOptions = {
            period1: startOfDay(startDate),
            period2: endOfDay(endDate),
            interval: '1d' as any
        };

        const result: any = await yahooFinance.chart(symbol, queryOptions);
        if (!result || !result.quotes) return [];

        const quotes = result.quotes
            .filter((q: any) => q.date && (q.close !== undefined || q.adjclose !== undefined))
            .map((q: any) => ({
                date: q.date,
                close: q.close ?? q.adjclose ?? 0
            }));

        // If today is requested and we have quotes, try to refresh the last one with a real-time quote
        if (isToday && quotes.length > 0) {
            try {
                const live: any = await yahooFinance.quote(symbol);
                if (live && live.regularMarketPrice) {
                    const last = quotes[quotes.length - 1];
                    // If the last quote is from today, update it
                    if (format(last.date, 'yyyyMMdd') === format(new Date(), 'yyyyMMdd')) {
                        last.close = live.regularMarketPrice;
                    } else if (new Date().getTime() - last.date.getTime() > 3600 * 1000) {
                        // Or if it's from yesterday but market is open today, add today
                        quotes.push({
                            date: new Date(),
                            close: live.regularMarketPrice
                        });
                    }
                }
            } catch (e) {
                // ignore quote error, stick to chart
            }
        }

        return quotes;
    }, ttl);

    return result || [];
}

export async function getYahooRealTimePrice(symbol: string): Promise<number | null> {
    try {
        const q: any = await yahooFinance.quote(symbol);
        return q.regularMarketPrice || q.ask || null;
    } catch (e) {
        return null;
    }
}

export async function getYahooQuotes(symbols: string[]): Promise<any[]> {
    if (!symbols.length) return [];
    try {
        const quotes = await yahooFinance.quote(symbols);
        return Array.isArray(quotes) ? quotes : [quotes];
    } catch (e) {
        console.error('Yahoo Batch Quote Error:', e);
        return [];
    }
}
export async function searchYahoo(query: string) {
    if (!query || query.length < 2) return [];
    
    return fetchWithCache('yahoo-search', query, async () => {
        try {
            // DISABLE VALIDATION (Crucial for avoiding "Failed Yahoo Schema validation" errors)
            const results: any = await yahooFinance.search(query, { lang: 'fr-FR', region: 'FR' }, { validateResult: false } as any);
            
            let quotes = results.quotes || [];

            // FALLBACK
            if (quotes.length === 0 && query.length <= 6 && !query.includes(' ')) {
                try {
                    const q: any = await yahooFinance.quote(query.toUpperCase(), {}, { validateResult: false } as any);
                    if (q && q.symbol) {
                        quotes = [{
                            symbol: q.symbol,
                            shortname: q.shortName || q.longName || q.symbol,
                            longname: q.longName,
                            exchange: q.exchange,
                            quoteType: q.quoteType
                        }];
                    }
                } catch (e) {
                    // quote failed too, ignore
                }
            }

            return quotes
                .filter((q: any) => q.symbol) // Only keep results with a ticker symbol
                .map((q: any) => {
                    const name = q.shortname || q.longname || q.name || q.symbol;
                    return {
                        symbol: q.symbol,
                        name: name,
                        exchange: q.exchange,
                        type: q.quoteType || q.typeDisp,
                        logoUrl: getAssetLogoUrl(q.symbol, name)
                    };
                });
        } catch (e) {
            console.error('Yahoo Search Error:', e);
            return [];
        }
    }, 3600);
}
