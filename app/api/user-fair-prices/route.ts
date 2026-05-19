
import { NextResponse } from 'next/server';
import { SettingsStore } from '../../../lib/core/persistence/settings-store';

export async function GET() {
    const settings = SettingsStore.load();
    return NextResponse.json(settings.fairPrices || {});
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { symbol, price } = body;

        if (!symbol) {
            return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
        }

        const settings = SettingsStore.load();
        const prices = settings.fairPrices || {};

        if (price === 0 || price === undefined || price === null) {
            delete prices[symbol];
        } else {
            prices[symbol] = parseFloat(price);
        }

        SettingsStore.update({ fairPrices: prices });
        return NextResponse.json({ success: true, prices });
    } catch (e) {
        console.error("Error saving fair price:", e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
