import fs from 'fs';
import path from 'path';
import { UnifiedTransaction, ImportResult } from './types';
import { parseLedgerCsv } from '../ledger';

export class LedgerImporter {
    public async import(dataDir: string): Promise<ImportResult> {
        let csvPath = "";

        // Strategy 1: Look for any CSV containing 'ledger' in /private
        const privateDir = path.join(process.cwd(), 'private');
        if (fs.existsSync(privateDir)) {
            const files = fs.readdirSync(privateDir);
            const ledgerFile = files.find(f => f.toLowerCase().includes('ledger') && f.endsWith('.csv'));
            if (ledgerFile) {
                csvPath = path.join(privateDir, ledgerFile);
                console.log(`[LEDGER-IMPORTER] Found Ledger CSV: ${csvPath}`);
            }
        }

        if (!csvPath) {
            // Fallback strategy 2: data dir
            if (fs.existsSync(dataDir)) {
                const files = fs.readdirSync(dataDir);
                const ledgerFile = files.find(f => f.toLowerCase().includes('ledger') && f.endsWith('.csv'));
                if (ledgerFile) csvPath = path.join(dataDir, ledgerFile);
            }
        }

        if (!csvPath) {
            console.log(`[LEDGER-IMPORTER] No Ledger CSV found.`);
            return { assets: [], transactions: [], symbols: [] };
        }

        try {
            const rawCsv = fs.readFileSync(csvPath, 'utf8');
            const parsedTxs = parseLedgerCsv(rawCsv);
            const symbols = new Set<string>();
            const validTransactions: UnifiedTransaction[] = [];

            console.log(`[LEDGER-IMPORTER] Parsed ${parsedTxs.length} raw transactions.`);

            parsedTxs.forEach(tx => {
                if (tx.quantity === 0) return;

                const sym = tx.symbol.toUpperCase();
                symbols.add(sym);

                validTransactions.push({
                    date: tx.date,
                    type: tx.type,
                    symbol: sym,
                    quantity: tx.quantity,
                    price: tx.price, 
                    amount: tx.amount, 
                    currency: tx.currency,
                    source: 'Ledger CSV'
                });
            });

            console.log(`[LEDGER-IMPORTER] Imported ${validTransactions.length} valid transactions.`);

            return {
                assets: [],
                transactions: validTransactions,
                symbols: Array.from(symbols)
            };

        } catch (e) {
            console.error("[LEDGER-IMPORTER] Error", e);
            return { assets: [], transactions: [], symbols: [] };
        }
    }
}
