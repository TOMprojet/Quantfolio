import fs from 'fs';
import path from 'path';

const API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';

export interface FMPFundamentalData {
    symbol: string;
    profile: any;
    history: FMPYearlyData[];
    metrics: any;
}

export interface FMPYearlyData {
    year: string;
    date: string;
    revenue: number;
    netIncome: number;
    fcf: number;
    opMargin: number;
    netMargin: number;
    roe: number;
    roic: number;
    buybacks: number;
    dividends: number;
    dividendYield: number;
}

export async function getFMPFundamentals(symbol: string): Promise<FMPFundamentalData> {
    if (!API_KEY) throw new Error('FMP_API_KEY is missing');

    const cacheDir = path.join(process.cwd(), '.cache');
    const cacheFile = path.join(cacheDir, `${symbol}_fmp.json`);

    // Create cache dir if not exists
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

    // Check cache (24h)
    if (fs.existsSync(cacheFile)) {
        const stats = fs.statSync(cacheFile);
        const age = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
        if (age < 24) {
            console.log(`Using cache for ${symbol}`);
            return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        }
    }

    try {
        console.log(`Fetching FMP data for ${symbol}...`);
        // Fetch all data in parallel
        const responses = await Promise.all([
            fetch(`${BASE_URL}/profile?symbol=${symbol}&apikey=${API_KEY}`),
            fetch(`${BASE_URL}/income-statement?symbol=${symbol}&limit=10&apikey=${API_KEY}`),
            fetch(`${BASE_URL}/balance-sheet-statement?symbol=${symbol}&limit=10&apikey=${API_KEY}`),
            fetch(`${BASE_URL}/cash-flow-statement?symbol=${symbol}&limit=10&apikey=${API_KEY}`),
            fetch(`${BASE_URL}/key-metrics?symbol=${symbol}&limit=10&apikey=${API_KEY}`),
            fetch(`${BASE_URL}/dividends?symbol=${symbol}&apikey=${API_KEY}`)
        ]);

        // Helper to parse JSON or return empty if premium/error
        const safeParse = async (res: Response, name: string) => {
            const text = await res.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                console.warn(`FMP API: ${name} returned non-JSON response (likely Premium restricted):`, text.substring(0, 50));
                return []; // Return empty array to keep the app running
            }
        };

        const profileArr = await safeParse(responses[0], 'profile');
        const profile = Array.isArray(profileArr) ? profileArr[0] : null;
        const income = await safeParse(responses[1], 'income');
        const balance = await safeParse(responses[2], 'balance');
        const cash = await safeParse(responses[3], 'cash');
        const metrics = await safeParse(responses[4], 'metrics');
        const rawDividends = await safeParse(responses[5], 'dividends');

        if (!profile) throw new Error(`No data found for ${symbol}`);

        // Merge yearly data
        const yearlyData: FMPYearlyData[] = income.map((inc: any, index: number) => {
            const bal = balance.find((b: any) => b.date === inc.date) || {};
            const cf = cash.find((c: any) => c.date === inc.date) || {};
            const met = metrics.find((m: any) => m.date === inc.date) || {};

            // Calculate buybacks (negative number usually means repurchase in FMP)
            // commonStockRepurchased is often negative in cash flow statement
            const buybacks = Math.abs(cf.commonStockRepurchased || 0);

            return {
                year: inc.date.split('-')[0],
                date: inc.date,
                revenue: inc.revenue,
                netIncome: inc.netIncome,
                fcf: cf.freeCashFlow,
                opMargin: (inc.operatingIncome / inc.revenue) * 100,
                netMargin: (inc.netIncome / inc.revenue) * 100,
                roe: met.roe * 100,
                roic: met.roic * 100,
                buybacks: buybacks,
                dividends: Math.abs(cf.dividendsPaid || 0),
                dividendYield: met.dividendYield * 100
            };
        }).reverse(); // Ascending order for charts

        const result = {
            symbol,
            profile,
            history: yearlyData,
            metrics: metrics[0]
        };

        // Write to cache
        fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));

        return result;
    } catch (error) {
        console.error('Error fetching FMP data:', error);
        throw error;
    }
}
