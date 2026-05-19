
import { parsePortfolioPerformanceXml } from './lib/parsers/xml-pp.ts';
import { parseIbkrCsv } from './lib/parsers/csv.ts';
import { calculatePerformance } from './lib/finance/engine.ts';
import fs from 'fs';

async function main() {
    const xmlContent = fs.readFileSync('private/portfolio-performance-source.xml', 'utf-8');
    const csvContent = fs.readFileSync('test/import/U17749253.TRANSACTIONS.20250203.20260512.csv', 'utf-8');

    const xmlTx = parsePortfolioPerformanceXml(xmlContent);
    const csvTx = parseIbkrCsv(csvContent);
    
    const unifiedCsvTx = csvTx.map(t => ({
        id: Math.random().toString(36).substring(7),
        type: t.type as any,
        date: t.date,
        symbol: t.symbol,
        quantity: t.quantity,
        amount: t.amount,
        price: t.price,
        currency: t.currency,
        account: 'IBKR',
        source: 'IBKR',
        description: t.description
    }));

    const allTx = [...xmlTx, ...unifiedCsvTx];
    
    const mockPrices = {
        'CW8.PA': 500,
        'DG.PA': 100,
        'MC.PA': 800,
        'MA': 500,
        'FICO': 1000,
        'FTNT': 80,
        'MSCI': 600,
        'GOOG': 180
    };

    const result = await calculatePerformance(allTx as any, mockPrices);
    const latest = result.metrics[result.metrics.length - 1];

    console.log('--- RESULTS ---');
    console.log('Invested Capital:', latest.investedCapital);
    console.log('Total Value:', latest.totalValue);
    console.log('Cash Balance:', latest.cashBalance);
    
    const cents = latest.investedCapital % 1;
    if (Math.abs(cents) > 0.001) {
        console.log('WARNING: Invested Capital has cents:', cents);
        
        let cap = 0;
        for (const t of allTx) {
            if (t.type === 'DEPOSIT' || t.type === 'WITHDRAWAL') {
                cap += (t.amount || 0);
                if (Math.abs(cap % 1) > 0.001) {
                    console.log('Cents found after:', t.type, t.date, t.amount, t.description, t.source);
                    // Don't break, see if it gets worse
                }
            }
        }
    } else {
        console.log('SUCCESS: Invested Capital is round.');
    }
}

main().catch(console.error);
