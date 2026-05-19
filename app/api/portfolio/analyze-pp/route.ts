import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { analyzePpXml } from '../../../../lib/parsers/importers/pp-analyzer';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { fileName } = body;

        if (!fileName) {
            return NextResponse.json({ error: 'Missing fileName' }, { status: 400 });
        }

        const filePath = path.join(process.cwd(), 'private', fileName);
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found in private/' }, { status: 404 });
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const accounts = analyzePpXml(content);

        return NextResponse.json({ accounts });
    } catch (e: any) {
        console.error('[analyze-pp] Error:', e);
        return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
    }
}
