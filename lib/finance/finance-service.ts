
export interface FundamentalData {
    per: number;
    divYield: number;
    roic: number;
    roe: number;
    marketCap: string;
    eps: number;
    fcf: number;
    price: number;
    growth?: {
        past5Y: number;
        est5Y: number;
        fcfPast5Y?: number;
        fcfEst5Y?: number;
    };
    historicalPE?: number;
    forwardPE?: number;
    historicalPFCF?: number;
    forwardPFCF?: number;
    pfcf?: number;
}

export interface QuoteData {
    symbol: string;
    price: number;
    changePercent: number;
}

export type FinanceError = 'TOKEN_LIMIT_REACHED' | 'NETWORK_ERROR' | 'SYMBOL_NOT_FOUND' | null;

export interface IFinanceService {
    getQuote(symbol: string): Promise<QuoteData>;
    getFundamentals(symbol: string): Promise<FundamentalData>;
    getPreciseValuation(symbol: string): Promise<FundamentalData>;
    getFairPrice(symbol: string): Promise<number>;
}

import { FAIR_PRICES } from '../core/constants';

export class DefaultFinanceService implements IFinanceService {
    async getQuote(symbol: string): Promise<QuoteData> {
        try {
            const response = await fetch(`/api/fundamentals?symbol=${symbol}`);
            if (!response.ok) throw new Error('NETWORK_ERROR');
            const data = await response.json();
            return {
                symbol,
                price: data.price || 0,
                changePercent: 0
            };
        } catch (e) {
            throw new Error('SYMBOL_NOT_FOUND');
        }
    }

    async getFundamentals(symbol: string): Promise<FundamentalData> {
        const response = await fetch(`/api/fundamentals?symbol=${symbol}`);

        if (response.status === 429) {
            throw new Error('TOKEN_LIMIT_REACHED');
        }

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        return response.json();
    }

    async getPreciseValuation(symbol: string): Promise<FundamentalData> {
        return this.getFundamentals(symbol);
    }

    async getFairPrice(symbol: string): Promise<number> {
        return FAIR_PRICES[symbol] || 0;
    }
}

// Singleton export - Cleaned up to use unified API
export const financeService = new DefaultFinanceService();
