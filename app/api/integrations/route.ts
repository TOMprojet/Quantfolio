import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PRIVATE_DIR = path.join(process.cwd(), 'private');
const FILE_PATH = path.join(PRIVATE_DIR, 'integrations.json');

// Interface for type safety
interface IntegrationData {
    [key: string]: any[]; // e.g., 'metamask': [{address: '...'}, {address: '...'}]
}

// GET: List all integrations (masked)
export async function GET() {
    try {
        if (!fs.existsSync(FILE_PATH)) {
            return NextResponse.json({ integrations: {} });
        }

        const raw = fs.readFileSync(FILE_PATH, 'utf8');
        let integrations: any = {};
        try {
            integrations = JSON.parse(raw);
        } catch (e) {
            integrations = {};
        }

        // Security: Mask sensitive data before sending to client
        const safeIntegrations: any = {};
        for (const [type, data] of Object.entries(integrations)) {
            // Handle legacy format (single object) vs new format (array)
            const accounts = Array.isArray(data) ? data : [data];

            safeIntegrations[type] = accounts.map((acc: any) => {
                if (!acc) return null;
                // simple masking strategy
                if (acc.apiKey) return { ...acc, apiKey: `${acc.apiKey.slice(0, 4)}...${acc.apiKey.slice(-4)}`, secretKey: '***', passphrase: '***' };
                if (acc.address) return acc; // Public key is safe
                return acc;
            }).filter(Boolean);
        }

        return NextResponse.json({ integrations: safeIntegrations });
    } catch (e) {
        console.error("GET Error", e);
        return NextResponse.json({ integrations: {} });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, data } = body; // type: 'bitget', 'metamask', etc.

        if (!fs.existsSync(PRIVATE_DIR)) {
            fs.mkdirSync(PRIVATE_DIR);
        }

        let integrations: IntegrationData = {};
        if (fs.existsSync(FILE_PATH)) {
            const raw = fs.readFileSync(FILE_PATH, 'utf8');
            try {
                const parsed = JSON.parse(raw);
                // Migration: If old format (object), convert to array
                for (const k in parsed) {
                    if (!Array.isArray(parsed[k])) {
                        integrations[k] = [parsed[k]];
                    } else {
                        integrations[k] = parsed[k];
                    }
                }
            } catch (e) {
                // corrupt file, start fresh
                integrations = {};
            }
        }

        // Initialize array if not exists
        if (!integrations[type]) {
            integrations[type] = [];
        }

        // Check for duplicates (simple check based on key field)
        const isDuplicate = integrations[type].some((existing: any) => {
            if (data.address && existing.address === data.address) return true;
            if (data.apiKey && existing.apiKey === data.apiKey) return true;
            return false;
        });

        if (isDuplicate) {
            throw new Error("Ce compte est déjà connecté.");
        }

        integrations[type].push(data);

        fs.writeFileSync(FILE_PATH, JSON.stringify(integrations, null, 2));

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("Error saving integration", e);
        return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Failed to save' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        const { type, index } = body;

        console.log(`[API] Deleting integration ${type} at index ${index}`);

        if (!fs.existsSync(FILE_PATH)) {
            return NextResponse.json({ success: false, error: 'No integrations found' }, { status: 404 });
        }

        const raw = fs.readFileSync(FILE_PATH, 'utf8');
        let integrations = JSON.parse(raw);

        if (integrations[type] && Array.isArray(integrations[type]) && integrations[type][index] !== undefined) {
            const item = integrations[type][index];
            const normalizedType = type.toLowerCase();

            // 1. DELETE FILES (Cleanup)
            if (item.isFile) {
                if (normalizedType.includes('interactive') || normalizedType === 'ibkr') {
                    const xmlPath = path.join(PRIVATE_DIR, 'ibkr-flex.xml');
                    const csvPath = path.join(PRIVATE_DIR, 'ibkr-data.csv');
                    if (fs.existsSync(xmlPath)) fs.unlinkSync(xmlPath);
                    if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
                } else if (normalizedType.includes('ledger')) {
                    const ledgerPath = path.join(PRIVATE_DIR, 'ledger-history.csv');
                    if (fs.existsSync(ledgerPath)) fs.unlinkSync(ledgerPath);
                }
            }

            // 2. DELETE FROM MASTER STORE (Data Cleanup)
            // We need to identify the "source" tag used in transactions
            try {
                const { MasterStore } = await import('@/lib/core/persistence/master-store');
                const { MasterAnalyzer } = await import('@/lib/finance/master-analyzer');

                let sourcePredicate: ((t: any) => boolean) | null = null;

                if (normalizedType === 'portfolio performance') {
                    // PP uses "PP: {AccountName}" or sometimes just "{AccountName}"
                    let targetAccount = item.accountName;
                    if (!targetAccount && item.name) {
                        targetAccount = item.name.replace('PP: ', '');
                    }
                    if (targetAccount) {
                        const lowTarget = targetAccount.toLowerCase();
                        // Match either exact name or with PP prefix
                        sourcePredicate = (t) => {
                            if (!t.source) return false;
                            const lowSource = t.source.toLowerCase();
                            return lowSource === lowTarget || lowSource === `pp: ${lowTarget}`;
                        };
                    }
                } else if (normalizedType === 'interactive brokers' || normalizedType === 'ibkr') {
                    // IBKR uses "IBKR"
                    sourcePredicate = (t) => t.source === 'IBKR';
                } else if (normalizedType.includes('ledger')) {
                    // Ledger uses "Ledger CSV"
                    sourcePredicate = (t) => t.source === 'Ledger CSV';
                } else if (normalizedType === 'bitget') {
                    // Bitget uses "Bitget Spot", "Bitget PnL (...)", "Bitget Futures (...)"
                    sourcePredicate = (t) => t.source && t.source.startsWith('Bitget ');
                }

                if (sourcePredicate) {
                    console.log(`[API] Purging transactions for integration ${type}...`);
                    const deletedCount = MasterStore.deleteTransactions(sourcePredicate);
                    console.log(`[API] Successfully deleted ${deletedCount} transactions for ${type}`);

                    // 3. TRIGGER RE-AGGREGATION
                    console.log(`[API] Triggering master re-computation...`);
                    await MasterAnalyzer.recomputeAndPersist({ useLivePrices: false });
                }
            } catch (err) {
                console.error("[API] Failed to cleanup master data, but persisting deletion config.", err);
            }

            // 4. REMOVE CONFIG ENTRY
            integrations[type].splice(index, 1);
            if (integrations[type].length === 0) {
                delete integrations[type];
            }

            fs.writeFileSync(FILE_PATH, JSON.stringify(integrations, null, 2));
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
        }

    } catch (e) {
        console.error("Delete Error", e);
        return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
    }
}
