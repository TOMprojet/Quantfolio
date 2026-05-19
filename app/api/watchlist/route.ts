
import { NextResponse } from 'next/server';
import { SettingsStore } from '../../../lib/core/persistence/settings-store';

export async function GET() {
    const settings = SettingsStore.load();
    return NextResponse.json(settings.watchlist || []);
}

export async function POST(req: Request) {
    try {
        const { symbol } = await req.json();
        if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

        const settings = SettingsStore.load();
        const list = settings.watchlist || [];
        if (!list.includes(symbol)) {
            list.push(symbol);
            SettingsStore.update({ watchlist: list });
        }
        return NextResponse.json({ success: true, watchlist: list });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to add' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { symbol } = await req.json();
        if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

        const settings = SettingsStore.load();
        let list = settings.watchlist || [];
        list = list.filter(s => s !== symbol);
        SettingsStore.update({ watchlist: list });
        
        return NextResponse.json({ success: true, watchlist: list });
    } catch (e) {
        return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
    }
}
