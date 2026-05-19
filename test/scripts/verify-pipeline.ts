// @ts-nocheck
import { MasterAnalyzer } from '../../lib/finance/master-analyzer';
import { getPortfolioData } from '../../lib/finance/data-fetching';

async function main() {
    console.log("--- 1. Triggering Analysis (Write) ---");
    await MasterAnalyzer.recomputeAndPersist();

    console.log("--- 2. Fetching Portfolio Data (Read) ---");
    const data = await getPortfolioData();

    console.log("--- Reliability Check ---");
    console.log(`Holdings: ${data.currentHoldings.length}`);
    console.log(`Metrics: ${data.metrics.length}`);
    console.log(`Dividends: ${data.dividends.length}`);

    if (data.currentHoldings.length > 0) {
        console.log("First Holding:", JSON.stringify(data.currentHoldings[0], null, 2));
    }

    // Check if Metrics have ROI
    if (data.metrics.length > 0) {
        console.log("Last Metric:", JSON.stringify(data.metrics[data.metrics.length - 1], null, 2));
        if (typeof data.metrics[0].roi !== 'number') {
            console.error("FAIL: Metric ROI is missing or not a number");
        } else {
            console.log("PASS: ROI is present.");
        }
    }
}

main().catch(console.error);
