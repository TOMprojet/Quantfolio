import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { IbkrImporter } from '../../../../lib/parsers/importers/ibkr-importer';
import { PortfolioPerformanceImporter } from '../../../../lib/parsers/importers/portfolio-performance-importer';
import { MasterStore } from '../../../../lib/core/persistence/master-store';
import { MasterAnalyzer } from '../../../../lib/finance/master-analyzer';
import { BitgetFileImporter } from '../../../../lib/parsers/importers/bitget-file-importer';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const type = formData.get('type') as string;
        let normalizedType = type ? type.toLowerCase() : 'ledger';

        const buffer = Buffer.from(await file.arrayBuffer());

        let filename = 'ledger-history.csv';
        let key = normalizedType;
        let accountsToRegister: string[] = [];
        let isPp = false;

        if (normalizedType.includes('interactive')) {
            key = 'interactive brokers';
            filename = 'ibkr-flex.xml';
            if (file.name.endsWith('.csv')) filename = 'ibkr-data.csv';
            // Default IBKR
            accountsToRegister.push('DEFAULT');
        } else if (normalizedType.includes('portfolio')) {
            key = 'portfolio performance';
            isPp = true;

            // Check for multiple selected accounts
            const selectedAccountsJson = formData.get('selectedAccounts') as string;

            if (selectedAccountsJson) {
                try {
                    accountsToRegister = JSON.parse(selectedAccountsJson);
                } catch (e) {
                    console.error("Failed to parse selectedAccounts", e);
                    // Fallback to single account if present
                    const singleAcc = formData.get('selectedAccount');
                    if (singleAcc) accountsToRegister.push(singleAcc as string);
                }
            } else {
                // Fallback legacy
                const accName = formData.get('selectedAccount') || formData.get('accountType') || 'DEFAULT';
                accountsToRegister.push(accName as string);
            }

            if (file.name.endsWith('.xml')) {
                filename = `portfolio-performance-source.xml`;
            } else {
                const firstAcc = accountsToRegister[0] || 'unknown';
                filename = `portfolio-performance-${firstAcc.toString().replace(/[^a-z0-9]/gi, '_')}.csv`;
            }
        } else if (normalizedType === 'bitget') {
            key = 'bitget';
            filename = 'bitget-import.csv';
            accountsToRegister.push('Bitget File Import');
        }

        const filePath = path.join(process.cwd(), 'private', filename);
        const dir = path.dirname(filePath);

        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // Save the file ONCE
        fs.writeFileSync(filePath, buffer);

        // PERSISTENCE LOGIC
        const isAnalysisOnly = formData.get('accountType') === 'TEMP_ANALYSIS';
        const integrationsPath = path.join(process.cwd(), 'private', 'integrations.json');
        let integrations: any = {};
        if (fs.existsSync(integrationsPath)) {
            integrations = JSON.parse(fs.readFileSync(integrationsPath, 'utf8'));
        }

        if (!isAnalysisOnly) {

            if (!integrations[key]) integrations[key] = [];

            if (key === 'portfolio performance') {
                // Register each account
                for (const accName of accountsToRegister) {
                    // Remove existing entry for this specific account if it exists
                    integrations[key] = (integrations[key] || []).filter((i: any) => i.accountName !== accName);

                    integrations[key].push({
                        name: accName,
                        accountName: accName,
                        filename: filename, // All point to the same file
                        isFile: true,
                        date: new Date().toISOString()
                    });
                }
            } else {
                // For IBKR or Bitget or Ledger
                if ((integrations[key] || []).length === 0) {
                    // Generic
                    integrations[key] = [{
                        name: key === 'interactive brokers' ? 'IBKR Import' : (key === 'bitget' ? 'Bitget Import' : 'Ledger Import'),
                        address: key === 'interactive brokers' ? 'CSV Import' : (key === 'bitget' ? 'CSV Import' : 'CSV Import'),
                        isFile: true
                    }];
                }
            }

            fs.writeFileSync(integrationsPath, JSON.stringify(integrations, null, 2));

            // --- MASTER PIPELINE ---
            // Trigger Compute on Import
            console.log(`[UPLOAD] Starting Master Pipeline for ${key}...`);

            try {
                if (key === 'interactive brokers') {
                    const importer = new IbkrImporter();
                    // IBKR importer reads from fs but we know where it is. 
                    // It has fallback logic. Let's ensure it reads THIS file?
                    // The importer looks in private/ibkr-flex.xml automatically.
                    const result = await importer.import(process.cwd());
                    MasterStore.updateTransactionsForSource('IBKR', result.transactions);
                }
                else if (key === 'portfolio performance') {
                    const importer = new PortfolioPerformanceImporter();
                    // The importer takes the FULL integrations config object
                    // We can pass the updated integrations object
                    const result = await importer.import(integrations);

                    // The result contains ALL transactions for enabled accounts.
                    // We should merge them carefully.
                    // Actually, PP importer returns { transactions } which has 'source' tags like "PP: Espèces PEA".
                    // MasterStore updates by Source String. 
                    // If we pass the full result, we need to iterate sources?
                    // MasterStore.updateTransactionsForSource takes A source name.
                    // Maybe we need a bulk update? Or iterate unique sources in result.

                    const uniqueSources = [...new Set(result.transactions.map(t => t.source))];
                    for (const src of uniqueSources) {
                        const txs = result.transactions.filter(t => t.source === src);
                        MasterStore.updateTransactionsForSource(src, txs);
                    }
                } else if (key === 'bitget') {
                    const importer = new BitgetFileImporter();
                    // Read buffer again or handle path? Importer takes buffer
                    const fileBuf = fs.readFileSync(filePath);
                    const result = await importer.import(fileBuf, filename);

                    // Helper: Delete old Bitget File transactions if any?
                    // MasterStore updateTransactionsForSource replaces content for a specific source string.
                    // Our importer returns source='Bitget File' or 'Bitget PDF'.

                    const uniqueSources = [...new Set(result.transactions.map(t => t.source))];
                    for (const src of uniqueSources) {
                        const txs = result.transactions.filter(t => t.source === src);
                        MasterStore.updateTransactionsForSource(src, txs);
                    }
                } else if (key === 'ledger') {
                    const { LedgerImporter } = await import('../../../../lib/parsers/importers/ledger-importer');
                    const importer = new LedgerImporter();
                    const result = await importer.import(path.join(process.cwd(), 'data'));
                    
                    // Ledger uses 'Ledger CSV' as source
                    MasterStore.updateTransactionsForSource('Ledger CSV', result.transactions);
                }

                // RECOMPUTE EVERYTHING
                await MasterAnalyzer.recomputeAndPersist();

            } catch (err) {
                console.error("[UPLOAD] Pipeline failed:", err);
                // Don't fail the request, but log it.
            }
        }

        return NextResponse.json({ success: true, path: filePath });
    } catch (e: any) {
        console.error('Upload Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
