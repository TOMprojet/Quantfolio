import fs from 'fs';
import path from 'path';
import { parsePortfolioPerformanceXml } from '../xml-pp';
import { UnifiedImporter, UnifiedTransaction, UnifiedResult } from './types';

export class PortfolioPerformanceImporter implements UnifiedImporter {
    async import(dataDirOrConfig: string | any): Promise<UnifiedResult> {
        const transactions: UnifiedTransaction[] = [];
        const symbols = new Set<string>();

        const integrations = (typeof dataDirOrConfig === 'object') ? dataDirOrConfig : null;
        const ppConfigs = integrations?.['portfolio performance'] || [];

        if (ppConfigs.length > 0) {
            console.log(`[PP-IMPORTER] Using ${ppConfigs.length} configured accounts from integrations.json`);
            for (const config of ppConfigs) {
                const filePath = path.join(process.cwd(), 'private', config.filename);
                if (!fs.existsSync(filePath)) continue;

                // 2. Read as buffer first to check for encoding if necessary, 
                // but for now let's use a more robust way to handle potential Latin1/ISO-8859-1
                const buffer = fs.readFileSync(filePath);
                let content = buffer.toString('utf8');
                
                // If it looks like it might be ISO-8859-1 (common in PP exports on Windows)
                // we can try to detect or just assume if utf8 looks broken.
                // For now, let's just sanitize the string if it has common corruption patterns
                // or use a simpler approach: check for <?xml ... encoding="ISO-8859-1"?>
                if (content.includes('encoding="ISO-8859-1"') || content.includes('encoding="windows-1252"')) {
                    content = buffer.toString('latin1');
                }

                const targetAccount = config.accountName;

                let parsed: UnifiedTransaction[] = [];
                if (content.trim().startsWith('<?xml') || content.trim().startsWith('<client')) {
                    const xmlTxs = parsePortfolioPerformanceXml(content);
                    parsed = xmlTxs.map(t => ({
                        ...t,
                        type: t.type as any,
                        source: 'PP',
                        date: t.date 
                    }));
                } else {
                    console.warn(`[PP-IMPORTER] Skipping non-XML file for ${targetAccount} (CSV support removed)`);
                    continue;
                }

                for (const t of parsed) {
                    if (!t.symbol && t.type !== 'DEPOSIT' && t.type !== 'WITHDRAWAL') continue; // Allow generic Cash

                    if (targetAccount) {
                        const accNameNormal = (t.account || '').toLowerCase();
                        const targetNormal = targetAccount.toLowerCase();

                        if (accNameNormal !== targetNormal) {
                            continue;
                        }
                    }

                    if (t.symbol) symbols.add(t.symbol);
                    transactions.push({
                        ...t,
                        source: targetAccount // Specific source tag for Master Store
                    });
                }
            }
        } else {
            // Legacy discovery
            const privateDir = path.join(process.cwd(), 'private');
            if (fs.existsSync(privateDir)) {
                const files = fs.readdirSync(privateDir).filter(f => f.startsWith('portfolio-performance-') && f.endsWith('.xml'));
                for (const file of files) {
                    const content = fs.readFileSync(path.join(privateDir, file), 'utf8');
                    let parsed = content.trim().startsWith('<?xml') ? parsePortfolioPerformanceXml(content) : [];
                    // ... (minimal legacy support if needed)
                    parsed.forEach(t => {
                        if (t.symbol) symbols.add(t.symbol);
                        transactions.push(t);
                    });
                }
            }
        }

        console.log(`[PP-IMPORTER] Total transactions: ${transactions.length}`);
        return { transactions, symbols: Array.from(symbols) };
    }
}
