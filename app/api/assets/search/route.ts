import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ results: [] });
    }

    try {
        const results: any = await yahooFinance.search(query);

        // Filter and map results to a clean format
        // prioritizing EQUITY and ETF, but keeping others if needed
        const mappedResults = results.quotes
            .filter((quote: any) => quote.isYahooFinance) // Basic filter
            .map((quote: any) => ({
                symbol: quote.symbol,
                name: quote.shortname || quote.longname || quote.symbol,
                exchange: quote.exchange,
                type: quote.quoteType
            }))
            .slice(0, 5); // Limit to 5 results

        return NextResponse.json({ results: mappedResults });
    } catch (error) {
        console.error('Yahoo Finance Search Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch search results' },
            { status: 500 }
        );
    }
}
