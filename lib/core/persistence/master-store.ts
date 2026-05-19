
import fs from 'fs';
import path from 'path';
import { UnifiedTransaction } from '../importers/types';

const MASTER_PATH = path.join(process.cwd(), 'private/portfolio-master.json');

export interface AssetSnapshot {
    symbol: string;
    quantity: number;
    value: number; // Current Market Value (EUR)
    costBasisEur: number; // Total Cost Basis in EUR
    nativePrice: number; // Last known price
    nativeCurrency: string; // Original currency (e.g. USD)
    pruEur: number; // Unit Cost Price
    pruNative: number; // Unit Cost Price (Original Currency)
    pnl: number; // Total PnL in EUR
    pnlNative: number; // Total PnL in Native Currency
    performance: number; // Total Performance %
    cagr?: number; // Compound Annual Growth Rate
    firstBuyDate?: string;
    sources: string[];
}

export interface PortfolioMasterData {
    transactions: UnifiedTransaction[];
    assets: Record<string, AssetSnapshot>;
    closedHoldings?: any[]; // NEW: Store sold positions
    metrics: any[]; // Stores the Daily Metrics (TWR, etc)
    lastUpdated: string;
    lastComputed?: string; // NEW: Track precisely when the engine last ran
    sources: string[];
}

// Initial Empty State
const EMPTY_STATE: PortfolioMasterData = {
    transactions: [],
    assets: {},
    metrics: [],
    lastUpdated: new Date().toISOString(),
    lastComputed: undefined,
    sources: []
};

export class MasterStore {

    static load(): PortfolioMasterData {
        if (!fs.existsSync(MASTER_PATH)) {
            return { ...EMPTY_STATE };
        }
        try {
            const raw = fs.readFileSync(MASTER_PATH, 'utf8');
            const data = JSON.parse(raw);
            // Ensure schema integrity (backwards compat)
            if (!data.transactions) data.transactions = [];
            if (!data.assets) data.assets = {};
            if (!data.metrics) data.metrics = [];
            return data;
        } catch (e) {
            console.error("Failed to load Portfolio Master:", e);
            return { ...EMPTY_STATE };
        }
    }

    static save(data: PortfolioMasterData) {
        data.lastUpdated = new Date().toISOString();
        // Sort transactions by date ensure chronological order
        data.transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        fs.writeFileSync(MASTER_PATH, JSON.stringify(data, null, 2), 'utf8');
    }

    /**
     * Updates transactions for a specific source (Integration).
     * Replaces ALL transactions for that source with the new batch.
     */
    static updateTransactionsForSource(sourceName: string, newTxs: UnifiedTransaction[]) {
        const current = this.load();

        // 1. Remove old transactions for this source
        const otherTxs = current.transactions.filter(t => t.source !== sourceName);

        // 2. Normalize New Txs (Add Source Tag)
        const taggedTxs = newTxs.map(t => ({
            ...t,
            source: sourceName,
            // Ensure dates are strings or Date objects consistency? 
            // JSON stringifies Dates. Let's keep them as objects if in memory, but stringified on disk.
            date: new Date(t.date)
        }));

        // 3. Merge
        current.transactions = [...otherTxs, ...taggedTxs];

        // 4. Update Sources list
        const sourceSet = new Set(current.sources);
        sourceSet.add(sourceName);
        current.sources = Array.from(sourceSet);

        // NOTE: We do NOT calculate Assets here. That's the Job of the Engine Runner.
        // We just save the "Raw" consolidated history.
        this.save(current);

        return current;
    }

    static updateComputedData(assets: Record<string, AssetSnapshot>, metrics: any[], closedHoldings?: any[]) {
        const current = this.load();
        current.assets = assets;
        current.metrics = metrics;
        if (closedHoldings) current.closedHoldings = closedHoldings;
        current.lastComputed = new Date().toISOString(); // Update computation timestamp
        this.save(current);
    }

    /**
     * Deletes transactions that match the given predicate.
     * Use this to clear data when an integration is removed.
     */
    static deleteTransactions(predicate: (t: UnifiedTransaction) => boolean): number {
        const current = this.load();
        const originalCount = current.transactions.length;
        current.transactions = current.transactions.filter(t => !predicate(t));
        const deletedCount = originalCount - current.transactions.length;

        if (deletedCount > 0) {
            console.log(`[MASTER] Deleted ${deletedCount} transactions.`);
            this.save(current);
        }
        return deletedCount;
    }
}
