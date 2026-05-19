import { ChainClient } from '../integrations/chain-client';
import { UnifiedTransaction, ImportResult } from './types';
import { isSpamAsset } from '../../../config/blacklist';
import { getHistoricalPrices } from '../market-data';
import { startOfDay, format } from 'date-fns';

const normalizeCrypto = (s: string) => {
    if (!s) return s;
    if (s === 'BTC') return 'BTC-USD';
    if (s === 'ETH') return 'ETH-USD';
    if (s === 'SOL') return 'SOL-USD';
    if (s !== 'CASH' && s !== 'EUR.USD' && !s.includes('-') && !s.includes('=') && !s.includes('.')) return `${s}-USD`;
    return s;
};

export class CryptoImporter {
    private client = new ChainClient();

    public async import(integrations: any): Promise<ImportResult> {
        const transactions: UnifiedTransaction[] = [];
        const symbols = new Set<string>();

        // Metamask / Ledger / EVM Integrations
        const sources = [];
        if (integrations.metamask) {
            const m = Array.isArray(integrations.metamask) ? integrations.metamask : [integrations.metamask];
            sources.push(...m.map((a: any) => ({ ...a, type: 'MetaMask' })));
        }
        if (integrations.ledger) {
            const l = Array.isArray(integrations.ledger) ? integrations.ledger : [integrations.ledger];
            console.log(`[CRYPTO-IMPORTER] Found ${l.length} Ledger accounts.`);
            sources.push(...l.map((a: any) => ({ ...a, type: 'Ledger' })));
        }

        for (const account of sources) {
            if (account.address) {
                try {
                    console.log(`[CRYPTO-IMPORTER] Fetching History for ${account.type} ${account.address}`);
                    const rawHistory = await this.client.getTransactionHistory(account.address);

                    // Backfill Pricing for Performance Logic
                    // Group by Symbol/Date to minimize API calls?
                    // Actually getHistoricalPrices takes a symbol list and range.

                    // 1. Identify Symbols appearing in history
                    const historySymbols = new Set<string>();
                    rawHistory.forEach(tx => {
                        if (tx.symbol) historySymbols.add(normalizeCrypto(tx.symbol));
                    });

                    // 2. We need prices for ALL transaction dates. This is too heavy for fetching ONE big range for all dates?
                    // NO, `getHistoricalPrices` fetches range. Let's fetch last 5 years for these symbols.
                    // Wait, `getHistoricalPrices` uses Yahoo.
                    // Optimization: Only fetch for symbols found.

                    // Let's iterate and build result.
                    // NOTE: We will do a "best effort" backfill later or PER transaction if we want specific day?
                    // No, fetching 5 years of daily data for 5-10 coins is fine.

                    const uniqueSyms = Array.from(historySymbols);
                    const end = new Date();
                    const start = new Date(new Date().setFullYear(end.getFullYear() - 3)); // 3 Years history limit for pricing

                    // This might be slow if many symbols. 
                    // But essential for "Cost Basis".
                    const pricesMap: Record<string, Record<string, number>> = {};
                    if (uniqueSyms.length > 0) {
                        console.log(`[CRYPTO-IMPORTER] Fetching historical prices for ${uniqueSyms.length} assets to calculate Cost Basis...`);
                        try {
                            const histData = await getHistoricalPrices(uniqueSyms, start, end);
                            Object.entries(histData).forEach(([sym, data]) => {
                                pricesMap[sym] = {};
                                data.forEach(p => {
                                    const dKey = format(p.date, 'yyyy-MM-dd');
                                    pricesMap[sym][dKey] = p.close;
                                });
                            });
                        } catch (e) {
                            console.warn("[CRYPTO-IMPORTER] Price Fetch Debug", e);
                        }
                    }

                    // 3. Process Transactions
                    for (const tx of rawHistory) {
                        if (isSpamAsset(tx.symbol)) continue;

                        const sym = normalizeCrypto(tx.symbol);
                        const dKey = format(tx.date, 'yyyy-MM-dd');

                        // Find Historical Price at tx date
                        // Default to current 0 if not found (will results in 0 cost basis -> infinite perf if not handled)
                        // If we can't find price, we can't calculate Invested Capital.
                        let histPrice = pricesMap[sym]?.[dKey] || 0;

                        if (histPrice === 0) {
                            console.log(`[CRYPTO-DEBUG] Missing Price for ${sym} on ${dKey}. Will trigger Popup.`);
                        } else {
                            // console.log(`[CRYPTO-DEBUG] Found Price for ${sym} on ${dKey}: ${histPrice}`);
                        }

                        // Fallback: If price 0, look for closest previous?
                        // Implemented in finance-engine, but here we need it for 'amount'.

                        let amount = 0;
                        if (tx.type === 'BUY') {
                            // Cost = Quantity * Price
                            amount = -(tx.quantity * histPrice); // Negative because it's an OUTFLOW of value (investment)
                            // Wait, usually 'amount' in IBKR is signed: -100 EUR buy +1 share.
                            // Here we don't have Cash Flow.
                            // We are simulating the "Deposit" aspect.
                            // If we set amount = -Value, the engine sees it as spending Cash.
                            // But wallet has 0 Cash.
                            // So Cash Balance goes negative.
                            // User says: "Le deposit étant nul... considère comme le deposit le moment ou j'achète".
                            // This means we should treat it as a DEPOSIT of value equivalent to the buy?
                            // If I set `amount = 0` and `investedCapital` derivation logic in engine...
                            // Engine: `if (type === 'BUY') { cash += amount; holdings += qty }`
                            // If amount is 0, Cash is unchanged. Holding increases. Cost Basis is 0.
                            // We want Cost Basis to be `qty * price`.

                            // FIX: We need to tell Engine the "Invested Capital" for this Buy.
                            // Engine calculates derived Invested Capital from DEPOSITS.
                            // But here we have no Deposits.
                            // We need to inject a Virtual Deposit?
                            // Or modify Engine to handle "Unfunded Buys" as implicit Capital Injection.

                            // Let's use a workaround:
                            // Create a synthetic DEPOSIT transaction just before the BUY?
                            // "Just in Time Funding".
                            // Yes, that is safer.

                            if (histPrice > 0) {
                                const cost = tx.quantity * histPrice;
                                // We REMOVE the naive Auto-Funding here to avoid double-counting.
                                // The finance-engine will detect negative cash and inject "Smart Capital" if needed.
                                amount = -cost;
                            }
                        } else if (tx.type === 'SELL') {
                            // Sell means we get EUR back (Virtual)
                            if (histPrice > 0) {
                                const value = tx.quantity * histPrice;
                                amount = value;
                                // And we withdraw it? Or keep as virtual cash?
                                // Let's keep it as virtual cash for now.
                            }
                        }

                        transactions.push({
                            date: tx.date,
                            type: tx.type,
                            symbol: sym,
                            quantity: tx.quantity,
                            price: histPrice, // Store the historical price!
                            amount: amount,
                            currency: 'EUR',
                            source: `MetaMask-${account.address.substring(0, 6)}`
                        });

                        symbols.add(sym);
                    }

                } catch (e) {
                    console.error("[CRYPTO-IMPORTER] Error", e);
                }
            }
        }

        return {
            assets: [],
            transactions,
            symbols: Array.from(symbols)
        };
    }
}
