import { NextResponse } from 'next/server';
import { MasterStore } from '../../../../lib/core/persistence/master-store';

export async function GET() {
    try {
        const master = MasterStore.load();
        const sources = Array.from(new Set(master.transactions.map(t => t.source).filter(Boolean)));
        return NextResponse.json({ sources });
    } catch (e) {
        return NextResponse.json({ sources: [] });
    }
}
