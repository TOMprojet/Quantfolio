// @ts-nocheck
import { getRealTimePrice, getAssetsMetadata } from '../../lib/finance/market-data-service';

async function verifyLivePricing() {
    const tickers = ['GOOG', 'BTC-USD', 'ETH-USD', 'ASML.AS', 'MC.PA'];
    console.log('--- RE-VERIFYING LIVE DATA ---');

    for (const t of tickers) {
        try {
            const price = await getRealTimePrice(t);
            const meta = await getAssetsMetadata([t]);
            console.log(`${t.padEnd(10)} | Quote Price: ${String(price).padStart(8)} | Meta Price: ${String(meta[t]?.currentPrice).padStart(8)} | Currency: ${meta[t]?.currency}`);
        } catch (e: any) {
            console.log(`${t.padEnd(10)} | ERROR: ${e.message}`);
        }
    }
}

verifyLivePricing().catch(console.error);
