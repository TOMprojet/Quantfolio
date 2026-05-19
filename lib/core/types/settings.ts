export interface FinanceSettings {
    cashSources: string[];
    ignoredAssetSources: string[];
    fiatCurrency: string;
    privacyMode?: boolean;
    theme?: 'light' | 'dark' | 'system';
    watchlist?: string[];
    fairPrices?: Record<string, number>;
}
