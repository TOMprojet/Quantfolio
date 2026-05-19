import Papa from 'papaparse';
import { PortfolioTransaction } from './csv-parser';
import { isScam, isSuspect } from '../../config/blacklist';

export function parseLedgerCsv(csvContent: string): PortfolioTransaction[] {
    const transactions: PortfolioTransaction[] = [];

    const parseResult = Papa.parse(csvContent.trim(), {
        skipEmptyLines: true,
        header: true, // Ledger CSV usually has headers
    });

    // Ledger Format:
    // Operation Date, Currency Ticker, Operation Type, Operation Amount, Operation Fees, ...

    // @ts-ignore
    parseResult.data.forEach((row: any) => {
        try {
            const dateStr = row['Operation Date'];
            if (!dateStr) return;

            const date = new Date(dateStr);
            const ticker = row['Currency Ticker'] || row['Currency Suggestion'] || 'UNK';

            // 1. SCAM CHECK: Block completely
            if (isScam(ticker)) return;

            // 2. SUSPECT CHECK: Zero Cost Import
            // If suspect (e.g. PEPE), we assume we already own it or it's an airdrop.
            // We do NOT generate a cash deposit.
            const isAmbiguous = isSuspect(ticker);

            const typeRaw = row['Operation Type']?.toUpperCase() || '';
            const amountRaw = parseFloat(row['Operation Amount'] || '0');
            const fees = parseFloat(row['Operation Fees'] || '0');

            // Extraction
            const quantity = Math.abs(amountRaw);

            // "Countervalue" logic
            // If Ambiguous, we force counterValue effects to 0 for Cash purposes
            let counterValue = parseFloat(row['Countervalue at Operation Date'] || '0');
            const counterCurrency = row['Countervalue Ticker'] || 'EUR';

            if (isAmbiguous) {
                // We keep the quantity, but we treat it as a "Free Transfer" (Cost 0)
                // This prevents adding fake Cash to the balance.
                // However, we still want the Asset to appear.
                // We set counterValue to 0, so 'DEPOSIT' (Cash) condition fails or adds 0.
                counterValue = 0;
            }
            const unitPrice = quantity > 0 ? counterValue / quantity : 0;

            if (typeRaw === 'IN') {
                // Double Entry: DEPOSIT (Cash In) -> BUY (Asset In, Cash Out)

                // 1. DEPOSIT (Funding the purchase)
                // Only if counterValue > 0 to avoid zero-entries
                if (counterValue > 0) {
                    transactions.push({
                        date,
                        type: 'DEPOSIT',
                        symbol: 'CASH',
                        quantity: counterValue,
                        price: 1,
                        amount: counterValue,
                        currency: counterCurrency
                    });
                }

                // 2. BUY (Asset)
                transactions.push({
                    date,
                    type: 'BUY',
                    symbol: normalizeSymbol(ticker),
                    quantity: quantity,
                    price: unitPrice || 0,
                    amount: -counterValue, // Spend Cash
                    currency: counterCurrency
                });

            } else if (typeRaw === 'OUT') {
                // Double Entry: SELL (Asset Out, Cash In) -> WITHDRAWAL (Cash Out)

                // 1. SELL (Asset)
                transactions.push({
                    date,
                    type: 'SELL',
                    symbol: normalizeSymbol(ticker),
                    quantity: quantity,
                    price: unitPrice || 0,
                    amount: counterValue, // Receive Cash
                    currency: counterCurrency
                });

                // 2. WITHDRAWAL (Funds leaving)
                if (counterValue > 0) {
                    transactions.push({
                        date,
                        type: 'WITHDRAWAL',
                        symbol: 'CASH',
                        quantity: counterValue,
                        price: 1,
                        amount: -counterValue,
                        currency: counterCurrency
                    });
                }

            } else if (typeRaw === 'FEES') {
                // Fix: Crypto Fees (Gas) are paid in Crypto, not EUR Cash.
                // We should only deduct Cash if the asset itself is Fiat (e.g. Bank Fee).
                const isFiatFee = ['EUR', 'USD'].includes(ticker.toUpperCase());

                transactions.push({
                    date,
                    type: 'FEE',
                    symbol: normalizeSymbol(ticker),
                    quantity: quantity,
                    price: 0,
                    amount: isFiatFee ? -counterValue : 0, // Only deduct cash if Fiat
                    currency: counterCurrency
                });
            }
        } catch (e) {
            // ignore row
        }
    });

    return transactions;
}

function normalizeSymbol(s: string): string {
    s = s.toUpperCase();
    if (s === 'BITCOIN' || s === 'BTC') return 'BTC-USD';
    if (s === 'ETHEREUM' || s === 'ETH') return 'ETH-USD';
    if (s === 'SOLANA' || s === 'SOL') return 'SOL-USD';
    // If it looks like a ticker without -USD, maybe append it? 
    // But be careful with stablecoins.
    // Let's stick to the majors to fix the user's immediate issue.
    // If it's not a known mapping, return as is (and let data-fetching handle it or blacklist it).
    return s;
}


