import fs from 'fs';
import path from 'path';
import { parseIbkrCsv } from '../csv';
import { UnifiedTransaction, UnifiedResult, UnifiedImporter } from './types';

// Helper to normalize IBKR symbols
const normalizeIbkr = (s: string) => {
    if (!s) return s;
    if (s === 'BTC') return 'BTC-USD';
    if (s === 'ETH') return 'ETH-USD';
    return s;
};

const isIntegrationEnabled = (key: string): boolean => {
    try {
        const jsonPath = path.join(process.cwd(), 'private', 'integrations.json');
        if (!fs.existsSync(jsonPath)) return false;
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        return data[key] && Array.isArray(data[key]) && data[key].length > 0;
    } catch {
        return false;
    }
};

export class IbkrImporter implements UnifiedImporter {
    public async import(dataDir: string): Promise<UnifiedResult> {
        if (!isIntegrationEnabled('interactive brokers') && !isIntegrationEnabled('ibkr')) {
            return { transactions: [], symbols: [] };
        }

        const privateCsv = path.join(process.cwd(), 'private', 'ibkr-data.csv');
        let csvPath = "";

        if (fs.existsSync(privateCsv)) {
            csvPath = privateCsv;
        } else if (fs.existsSync(dataDir)) {
            const files = fs.readdirSync(dataDir);
            const ibkrFile = files.find(f =>
                f.endsWith('.csv') &&
                (f.includes('U1') || f.includes('TRANSACTIONS')) &&
                !f.toLowerCase().includes('ledger')
            );
            if (ibkrFile) csvPath = path.join(dataDir, ibkrFile);
        }

        if (!csvPath || !fs.existsSync(csvPath)) {
            console.log('[IBKR-IMPORTER] No CSV data found.');
            return { transactions: [], symbols: [] };
        }

        const rawContent = fs.readFileSync(csvPath, 'utf8');
        const rawTxs = parseIbkrCsv(rawContent);

        console.log(`[IBKR-IMPORTER] Total TXs: ${rawTxs.length}`);

        // Convert to UnifiedTransaction
        const transactions: UnifiedTransaction[] = rawTxs.map(t => ({
            date: t.date,
            type: t.type as any,
            symbol: normalizeIbkr(t.symbol || ''),
            quantity: t.quantity || 0,
            price: t.price || 0,
            amount: t.amount || 0,
            amountEur: t.amountEur,
            currency: t.currency || 'EUR',
            source: 'IBKR',
            account: 'IBKR Main',
            description: t.description
        }));

        // Collect Symbols
        const symbols = new Set<string>();
        transactions.forEach(t => {
            if (t.symbol && t.symbol !== 'CASH' && !t.symbol.includes('EUR.USD')) {
                symbols.add(t.symbol);
            }
        });

        return {
            transactions,
            symbols: Array.from(symbols)
        };
    }
}
