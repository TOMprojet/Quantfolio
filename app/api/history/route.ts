
import { NextRequest, NextResponse } from 'next/server';
import { getYahooHistoricalPrices } from '../../../lib/api/yahoo';
import { subYears } from 'date-fns';

export async function GET(req: NextRequest) {
    const symbol = req.nextUrl.searchParams.get('symbol');
    if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

    try {
        const endDate = new Date();
        const startDate = subYears(endDate, 10); // Fetch 10 years to be safe for all timeframes
        const history = await getYahooHistoricalPrices(symbol, startDate, endDate);
        return NextResponse.json(history);
    } catch (e) {
        console.error('History API Error:', e);
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
    }
}
