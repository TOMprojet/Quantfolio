import { LOCAL_LOGOS } from './constants';

/**
 * Centralized formatting utilities for the Quantfolio application.
 * Ensures consistent rendering of currencies, percentages, and dates.
 */

export const getAssetLogoUrl = (symbol: string, name: string = '', website: string = '') => {
    // 1. Crypto Handling
    const isCrypto = symbol.endsWith('-USD') || ['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'BNB', 'BTC-USD'].includes(symbol.split('-')[0]);
    if (isCrypto) {
        const clean = symbol.toLowerCase().replace('usdt', 'usdt').replace('-usd', '').split('-')[0];
        if (clean === 'btc') return 'https://assets.coincap.io/assets/icons/btc@2x.png';
        return `https://assets.coincap.io/assets/icons/${clean}@2x.png`;
    }

    // 2. Local Logos (High Priority)
    const symbolKey = symbol.replace(/\..*$/, '');
    const lookupKey = name ? name.split(' ')[0].toUpperCase() : '';
    const localFile = LOCAL_LOGOS[symbolKey] || (lookupKey ? LOCAL_LOGOS[lookupKey] : undefined);
    
    if (localFile) return `/logo/${localFile}`;

    // 3. Fallback to assuming a .png exists with the exact symbol name
    return `/logo/${symbolKey}.png`;
};

export const formatCurrency = (value: number, currency: string = 'EUR', hideValue: boolean = false) => {
    if (hideValue) {
        const symbolMap: Record<string, string> = { 'EUR': '€', 'USD': '$', 'GBP': '£' };
        return (symbolMap[currency] || currency) + ' ***';
    }

    try {
        // Use Intl.NumberFormat for broad currency support
        // We use 'fr-FR' locale for consistent number formatting (comma decimal)
        // while the currency parameter handles the symbol and its position.
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    } catch (e) {
        // Fallback for custom or unrecognized currency codes
        const formattedValue = value.toLocaleString('fr-FR', { 
            minimumFractionDigits: 2, 
            maximumFractionDigits: 2 
        });
        return formattedValue + ' ' + currency;
    }
};

export const formatPercent = (value: number, includeSign: boolean = false) => {
    const sign = (includeSign && value > 0) ? '+' : '';
    return sign + (value || 0).toFixed(2) + '%';
};

export const formatPercentage = formatPercent;

export const formatNumber = (value: number, precision: number = 2) => {
    return value.toLocaleString('fr-FR', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision
    });
};

/**
 * Smart formatting for stock quantities/prices that might need more or less precision.
 */
export const formatSmart = (val: number, isQty: boolean = false, isCrypto: boolean = false) => {
    if (val === 0) return '0';
    if (isQty && isCrypto) return val.toFixed(6); // More decimals for crypto qty
    if (Math.abs(val) < 0.01) return val.toFixed(4);
    return val.toFixed(2).replace(/\.?0+$/, '');
};

/**
 * Maps Yahoo Finance exchange codes to full names.
 */
export const getExchangeName = (code: string) => {
    if (!code) return '';
    const clean = code.toUpperCase();
    
    const mapping: Record<string, string> = {
        'NYQ': 'NYSE',
        'NMS': 'NASDAQ',
        'NGM': 'NASDAQ',
        'PCX': 'NYSE Arca',
        'AMS': 'Euronext Amsterdam',
        'PAR': 'Euronext Paris',
        'BRU': 'Euronext Brussels',
        'LIS': 'Euronext Lisbon',
        'MIL': 'Borsa Italiana',
        'MAD': 'Bolsa de Madrid',
        'FRA': 'Frankfurt',
        'GER': 'Frankfurt',
        'ETR': 'XETRA',
        'LSE': 'London',
        'TOR': 'Toronto',
        'VAN': 'TSX Venture',
        'ASX': 'Sydney',
        'HKG': 'Hong Kong',
        'NSI': 'NSE India',
        'BOM': 'BSE India',
        'SES': 'Singapore',
        'OSA': 'Osaka',
        'TKS': 'Tokyo',
        'STO': 'Stockholm',
        'OSL': 'Oslo',
        'CPH': 'Copenhagen',
        'HEL': 'Helsinki',
        'SWX': 'SIX Swiss',
        'IOB': 'London IOB',
        'NZE': 'New Zealand',
        'EBS': 'SIX Swiss',
    };

    return mapping[clean] || clean;
};

/**
 * Translates Yahoo Finance sectors to French.
 */
export const translateSector = (sector: string) => {
    if (!sector) return '';
    const mapping: Record<string, string> = {
        'Technology': 'Technologie',
        'Healthcare': 'Santé',
        'Financial Services': 'Services Financiers',
        'Consumer Cyclical': 'Consommation Cyclique',
        'Industrials': 'Industrie',
        'Communication Services': 'Services de Communication',
        'Consumer Defensive': 'Consommation Défensive',
        'Energy': 'Énergie',
        'Real Estate': 'Immobilier',
        'Basic Materials': 'Matériaux de Base',
        'Utilities': 'Services Publics',
        'Financial': 'Finance',
        'Consumer Goods': 'Biens de Consommation',
        'Services': 'Services',
        'None': 'N/A'
    };
    return mapping[sector] || sector;
};

/**
 * Normalizes asset names for display, fallback to symbol if metadata is missing.
 */
export const getAssetDisplayName = (symbol: string, metadata: any, isCrypto: boolean = false) => {
    const name = metadata?.name || symbol;
    if (!isCrypto) return name;
    
    // For crypto, often symbols are like BTC-USD, we want BTC
    return symbol.replace('-USD', '').replace('USDT', '').replace('USDC', '');
};
