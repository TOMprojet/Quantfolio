
export interface AssetType {
    isCrypto: boolean;
    isEtf: boolean;
    isEurStock: boolean;
    isCash: boolean;
    nativeCurrency: string;
    displayCurrency: string;
}

const EUR_SUFFIXES = ['.PA', '.DE', '.AS', '.MI', '.MC', '.VI', '.F', '.AT', '.BE', '.FI', '.BR', '.LS', '.IR', '.MA'];

const CRYPTO_KEYWORDS = ['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'BNB', 'MATIC', 'LINK', 'PEPE', 'OM', 'BGB', 'RSR'];

export function classifyAsset(symbol: string, name?: string, sector?: string, currency?: string): AssetType {
    const s = (symbol || '').toUpperCase();
    const n = (name || '').toUpperCase();
    
    const isCash = s.startsWith('CASH:') || s === 'CASH' || s.includes('LIQUIDITÉS') || s.includes('ESPÈCES');
    
    const isEtf = s.includes('PSP5') || s.includes('CW8') || s.includes('PUST') || n.includes('ETF') || n.includes('AMUNDI');
    
    const isCrypto = !isEtf && (
        sector === 'Crypto' || 
        s.endsWith('-USD') || 
        CRYPTO_KEYWORDS.some(k => s.includes(k))
    );
    
    const isEurStock = !isCrypto && !isEtf && !isCash && (
        EUR_SUFFIXES.some(suffix => s.endsWith(suffix)) ||
        sector === 'Financial Services' && s.endsWith('.PA') // specific cases
    );

    // Native currency: The currency of the market price
    // Priority 1: Provided currency from metadata or imports
    // Priority 2: Inferred from suffix (.PA, .DE, .AS)
    let nativeCurrency: string = (isEurStock || (isEtf && (s.endsWith('.PA') || s.endsWith('.AS') || s.endsWith('.DE')))) ? 'EUR' : 'USD';
    
    if (currency && currency.trim()) {
        nativeCurrency = currency.toUpperCase();
    }

    // Display currency: Always EUR for this user's dashboard configuration
    const displayCurrency = 'EUR';

    return {
        isCrypto,
        isEtf,
        isEurStock,
        isCash,
        nativeCurrency,
        displayCurrency
    };
}
