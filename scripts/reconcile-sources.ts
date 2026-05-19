
import fs from 'fs';
import path from 'path';
import { MasterStore } from '../lib/core/persistence/master-store';
import { MasterAnalyzer } from '../lib/finance/master-analyzer';

async function reconcile() {
    console.log('[RECONCILE] Starting source reconciliation...');

    // 1. Load Integrations (The Source of Truth for "What should exist")
    const integrationsPath = path.join(process.cwd(), 'private', 'integrations.json');
    if (!fs.existsSync(integrationsPath)) {
        console.error('[RECONCILE] No integrations.json found. Aborting to avoid deleting everything.');
        return;
    }

    const integrations = JSON.parse(fs.readFileSync(integrationsPath, 'utf8'));
    const validSources = new Set<string>();

    // Add Built-in / Fallbacks
    validSources.add('IBKR');
    // validSources.add('Ledger CSV'); // If user has Ledger

    // Scan Config
    // PP
    if (integrations['portfolio performance']) {
        integrations['portfolio performance'].forEach((acc: any) => {
            if (acc.name) validSources.add(acc.name); // "PP: PEA"
        });
    }

    // Ledger
    if (integrations['ledger']) {
        // usually source is "Ledger CSV" but let's check config names if we made them dynamic
        // Currently Ledger import hardcodes "Ledger CSV" in importer types, 
        // but let's assume "Ledger CSV" is always valid if the integration exists.
        validSources.add('Ledger CSV');
    }

    // IBKR
    if (integrations['interactive brokers']) {
        validSources.add('IBKR');
    }

    // Bitget
    if (integrations['bitget']) {
        // Bitget typically uses "Bitget Spot" or "Bitget Futures (XX)"
        // We might need to be more permissive with Bitget or hardcode it if it's API based
        // For now, let's assume Bitget is managed by API sync which updates MasterStore using "Bitget ..." sources.
        // If verify check fails, we might delete Bitget data? 
        // Let's protect Bitget for now by fetching known sources from master and filtering only "PP: " ones?
        // User issue is specific to PP.
    }

    console.log('[RECONCILE] Valid Sources from Config:', Array.from(validSources));

    // 2. Load Master
    const master = MasterStore.load();
    const allSources = new Set(master.transactions.map(t => t.source));
    console.log('[RECONCILE] Found Sources in Data:', Array.from(allSources));

    // 3. Identify Orphans (PP and Bitget)
    const orphans = Array.from(allSources).filter(src => {
        if (!src) return false;

        if (src.startsWith('PP: ')) {
            return !validSources.has(src);
        }

        if (src.startsWith('Bitget ')) {
            // Bitget logic: If we have NO Bitget config, then ALL Bitget sources are orphans.
            // If we have Bitget config, we assume the API sync keeps them fresh, but here we can be aggressive:
            // The user wants to delete. If validSources has 'Bitget Spot' (unlikely, we used generic keys? no my script didn't add Bitget keys properly).

            // Re-read validSources logic above:
            // if (integrations['bitget']) { ... } 

            // If integrations['bitget'] is empty or undefined, validSources won't have any Bitget keys.
            // So !validSources.has(src) will be true.
            // This is correct for full deletion.

            // WARNING: Bitget sources in Master are "Bitget Futures (USDT-FUTURES)" etc.
            // But we didn't populate validSources with these specific names in step 1.
            // We need to ensuring validSources has "Bitget Futures (USDT-FUTURES)" if config exists.

            // Actually, let's just check if ANY Bitget integration exists. 
            // If integrations.bitget is empty/missing, then ALL "Bitget *" sources are orphans.
            if (!integrations['bitget'] || integrations['bitget'].length === 0) {
                return true;
            }
            // If there ARE Bitget accounts, we shouldn't delete existing data blindly here, 
            // unless we can map specific accounts to specific sources.
            // But currently Bitget importer doesn't distinguish by account name in source string (it uses product type).
            // So if user has 2 Bitget accounts, they share "Bitget Futures (USDT-FUTURES)". 
            // Removing 1 account shouldn't delete the data if another account remains?
            // Actually the current Bitget importer implementation aggregates ALL accounts into the same source strings?
            // Let's check importer... yes: `source: 'Bitget PnL (${pType})'`
            // It aggregates. So we can only delete data if ALL Bitget accounts are removed.

            return false;
        }

        return false;
    });

    if (orphans.length === 0) {
        console.log('[RECONCILE] No orphaned PP sources found. Everything looks consistent.');
        return;
    }

    console.log('[RECONCILE] Found orphaned PP sources to delete:', orphans);

    // 4. Delete
    MasterStore.deleteTransactions(t => orphans.includes(t.source));

    // 5. Recompute
    console.log('[RECONCILE] Recomputing portfolio...');
    await MasterAnalyzer.recomputeAndPersist({ useLivePrices: false });

    console.log('[RECONCILE] Done.');
}

reconcile().catch(console.error);
