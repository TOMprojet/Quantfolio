async function main() {
    const res = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/NOV.DE?range=1y&interval=1d');
    const data = await res.json();
    const result = data.chart.result[0];
    const quotes = result.indicators.quote[0];
    const dates = result.timestamp;
    
    const mapped = dates.map((d, i) => {
        const dt = new Date(d * 1000);
        return { date: dt.toISOString(), close: quotes.close[i] };
    });
    
    const thisYear = mapped.filter(x => new Date(x.date).getFullYear() === 2026);
    const lastYear = mapped.filter(x => new Date(x.date).getFullYear() === 2025);
    
    console.log("Last 2025 point:", lastYear[lastYear.length - 1]);
    console.log("First 2026 point:", thisYear[0]);
    console.log("Last 2026 point:", thisYear[thisYear.length - 1]);
    
    const p0 = lastYear[lastYear.length - 1].close;
    const p1 = thisYear[thisYear.length - 1].close;
    console.log("YTD Performance:", ((p1 - p0) / p0 * 100).toFixed(2) + "%");
}

main().catch(console.error);
