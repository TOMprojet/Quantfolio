export interface ImportResult {
    assets: { symbol: string, quantity: number, source: string, unifiedSymbol?: string }[];
    transactions: any[];
    symbols: string[];
}

// Unified Transaction specific to Engine needs
export interface UnifiedTransaction {
    date: Date | string; // Support both for JSON compatibility
    type: 'BUY' | 'SELL' | 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND' | 'FEE' | 'TAX' | 'FOREX' | 'INTEREST';
    symbol?: string; // e.g. "AAPL", "BTC-USD". Optional for pure Cash movements.
    quantity?: number; // Optional for pure Cash
    price?: number; // Unit price in NATIVE currency (e.g. USD price for AAPL)

    // Core Value Fields
    amount: number; // Signed Cash Impact in NATIVE currency. (-) for Buy/Withdrawal, (+) for Sell/Deposit/Div.
    amountEur?: number; // Optional: Pre-calculated signed cash impact in EUR (Base). 
    // This is used to avoid FX drift if the importer already knows the exact EUR impact.

    currency: string; // The currency of the TRANSACTION (e.g. USD for AAPL Buy). 
    // Note: 'amount' should ideally be normalized to Base, OR we store 'amountNative' and normalize later.
    // ARCHITECTURE DECISION: Store 'amount' as NATIVE, and normalize in Engine?
    // The current FinanceEngine takes 'amount' and normalizes it.
    // Let's stick to: amount = raw signed amount in 'currency'. Engine handles conversion.

    source: string; // "IBKR", "PP", "Binance"
    account?: string; // "Espèces PEA", etc.
    raw?: any;

    // Metadata for robust tracking
    isin?: string;
    description?: string;
}

export interface UnifiedResult {
    transactions: UnifiedTransaction[];
    symbols: string[];
}

export interface UnifiedImporter {
    import(config: any): Promise<UnifiedResult>;
}
