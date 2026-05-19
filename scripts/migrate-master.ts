
import path from 'path';
import fs from 'fs';
import { MasterStore } from '../lib/core/persistence/master-store';
import { MasterAnalyzer } from '../lib/finance/master-analyzer';
import { IbkrImporter } from '../lib/importers/ibkr-importer';
import { PortfolioPerformanceImporter } from '../lib/importers/portfolio-performance-importer';
import { CryptoImporter } from '../lib/importers/crypto-importer';
import { BitgetImporter } from '../lib/importers/bitget-importer';
import { LedgerImporter } from '../lib/importers/ledger-importer';

async function migrate() {
    console.log("--- STARTING MIGRATION TO MASTER STORE ---");
    const dataDir = path.join(process.cwd(), 'data');

    // 1. Load Configs
    let integrations: any = {};
    try {
        const integrationsPath = path.join(process.cwd(), 'private', 'integrations.json');
        if (fs.existsSync(integrationsPath)) {
            integrations = JSON.parse(fs.readFileSync(integrationsPath, 'utf8'));
        }
    } catch (e) { }

    // 2. Run Importers
    console.log("Running Importers...");
    const ibkrImporter = new IbkrImporter();
    const cryptoImporter = new CryptoImporter();
    const bitgetImporter = new BitgetImporter();
    const ledgerImporter = new LedgerImporter();
    const ppImporter = new PortfolioPerformanceImporter();

    const [ibkrRes, ledgerRes, ppRes] = await Promise.all([
        ibkrImporter.import(dataDir),
        ledgerImporter.import(dataDir),
        ppImporter.import(integrations)
    ]);

    const [cryptoRes, bitgetRes] = await Promise.all([
        cryptoImporter.import(integrations),
        bitgetImporter.import(integrations)
    ]);

    const allTransactions = [
        ...ibkrRes.transactions,
        ...ledgerRes.transactions,
        ...ppRes.transactions,
        ...cryptoRes.transactions,
        ...bitgetRes.transactions
    ];

    console.log(`Extracted ${allTransactions.length} total transactions.`);

    // 3. Save to Master Store (Raw TXs)
    // We overwrite to ensure clean state from importers
    const currentMaster = MasterStore.load();

    // Deduplicate transactions
    const uniqueHelper = new Set<string>();
    const uniqueTransactions = allTransactions.filter(t => {
        // Create unique signature (ignore account/source which might vary due to import logic)
        const d = new Date(t.date).toISOString();
        const sig = `${d}|${t.amount}|${t.symbol}|${t.type}`;
        if (uniqueHelper.has(sig)) return false;
        uniqueHelper.add(sig);
        return true;
    });

    console.log(`Overwriting Master Store with ${uniqueTransactions.length} unique transactions (from ${allTransactions.length} raw).`);

    currentMaster.transactions = uniqueTransactions;

    MasterStore.save(currentMaster);

    // 4. Trigger Analysis
    console.log("Triggering Full Analysis...");
    await MasterAnalyzer.recomputeAndPersist();

    console.log("--- MIGRATION COMPLETE ---");
}

migrate().catch(console.error);
