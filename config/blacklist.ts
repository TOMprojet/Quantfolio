// Liste noire centralisée pour les tokens spam, scam ou indésirables.

// 1. SCAMS AVÉRÉS : À bloquer totalement (Ignore Transaction)
export const SCAM_TOKENS = [
    'PTH', 'ALB', 'CHC', 'SHG', 'WAI', 'FAKETAXI', 'BASED', 'SKYA',
    'CRB', 'LUNAR', 'MECA', 'ELW', 'SHL', 'MFST', 'COOK', 'TOXIC', 'BEE',
    'MINEREUM', 'BESTAIRDROP', 'THE DALAI LAMA', 'PEPEBET', 'METRO',
    'CUDIS', 'PUFFER', 'TAG', 'OIK', 'ESPORTS', 'TROLL', 'ANI', 'CBXRP',
    'BASEVERSE', 'CHILLLUNA', 'LILPEPE', 'CILA', 'HODC', 'STBR',
    'ULTI', 'MYX', 'DOX', 'META', 'KIBA', 'KING', 'MILK', 'ALPHA',
    'KNG', 'TIX', 'FIRE', 'BASEVERSE', 'DAS', 'GEMINI3', 'KIMO', 'EPEPE', 'BASEVERSE BY VIRTUALS'
];

export const HIDDEN_TOKENS = [
    'PEPE' // User Request to hide (Dust/Not Owned)
];

export const SCAM_KEYWORDS = [
    'Claim', 'Visit', 'Access', 'http', 'https', 'www.', '.com', '.io', '.org', '.xyz',
    'voucher', 'reward', 'Airdrop', 'Winner', 'Official'
];

// ...

// Vérifie si c'est un token masqué par l'utilisateur
export function isHidden(symbol: string): boolean {
    if (!symbol) return false;
    const s = symbol.toUpperCase();
    return HIDDEN_TOKENS.includes(s);
}

// Vérifie si c'est un Scam pur et dur
export function isScam(symbol: string): boolean {
    if (!symbol) return false;
    const s = symbol.toUpperCase();
    if (SCAM_TOKENS.includes(s)) return true;
    if (HIDDEN_TOKENS.includes(s)) return true; // Also hide Hidden tokens effectively
    if (SCAM_KEYWORDS.some(k => s.includes(k.toUpperCase()))) return true;
    // Filter out symbols that look like shorter contract addresses often used by bots
    if (s.startsWith('TOK-') || (s.startsWith('0X') && s.length > 5)) return true;
    return false;
}

// 2. TOKENS SUSPECTS OU AMBIGUS : À importer avec prudence (Coût 0, pas d'impact Cash)
export const SUSPECT_TOKENS = [
    'RSR', 'PEPE', 'USDT'
];

// Vérifie si c'est un actif ambigu (nécessite import coût 0)
export function isSuspect(symbol: string): boolean {
    if (!symbol) return false;
    const s = symbol.toUpperCase();
    return SUSPECT_TOKENS.includes(s);
}

// Legacy wrapper (pour compatibilité immédiate, pointe vers Scam)
export function isSpamAsset(symbol: string): boolean {
    return isScam(symbol);
}
