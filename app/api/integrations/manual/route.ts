import { NextRequest, NextResponse } from 'next/server';
import { MasterStore } from '../../../../lib/core/persistence/master-store';
import { MasterAnalyzer } from '../../../../lib/finance/master-analyzer';
import { UnifiedTransaction } from '../../../../lib/parsers/importers/types';

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();
        const { transactionType, ticker, name, date, quantity, price, source } = data;

        if (!transactionType || !date || isNaN(parseFloat(price))) {
            return NextResponse.json({ error: 'Missing required fields or invalid price' }, { status: 400 });
        }

        const q = parseFloat(quantity) || 0;
        const p = parseFloat(price);
        const txSource = source || 'Manual Import';

        // Create Unified Transaction
        const transaction: UnifiedTransaction = {
            date: new Date(date),
            type: transactionType as any,
            symbol: transactionType === 'DEPOSIT' ? 'CASH' : ticker.toUpperCase(),
            quantity: transactionType === 'DEPOSIT' || transactionType === 'DIVIDEND' ? 0 : q,
            price: p,
            // Cash Impact calculation:
            // BUY: Negative (spending money)
            // SELL: Positive (receiving money)
            // DEPOSIT: Positive (adding money)
            // DIVIDEND: Positive (receiving money)
            amount: (transactionType === 'BUY' ? -(q * p) : (transactionType === 'SELL' ? (q * p) : p)),
            currency: 'EUR',
            source: txSource,
            description: name || `${transactionType} of ${ticker || 'CASH'}`
        };

        // Load current master data
        const masterData = MasterStore.load();

        // Manual Import is a distinct source. 
        // We fetch existing manual ones and add the new one (appending to maintain history).
        const existingManual = masterData.transactions.filter(t => t.source === txSource);
        const newManualBatch = [...existingManual, transaction];

        MasterStore.updateTransactionsForSource(txSource, newManualBatch);

        // Recompute everything
        console.log(`[MANUAL] Recomputing portfolio after ${transactionType}...`);
        await MasterAnalyzer.recomputeAndPersist();

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('Manual Import Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
