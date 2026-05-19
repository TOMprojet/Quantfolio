
import { NextResponse } from 'next/server';
import { searchYahoo } from '../../../lib/api/yahoo';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');

    if (!q || q.length < 2) {
        return NextResponse.json([]);
    }

    try {
        const results = await searchYahoo(q);
        return NextResponse.json(results);
    } catch (e: any) {
        console.error('API SEARCH ERROR:', e);
        return NextResponse.json({ error: 'Search failed', message: e.message }, { status: 500 });
    }
}
