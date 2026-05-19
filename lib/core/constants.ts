export const ASSET_NAMES: Record<string, string> = {
    'ANET': 'Arista Networks',
    'TPL': 'Texas Pacific Land',
    'MSFT': 'Microsoft Corp',
    'NVDA': 'NVIDIA Corp',
    'FICO': 'Fair Isaac Corp',
    'GOOG': 'Alphabet Inc.',
    'FTNT': 'Fortinet Inc.',
    'MA': 'Mastercard Inc.',
    'LB': 'LandBridge Company',
    'MSCI': 'MSCI Inc.',
    'CW8.PA': 'Amundi MSCI World',
    'PSP5.PA': 'Amundi S&P 500 (PEA)',
    'PUST.PA': 'Amundi Nasdaq-100 (PEA)',
    'SP500': 'S&P 500',
    'NSDQ': 'Nasdaq 100',
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'SOL': 'Solana',
    'USDT': 'Tether',
    'ASML': 'ASML Holding',
    'MC': 'LVMH',
};

// Known local logos map (shared across components)
export const LOCAL_LOGOS: Record<string, string> = {
    'ANET': 'ANET.png', 'BITGET': 'Bitget.png', 'E3G1': 'E3G1.jpg', 'FICO': 'FICO.png',
    'FTNT': 'FTNT.png', 'GOOG': 'GOOG.png', 'IBKR': 'IBKR.png', 'LB': 'LB.png',
    'LEDGER': 'Ledger.jpg', 'MA': 'MA.png', 'MSCI': 'MSCI.png', 'MSFT': 'MSFT.png',
    'NOV': 'NOV.png', 'NVDA': 'NVDA.png', 'PP': 'PP.png', 'TPL': 'TPL.png',
    'ASML': 'ASML.png', 'MC': 'MC.png', 'PSP5': 'PSP5.png', 'PSP5.PA': 'PSP5.png',
    'CW8': 'CW8.png', 'CW8.PA': 'CW8.png', 'ENX': 'ENX.PA.png', 'ENX.PA': 'ENX.PA.png', 'ISRG': 'ISRG.jpg', 
    'AI': 'AI.PA.png', 'AI.PA': 'AI.PA.png', 'AIL': 'AI.PA.png', 'AIL.PA': 'AI.PA.png', 'DG': 'DG.PA.png', 'DG.PA': 'DG.PA.png', 'HO': 'HO.PA.png', 'HO.PA': 'HO.PA.png', 'OR': 'OR.PA.png', 'OR.PA': 'OR.PA.png',
    'RACE': 'RACE.MI.png', 'RACE.MI': 'RACE.MI.png', 'RMS': 'RMS.PA.jpg', 'RMS.PA': 'RMS.PA.jpg'
};

export const FAIR_PRICES: Record<string, number> = {
    'ANET': 150, 'TPL': 350, 'MSFT': 520, 'NVDA': 220, 'FICO': 1800,
    'CW8.PA': 500, 'PSP5.PA': 20, 'PUST.PA': 850, // Added rough fair prices
    'GOOG': 250, 'FTNT': 100, 'MA': 600, 'LB': 80,
    'MSCI': 650 // Added MSCI
};

export const FUNDAMENTALS: Record<string, any> = {
    "ANET": {
        per: 42.5, divYield: 0, roic: 32.4, roe: 38.1, marketCap: "95B", eps: 5.60, fcf: 6.10, price: 305.20,
        growth: { past5Y: 26.5, est5Y: 20.1 },
        historicalPE: 40.0
    },
    "LB": {
        per: 58.26, divYield: 0.8, roic: 17.4, roe: 43.2, marketCap: "3.2B", eps: 0.88, fcf: 3.47, price: 51.27,
        growth: { past5Y: 15.0, est5Y: 25.0 },
        historicalPE: 36.0 // 1Y Avg due to recent IPO
    },
    "MSFT": {
        per: 35.8, divYield: 0.7, roic: 28.1, roe: 39.5, marketCap: "3100B", eps: 11.80, fcf: 10.20, price: 420.50,
        growth: { past5Y: 19.4, est5Y: 15.3 },
        historicalPE: 33.5
    },
    "NVDA": {
        per: 72.4, divYield: 0.03, roic: 65.2, roe: 78.5, marketCap: "2800B", eps: 12.50, fcf: 13.10, price: 920.00,
        growth: { past5Y: 61.4, est5Y: 35.0 },
        historicalPE: 68.0
    },
    "GOOG": {
        per: 24.5, divYield: 0.5, roic: 25.8, roe: 29.1, marketCap: "2100B", eps: 6.50, fcf: 7.10, price: 175.20,
        growth: { past5Y: 24.7, est5Y: 16.4 },
        historicalPE: 24.8
    },
    "TPL": {
        per: 32.1, divYield: 0.69, roic: 45.2, roe: 52.1, marketCap: "18B", eps: 52.10, fcf: 55.40, price: 1650.00,
        growth: { past5Y: 17.2, est5Y: 11.9 },
        historicalPE: 42.5
    },
    "FICO": {
        per: 48.5, divYield: 0, roic: 35.2, roe: 41.5, marketCap: "28B", eps: 24.15, fcf: 26.50, price: 1250.00,
        growth: { past5Y: 22.4, est5Y: 26.6 },
        historicalPE: 55.0
    },
    "FTNT": {
        per: 40.2, divYield: 0, roic: 38.5, roe: 45.2, marketCap: "52B", eps: 2.09, fcf: 2.35, price: 75.50,
        growth: { past5Y: 40.5, est5Y: 11.7 },
        historicalPE: 54.0
    },
    "MA": {
        per: 36.5, divYield: 0.5, roic: 42.1, roe: 165.0, marketCap: "450B", eps: 13.92, fcf: 14.50, price: 480.20,
        growth: { past5Y: 16.0, est5Y: 15.5 },
        historicalPE: 39.5
    },
    "MSCI": {
        per: 38.2, divYield: 1.23, roic: 22.5, roe: 35.4, marketCap: "42B", eps: 14.50, fcf: 15.20, price: 560.10,
        growth: { past5Y: 15.2, est5Y: 12.4 },
        historicalPE: 46.0
    },
    "CW8.PA": {
        per: 22.5, divYield: 1.2, roic: 15.2, roe: 18.4, marketCap: "N/A", eps: 0, fcf: 0, price: 520.50,
        growth: { past5Y: 8.5, est5Y: 7.0 },
        historicalPE: 20.0
    },
};
