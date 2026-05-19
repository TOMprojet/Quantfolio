
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        // Save to public so data-fetching can read it easily? 
        // Data-fetching reads `path.join(process.cwd(), 'public', 'metamask.json')`.
        const filePath = path.join(process.cwd(), 'public', 'metamask.json');

        // Ensure public dir exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        fs.writeFileSync(filePath, buffer);

        // Update integrations.json
        const jsonPath = path.join(process.cwd(), 'private', 'integrations.json');
        let integrations: any = {};
        if (fs.existsSync(jsonPath)) {
            integrations = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        }

        // Add placeholder if needed
        // If metamask exists as array, append? Or just leave it?
        // Usually metamask is auto-detected via extension too.
        // But for "Import JSON", let's separate or reuse?
        // The modal likely lists "accounts".
        // Let's create a "JSON Import" entry.

        let mmAccounts = integrations.metamask || [];
        if (!Array.isArray(mmAccounts)) mmAccounts = [mmAccounts]; // Handle legacy single object

        // Check if JSON entry already exists
        const exists = mmAccounts.find((a: any) => a.isFile === true);
        if (!exists) {
            mmAccounts.push({
                name: 'MetaMask JSON',
                address: 'File Import',
                isFile: true
            });
            integrations.metamask = mmAccounts;
            fs.writeFileSync(jsonPath, JSON.stringify(integrations, null, 2));
        }

        return NextResponse.json({ success: true, path: filePath });
    } catch (e: any) {
        console.error('Upload Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
