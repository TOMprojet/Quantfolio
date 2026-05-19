
export interface PortfolioTransaction {
    date: Date | string;
    type: 'BUY' | 'SELL' | 'DIVIDEND' | 'DEPOSIT' | 'WITHDRAWAL' | 'FEE' | 'TAX' | 'INTEREST' | 'FOREX';
    symbol: string;
    quantity: number;
    price: number;
    amount: number;
    amountEur?: number;
    currency: string;
    account?: string;
    source?: string;
    description?: string;
}
