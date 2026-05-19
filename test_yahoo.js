const y = require('./lib/api/yahoo.ts');

async function test() {
    console.log('--- Fundamentals ---');
    const f = await y.getYahooFundamentals('NOV.DE');
    console.log(JSON.stringify(f, null, 2));

    console.log('\n--- History (YTD) ---');
    const start = new Date('2026-01-01');
    const end = new Date('2026-05-16');
    const h = await y.getYahooHistoricalPrices('NOV.DE', start, end);
    console.log(`Found ${h.length} points.`);
    if (h.length > 0) {
        console.log('First point:', h[0]);
        console.log('Last point:', h[h.length - 1]);
        const perf = ((h[h.length - 1].close - h[0].close) / h[0].close) * 100;
        console.log('YTD Perf (Calculated from points):', perf.toFixed(2) + '%');
    }
}

test().catch(e => console.error(e));
