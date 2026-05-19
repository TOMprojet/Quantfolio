import { getYahooHistoricalPrices } from './lib/api/yahoo.js';
import { subDays } from 'date-fns';

async function main() {
    const prices = await getYahooHistoricalPrices('NOV.DE', new Date('2025-12-01'), new Date());
    const last2025 = prices.filter(p => new Date(p.date).getFullYear() === 2025).pop();
    const thisYear = prices.filter(p => new Date(p.date).getFullYear() === 2026);
    const first2026 = thisYear[0];
    const last2026 = thisYear[thisYear.length - 1];
    
    console.log("Last 2025:", last2025);
    console.log("First 2026:", first2026);
    console.log("Last 2026:", last2026);
    
    if (last2025 && last2026) {
        const perf = ((last2026.close - last2025.close) / last2025.close) * 100;
        console.log("Calculated YTD:", perf.toFixed(2) + "%");
    }
}

main().catch(console.error);
