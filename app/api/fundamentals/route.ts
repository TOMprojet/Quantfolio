import { NextRequest, NextResponse } from 'next/server';
import { getFMPFundamentals } from '../../../lib/api/fmp';
import { getYahooFundamentals } from '../../../lib/api/yahoo';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    try {
        // --- SOURCE SWITCH: YAHOO FINANCE (Primary for now) ---
        // We revert to Yahoo because FMP Free plan is too restricted for many tickers (e.g. MA, FICO)
        // However, we keep the FMP logic ready for future migration.
        
        /* 
        // FMP Logic (Commented for future use)
        const fmpData = await getFMPFundamentals(symbol);
        const data = {
            symbol: fmpData.symbol,
            longName: fmpData.profile?.companyName || symbol,
            shortName: fmpData.profile?.companyName || symbol,
            price: fmpData.profile?.price || 0,
            currency: fmpData.profile?.currency || 'USD',
            sector: fmpData.profile?.sector || 'N/A',
            industry: fmpData.profile?.industry || 'N/A',
            description: fmpData.profile?.description || '',
            marketCap: fmpData.profile?.mktCap ? fmpData.profile.mktCap.toLocaleString() + ' ' + fmpData.profile.currency : 'N/A',
            per: fmpData.metrics?.peRatio || 0,
            forwardPE: fmpData.metrics?.forwardPeRatio || fmpData.metrics?.peRatio || 0,
            divYield: (fmpData.metrics?.dividendYield || 0) * 100,
            dividendRate: fmpData.profile?.lastDiv || 0,
            eps: fmpData.metrics?.netIncomePerShare || 0,
            roe: (fmpData.metrics?.roe || 0) * 100,
            roic: (fmpData.metrics?.roic || 0) * 100,
            fcf: fmpData.metrics?.freeCashFlowPerShare || 0,
            employees: fmpData.profile?.fullTimeEmployees || '0',
            city: fmpData.profile?.city || '',
            country: fmpData.profile?.country || '',
            website: fmpData.profile?.website || '',
            history: fmpData.history || []
        };
        */

        const yahooData = await getYahooFundamentals(symbol);
        if (!yahooData) throw new Error(`No data found for ${symbol}`);

        const data = {
            ...yahooData,
            // Flag to indicate data source and restrictions
            source: 'yahoo',
            isFMPReady: false 
        };

        console.log(`API returning Yahoo data for ${symbol}:`, {
            name: data.longName,
            historyCount: data.history?.length || 0
        });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('API Fundamentals Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch fundamentals' },
            { status: 500 }
        );
    }
}
