import { getHistoricalPrices, getAssetsMetadata, getRealTimePrice } from '../lib/finance/market-data-service';

async function checkRealPrices() {
    const sym = 'GOOG';
    console.log('--- LIVE PRICE AUDIT ---');

    const meta = await getAssetsMetadata([sym]);
    console.log('Metadata for GOOG:');
    console.log(JSON.stringify(meta[sym], null, 2));

    const realTime = await getRealTimePrice(sym);
    console.log('Real-Time Price (quote):', realTime);

    const hist = await getHistoricalPrices([sym], new Date('2026-01-15'), new Date());
    console.log('Historical (last 5 entries):');
    console.log(hist[sym]?.slice(-5));
}

checkRealPrices().catch(console.error);
