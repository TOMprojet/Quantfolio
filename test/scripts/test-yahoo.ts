// @ts-nocheck

const pkg = require('yahoo-finance2');
const yahooFinance = pkg.default || pkg;

async function testConnection() {
    console.log("Testing Yahoo Finance Connectivity...");

    // Suppress if needed
    if (yahooFinance.suppressNotices) {
        yahooFinance.suppressNotices(['yahooSurvey']);
    }

    const symbols = ['MC.PA', 'E3G1.F', 'PSP5.PA', 'BTC-USD'];

    for (const sym of symbols) {
        try {
            console.log(`Fetching ${sym}...`);
            const q = await yahooFinance.quoteSummary(sym, { modules: ['price'] });
            const price = q.price?.regularMarketPrice;
            console.log(`✅ Success ${sym}: ${price} ${q.price?.currency}`);
        } catch (e: any) {
            console.error(`❌ Failed ${sym}:`, e.message);
        }
    }
}

testConnection();
